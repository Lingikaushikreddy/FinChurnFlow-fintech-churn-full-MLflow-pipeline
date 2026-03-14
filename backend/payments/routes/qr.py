"""QR code generation and management routes."""

import base64
from io import BytesIO
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
import qrcode
from qrcode.image.pure import PyPNGImage
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant, QRCode
from shared.schemas.payment import QRCodeCreate, QRCodeResponse

router = APIRouter()


def generate_upi_qr_data(
    upi_id: str,
    merchant_name: str,
    amount: Optional[float] = None,
    description: Optional[str] = None,
) -> str:
    """Generate UPI deep link for QR code."""
    # UPI deep link format
    data = f"upi://pay?pa={upi_id}&pn={merchant_name}"

    if amount:
        data += f"&am={amount}"

    if description:
        # URL encode the description
        encoded_desc = description.replace(" ", "%20")
        data += f"&tn={encoded_desc}"

    data += "&cu=INR"
    return data


def generate_qr_image_base64(data: str) -> str:
    """Generate QR code image and return as base64."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return base64.b64encode(buffer.read()).decode("utf-8")


@router.post("/create", response_model=QRCodeResponse)
async def create_qr_code(
    request: QRCodeCreate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Create a new QR code for the merchant."""
    merchant = await get_merchant_from_token(authorization, db)

    if not merchant.upi_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set your UPI ID in profile settings first",
        )

    # Generate UPI QR data
    qr_data = generate_upi_qr_data(
        upi_id=merchant.upi_id,
        merchant_name=merchant.business_name or merchant.name or "Merchant",
        amount=float(request.amount) if request.amount else None,
        description=request.description,
    )

    # Generate QR image
    qr_image_base64 = generate_qr_image_base64(qr_data)

    # Save QR code record
    qr_code = QRCode(
        merchant_id=merchant.id,
        upi_id=merchant.upi_id,
        amount=request.amount,
        description=request.description,
        qr_data=qr_data,
        is_dynamic=request.is_dynamic,
    )
    db.add(qr_code)
    await db.flush()

    response = QRCodeResponse.model_validate(qr_code)
    response.qr_image_base64 = qr_image_base64

    return response


@router.get("/", response_model=List[QRCodeResponse])
async def list_qr_codes(
    authorization: str = Header(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all QR codes for the merchant."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(QRCode)
        .where(QRCode.merchant_id == merchant.id)
        .order_by(QRCode.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    qr_codes = result.scalars().all()

    responses = []
    for qr in qr_codes:
        response = QRCodeResponse.model_validate(qr)
        response.qr_image_base64 = generate_qr_image_base64(qr.qr_data)
        responses.append(response)

    return responses


@router.get("/{qr_id}", response_model=QRCodeResponse)
async def get_qr_code(
    qr_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific QR code."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(QRCode).where(
            and_(
                QRCode.id == qr_id,
                QRCode.merchant_id == merchant.id,
            )
        )
    )
    qr_code = result.scalars().first()

    if not qr_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found",
        )

    # Increment scan count (for tracking)
    qr_code.scan_count += 1
    await db.flush()

    response = QRCodeResponse.model_validate(qr_code)
    response.qr_image_base64 = generate_qr_image_base64(qr_code.qr_data)

    return response


@router.delete("/{qr_id}")
async def delete_qr_code(
    qr_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Delete a QR code."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(QRCode).where(
            and_(
                QRCode.id == qr_id,
                QRCode.merchant_id == merchant.id,
            )
        )
    )
    qr_code = result.scalars().first()

    if not qr_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found",
        )

    await db.delete(qr_code)

    return {"message": "QR code deleted successfully"}


@router.get("/static/default", response_model=QRCodeResponse)
async def get_default_qr(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get the default static QR code for the merchant."""
    merchant = await get_merchant_from_token(authorization, db)

    if not merchant.upi_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set your UPI ID in profile settings first",
        )

    # Generate default QR without amount
    qr_data = generate_upi_qr_data(
        upi_id=merchant.upi_id,
        merchant_name=merchant.business_name or merchant.name or "Merchant",
    )

    qr_image_base64 = generate_qr_image_base64(qr_data)

    return QRCodeResponse(
        id=UUID("00000000-0000-0000-0000-000000000000"),  # Placeholder ID
        merchant_id=merchant.id,
        upi_id=merchant.upi_id,
        qr_data=qr_data,
        qr_image_base64=qr_image_base64,
        is_dynamic=False,
        scan_count=0,
        created_at=merchant.created_at,
    )
