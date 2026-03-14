"""Khaata (credit ledger) routes for managing customer credit/debit entries."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header, Query, status
from sqlalchemy import select, and_, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant, CreditEntry
from shared.schemas.credit import (
    CreditEntryCreate,
    CreditEntryResponse,
    CreditEntryListResponse,
    CustomerLedgerSummary,
    KhaataOverview,
)

router = APIRouter()


@router.post("/entries", response_model=CreditEntryResponse, status_code=201)
async def create_credit_entry(
    entry_data: CreditEntryCreate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Create a new credit/debit entry in the khaata."""
    merchant = await get_merchant_from_token(authorization, db)

    entry = CreditEntry(
        merchant_id=merchant.id,
        customer_name=entry_data.customer_name,
        customer_phone=entry_data.customer_phone,
        amount=entry_data.amount,
        direction=entry_data.direction,
        description=entry_data.description,
        item=entry_data.item,
        source=entry_data.source,
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)

    return entry


@router.get("/entries", response_model=CreditEntryListResponse)
async def list_credit_entries(
    customer_name: Optional[str] = Query(None, description="Filter by customer name"),
    settled: Optional[bool] = Query(None, description="Filter by settled status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """List credit entries with optional filters."""
    merchant = await get_merchant_from_token(authorization, db)

    conditions = [CreditEntry.merchant_id == merchant.id]

    if customer_name:
        conditions.append(
            sa_func.lower(CreditEntry.customer_name).contains(customer_name.lower())
        )
    if settled is not None:
        conditions.append(CreditEntry.is_settled == settled)

    # Count total
    count_query = select(sa_func.count(CreditEntry.id)).where(and_(*conditions))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch entries
    query = (
        select(CreditEntry)
        .where(and_(*conditions))
        .order_by(CreditEntry.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    entries = result.scalars().all()

    return CreditEntryListResponse(
        entries=entries,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/entries/{entry_id}/settle", response_model=CreditEntryResponse)
async def settle_credit_entry(
    entry_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Mark a credit entry as settled."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(CreditEntry).where(
            and_(
                CreditEntry.id == entry_id,
                CreditEntry.merchant_id == merchant.id,
            )
        )
    )
    entry = result.scalars().first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found",
        )

    if entry.is_settled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entry is already settled",
        )

    entry.is_settled = True
    entry.settled_at = datetime.utcnow()
    await db.flush()
    await db.refresh(entry)

    return entry


@router.get("/overview", response_model=KhaataOverview)
async def get_khaata_overview(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get overall khaata summary with per-customer breakdown."""
    merchant = await get_merchant_from_token(authorization, db)

    # Fetch all unsettled entries grouped by customer
    result = await db.execute(
        select(CreditEntry)
        .where(
            and_(
                CreditEntry.merchant_id == merchant.id,
                CreditEntry.is_settled == False,
            )
        )
        .order_by(CreditEntry.customer_name, CreditEntry.created_at.desc())
    )
    entries = result.scalars().all()

    # Build per-customer summaries
    customer_map: dict[str, CustomerLedgerSummary] = {}

    for entry in entries:
        name = entry.customer_name
        if name not in customer_map:
            customer_map[name] = CustomerLedgerSummary(
                customer_name=name,
                customer_phone=entry.customer_phone,
            )
        summary = customer_map[name]

        if entry.direction == "debit":
            summary.total_debit += entry.amount
        else:
            summary.total_credit += entry.amount

        summary.entry_count += 1
        if not entry.is_settled:
            summary.unsettled_count += 1
        if summary.last_entry_at is None or entry.created_at > summary.last_entry_at:
            summary.last_entry_at = entry.created_at
        # Update phone if available
        if entry.customer_phone and not summary.customer_phone:
            summary.customer_phone = entry.customer_phone

    # Calculate net balances
    for summary in customer_map.values():
        summary.net_balance = summary.total_debit - summary.total_credit

    customers = sorted(customer_map.values(), key=lambda c: c.net_balance, reverse=True)
    total_outstanding = sum(c.net_balance for c in customers if c.net_balance > 0)
    customers_with_dues = sum(1 for c in customers if c.net_balance > 0)

    return KhaataOverview(
        total_outstanding=total_outstanding,
        total_customers=len(customers),
        customers_with_dues=customers_with_dues,
        customers=customers,
    )


@router.get("/customer/{name}", response_model=CreditEntryListResponse)
async def get_customer_ledger(
    name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get all entries for a specific customer."""
    merchant = await get_merchant_from_token(authorization, db)

    conditions = [
        CreditEntry.merchant_id == merchant.id,
        sa_func.lower(CreditEntry.customer_name) == name.lower(),
    ]

    count_result = await db.execute(
        select(sa_func.count(CreditEntry.id)).where(and_(*conditions))
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(CreditEntry)
        .where(and_(*conditions))
        .order_by(CreditEntry.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    entries = result.scalars().all()

    return CreditEntryListResponse(
        entries=entries,
        total=total,
        page=page,
        page_size=page_size,
    )
