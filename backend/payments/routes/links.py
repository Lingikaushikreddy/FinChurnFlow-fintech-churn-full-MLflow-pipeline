"""Payment link management routes."""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant, PaymentLink
from shared.schemas.payment import (
    PaymentLinkCreate,
    PaymentLinkUpdate,
    PaymentLinkResponse,
    PaymentLinkListResponse,
    PaymentLinkPublic,
)
from shared.utils.helpers import generate_short_code

router = APIRouter()


@router.post("/create", response_model=PaymentLinkResponse)
async def create_payment_link(
    request: PaymentLinkCreate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Create a new payment link."""
    merchant = await get_merchant_from_token(authorization, db)

    if not merchant.upi_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please set your UPI ID in profile settings first",
        )

    # Generate unique short code
    short_code = generate_short_code(8)

    # Check for collision (rare but possible)
    existing = await db.execute(
        select(PaymentLink).where(PaymentLink.short_code == short_code)
    )
    while existing.scalars().first():
        short_code = generate_short_code(8)
        existing = await db.execute(
            select(PaymentLink).where(PaymentLink.short_code == short_code)
        )

    # Build short URL
    short_url = f"{settings.payment_link_base_url}/{short_code}"

    # Calculate expiry
    expires_at = None
    if request.expires_in_hours:
        expires_at = datetime.utcnow() + timedelta(hours=request.expires_in_hours)

    # Create payment link
    payment_link = PaymentLink(
        merchant_id=merchant.id,
        amount=request.amount,
        description=request.description,
        short_code=short_code,
        short_url=short_url,
        expires_at=expires_at,
    )
    db.add(payment_link)
    await db.flush()

    return PaymentLinkResponse.model_validate(payment_link)


@router.get("/", response_model=PaymentLinkListResponse)
async def list_payment_links(
    authorization: str = Header(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    """List all payment links for the merchant."""
    merchant = await get_merchant_from_token(authorization, db)

    # Build query
    query = select(PaymentLink).where(PaymentLink.merchant_id == merchant.id)

    if status_filter:
        query = query.where(PaymentLink.status == status_filter)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(PaymentLink.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    links = result.scalars().all()

    return PaymentLinkListResponse(
        items=[PaymentLinkResponse.model_validate(link) for link in links],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{link_id}", response_model=PaymentLinkResponse)
async def get_payment_link(
    link_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific payment link."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(PaymentLink).where(
            and_(
                PaymentLink.id == link_id,
                PaymentLink.merchant_id == merchant.id,
            )
        )
    )
    link = result.scalars().first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment link not found",
        )

    return PaymentLinkResponse.model_validate(link)


@router.put("/{link_id}", response_model=PaymentLinkResponse)
async def update_payment_link(
    link_id: UUID,
    request: PaymentLinkUpdate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Update a payment link."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(PaymentLink).where(
            and_(
                PaymentLink.id == link_id,
                PaymentLink.merchant_id == merchant.id,
            )
        )
    )
    link = result.scalars().first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment link not found",
        )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(link, field, value)

    await db.flush()

    return PaymentLinkResponse.model_validate(link)


@router.delete("/{link_id}")
async def delete_payment_link(
    link_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Delete/disable a payment link."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(PaymentLink).where(
            and_(
                PaymentLink.id == link_id,
                PaymentLink.merchant_id == merchant.id,
            )
        )
    )
    link = result.scalars().first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment link not found",
        )

    # Soft delete - disable the link
    link.status = "disabled"

    return {"message": "Payment link disabled successfully"}


# Public endpoints (no auth required)
@router.get("/public/{short_code}", response_model=PaymentLinkPublic)
async def get_public_payment_link(
    short_code: str,
    db: AsyncSession = Depends(get_db),
):
    """Get public payment link details for customers."""
    result = await db.execute(
        select(PaymentLink, Merchant)
        .join(Merchant, PaymentLink.merchant_id == Merchant.id)
        .where(PaymentLink.short_code == short_code)
    )
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment link not found",
        )

    link, merchant = row

    # Check if link is active
    if link.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment link is no longer active",
        )

    # Check if link is expired
    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment link has expired",
        )

    return PaymentLinkPublic(
        merchant_name=merchant.name or "Merchant",
        business_name=merchant.business_name,
        amount=link.amount,
        description=link.description,
        upi_id=merchant.upi_id,
        status=link.status,
    )
