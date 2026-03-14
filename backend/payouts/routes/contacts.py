"""Contact/beneficiary management routes."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy import select, and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant, Contact
from shared.schemas.contact import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactListResponse,
)

router = APIRouter()


@router.post("/", response_model=ContactResponse)
async def create_contact(
    request: ContactCreate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Create a new contact/beneficiary."""
    merchant = await get_merchant_from_token(authorization, db)

    # Check for duplicate (same UPI or phone for this merchant)
    existing_query = select(Contact).where(Contact.merchant_id == merchant.id)

    conditions = []
    if request.upi_id:
        conditions.append(Contact.upi_id == request.upi_id)
    if request.phone:
        conditions.append(Contact.phone == request.phone)
    if request.bank_account:
        conditions.append(Contact.bank_account == request.bank_account)

    if conditions:
        existing_query = existing_query.where(or_(*conditions))
        result = await db.execute(existing_query)
        existing = result.scalars().first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contact with this UPI ID, phone, or bank account already exists",
            )

    # Create contact
    contact = Contact(
        merchant_id=merchant.id,
        name=request.name,
        phone=request.phone,
        upi_id=request.upi_id,
        bank_account=request.bank_account,
        ifsc=request.ifsc,
    )
    db.add(contact)
    await db.flush()

    return ContactResponse.model_validate(contact)


@router.get("/", response_model=ContactListResponse)
async def list_contacts(
    authorization: str = Header(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, min_length=1),
    db: AsyncSession = Depends(get_db),
):
    """List all contacts for the merchant."""
    merchant = await get_merchant_from_token(authorization, db)

    # Build query
    query = select(Contact).where(Contact.merchant_id == merchant.id)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Contact.name.ilike(search_term),
                Contact.phone.ilike(search_term),
                Contact.upi_id.ilike(search_term),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Contact.name).offset(offset).limit(page_size)

    result = await db.execute(query)
    contacts = result.scalars().all()

    return ContactListResponse(
        items=[ContactResponse.model_validate(c) for c in contacts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific contact."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.id == contact_id,
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

    return ContactResponse.model_validate(contact)


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: UUID,
    request: ContactUpdate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Update a contact."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.id == contact_id,
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

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)

    await db.flush()

    return ContactResponse.model_validate(contact)


@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Delete a contact."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Contact).where(
            and_(
                Contact.id == contact_id,
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

    await db.delete(contact)

    return {"message": "Contact deleted successfully"}


@router.get("/recent/used", response_model=List[ContactResponse])
async def get_recent_contacts(
    authorization: str = Header(...),
    limit: int = Query(5, ge=1, le=10),
    db: AsyncSession = Depends(get_db),
):
    """Get recently used contacts (based on recent payouts)."""
    merchant = await get_merchant_from_token(authorization, db)

    # Get contacts that have been used in recent transactions
    from shared.database import Transaction

    result = await db.execute(
        select(Contact)
        .join(Transaction, Contact.upi_id == Transaction.counterparty_upi)
        .where(
            and_(
                Contact.merchant_id == merchant.id,
                Transaction.merchant_id == merchant.id,
                Transaction.type == "payout",
            )
        )
        .order_by(Transaction.created_at.desc())
        .distinct()
        .limit(limit)
    )
    contacts = result.scalars().all()

    return [ContactResponse.model_validate(c) for c in contacts]
