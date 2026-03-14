"""Transfer/payout routes."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant, Transaction, Contact
from shared.schemas.transaction import TransactionResponse
from shared.utils.helpers import generate_reference_id

from ..services.mock_payout import MockPayoutService, get_mock_payout_service

router = APIRouter()


class TransferRequest(BaseModel):
    """Request to initiate a transfer."""
    contact_id: Optional[UUID] = None
    upi_id: Optional[str] = None
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    description: Optional[str] = Field(None, max_length=200)
    pin: str = Field(..., min_length=4, max_length=6)


class BulkTransferItem(BaseModel):
    """Single item in bulk transfer."""
    contact_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    description: Optional[str] = None


class BulkTransferRequest(BaseModel):
    """Request for bulk transfer."""
    items: List[BulkTransferItem]
    pin: str = Field(..., min_length=4, max_length=6)


class TransferResponse(BaseModel):
    """Transfer response."""
    transaction_id: UUID
    reference_id: str
    amount: Decimal
    status: str
    recipient_name: str
    recipient_upi: Optional[str] = None
    created_at: datetime


class BulkTransferResponse(BaseModel):
    """Bulk transfer response."""
    total_amount: Decimal
    successful: int
    failed: int
    transfers: List[TransferResponse]


async def verify_merchant_pin(merchant: Merchant, pin: str):
    """Verify merchant's transaction PIN."""
    from shared.utils.security import verify_password

    if not merchant.pin_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set a transaction PIN first",
        )

    if not verify_password(pin, merchant.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN",
        )


@router.post("/transfer", response_model=TransferResponse)
async def initiate_transfer(
    request: TransferRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
    payout_service: MockPayoutService = Depends(get_mock_payout_service),
):
    """Initiate a money transfer to a contact or UPI ID."""
    merchant = await get_merchant_from_token(authorization, db)

    # Verify PIN
    await verify_merchant_pin(merchant, request.pin)

    # Get recipient details
    recipient_name = "Unknown"
    recipient_upi = None
    recipient_phone = None

    if request.contact_id:
        # Transfer to saved contact
        result = await db.execute(
            select(Contact).where(
                and_(
                    Contact.id == request.contact_id,
                    Contact.merchant_id == merchant.id,
                )
            )
        )
        contact = result.scalars().first()

        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found",
            )

        recipient_name = contact.name
        recipient_upi = contact.upi_id
        recipient_phone = contact.phone

        if not recipient_upi and not contact.bank_account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contact has no UPI ID or bank account",
            )

    elif request.upi_id:
        # Direct transfer to UPI ID
        recipient_upi = request.upi_id
        recipient_name = "UPI Transfer"

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either contact_id or upi_id is required",
        )

    # Generate reference ID
    reference_id = generate_reference_id("pay")

    # Process transfer via mock payout service
    payout_result = await payout_service.create_payout(
        account_number=recipient_upi or "N/A",
        amount=int(request.amount * 100),  # Convert to paise
        mode="UPI" if recipient_upi else "IMPS",
        purpose="payout",
        reference_id=reference_id,
    )

    # Create transaction record
    transaction = Transaction(
        merchant_id=merchant.id,
        type="payout",
        amount=request.amount,
        status=payout_result["status"],
        reference_id=reference_id,
        counterparty_name=recipient_name,
        counterparty_upi=recipient_upi,
        counterparty_phone=recipient_phone,
        description=request.description,
        metadata={
            "payout_id": payout_result["id"],
            "mode": payout_result["mode"],
        },
    )
    db.add(transaction)
    await db.flush()

    return TransferResponse(
        transaction_id=transaction.id,
        reference_id=reference_id,
        amount=request.amount,
        status=transaction.status,
        recipient_name=recipient_name,
        recipient_upi=recipient_upi,
        created_at=transaction.created_at,
    )


@router.post("/bulk", response_model=BulkTransferResponse)
async def bulk_transfer(
    request: BulkTransferRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
    payout_service: MockPayoutService = Depends(get_mock_payout_service),
):
    """Process bulk transfers to multiple contacts."""
    merchant = await get_merchant_from_token(authorization, db)

    # Verify PIN
    await verify_merchant_pin(merchant, request.pin)

    # Get all contacts
    contact_ids = [item.contact_id for item in request.items]
    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.id.in_(contact_ids),
                Contact.merchant_id == merchant.id,
            )
        )
    )
    contacts = {c.id: c for c in result.scalars().all()}

    transfers = []
    successful = 0
    failed = 0
    total_amount = Decimal("0.00")

    for item in request.items:
        contact = contacts.get(item.contact_id)

        if not contact:
            failed += 1
            continue

        if not contact.upi_id and not contact.bank_account:
            failed += 1
            continue

        # Generate reference ID
        reference_id = generate_reference_id("pay")

        try:
            # Process transfer
            payout_result = await payout_service.create_payout(
                account_number=contact.upi_id or contact.bank_account,
                amount=int(item.amount * 100),
                mode="UPI" if contact.upi_id else "IMPS",
                purpose="payout",
                reference_id=reference_id,
            )

            # Create transaction
            transaction = Transaction(
                merchant_id=merchant.id,
                type="payout",
                amount=item.amount,
                status=payout_result["status"],
                reference_id=reference_id,
                counterparty_name=contact.name,
                counterparty_upi=contact.upi_id,
                counterparty_phone=contact.phone,
                description=item.description,
                metadata={
                    "payout_id": payout_result["id"],
                    "bulk_transfer": True,
                },
            )
            db.add(transaction)
            await db.flush()

            transfers.append(TransferResponse(
                transaction_id=transaction.id,
                reference_id=reference_id,
                amount=item.amount,
                status=transaction.status,
                recipient_name=contact.name,
                recipient_upi=contact.upi_id,
                created_at=transaction.created_at,
            ))

            successful += 1
            total_amount += item.amount

        except Exception:
            failed += 1

    return BulkTransferResponse(
        total_amount=total_amount,
        successful=successful,
        failed=failed,
        transfers=transfers,
    )


@router.get("/transfer/{transaction_id}", response_model=TransactionResponse)
async def get_transfer_status(
    transaction_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get transfer status."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.id == transaction_id,
                Transaction.merchant_id == merchant.id,
                Transaction.type == "payout",
            )
        )
    )
    transaction = result.scalars().first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found",
        )

    return TransactionResponse.model_validate(transaction)


@router.get("/history", response_model=List[TransactionResponse])
async def get_transfer_history(
    authorization: str = Header(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Get payout/transfer history."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Transaction)
        .where(
            and_(
                Transaction.merchant_id == merchant.id,
                Transaction.type == "payout",
            )
        )
        .order_by(Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    transactions = result.scalars().all()

    return [TransactionResponse.model_validate(t) for t in transactions]
