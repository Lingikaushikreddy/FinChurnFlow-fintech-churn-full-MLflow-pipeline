"""Transaction management routes."""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy import select, and_, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant, Transaction
from shared.schemas.transaction import (
    TransactionResponse,
    TransactionListResponse,
    TransactionFilter,
    TransactionSummary,
    DailyTransactionSummary,
)

router = APIRouter()


@router.get("/", response_model=TransactionListResponse)
async def list_transactions(
    authorization: str = Header(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type_filter: Optional[str] = Query(None, alias="type"),
    status_filter: Optional[str] = Query(None, alias="status"),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List transactions with optional filters."""
    merchant = await get_merchant_from_token(authorization, db)

    # Build query
    query = select(Transaction).where(Transaction.merchant_id == merchant.id)

    if type_filter:
        query = query.where(Transaction.type == type_filter)
    if status_filter:
        query = query.where(Transaction.status == status_filter)
    if from_date:
        query = query.where(Transaction.created_at >= from_date)
    if to_date:
        query = query.where(Transaction.created_at <= to_date)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Transaction.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    transactions = result.scalars().all()

    return TransactionListResponse(
        items=[TransactionResponse.model_validate(t) for t in transactions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/summary", response_model=TransactionSummary)
async def get_transaction_summary(
    authorization: str = Header(...),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get transaction summary/statistics."""
    merchant = await get_merchant_from_token(authorization, db)

    # Build base query
    query = select(Transaction).where(Transaction.merchant_id == merchant.id)

    if from_date:
        query = query.where(Transaction.created_at >= from_date)
    if to_date:
        query = query.where(Transaction.created_at <= to_date)

    result = await db.execute(query)
    transactions = result.scalars().all()

    # Calculate summary
    total_count = len(transactions)
    total_amount = Decimal("0.00")
    payment_count = 0
    payment_amount = Decimal("0.00")
    payout_count = 0
    payout_amount = Decimal("0.00")
    pending_count = 0
    pending_amount = Decimal("0.00")

    for t in transactions:
        total_amount += t.amount

        if t.type == "payment":
            payment_count += 1
            payment_amount += t.amount
        elif t.type == "payout":
            payout_count += 1
            payout_amount += t.amount

        if t.status == "pending":
            pending_count += 1
            pending_amount += t.amount

    return TransactionSummary(
        total_count=total_count,
        total_amount=total_amount,
        payment_count=payment_count,
        payment_amount=payment_amount,
        payout_count=payout_count,
        payout_amount=payout_amount,
        pending_count=pending_count,
        pending_amount=pending_amount,
    )


@router.get("/daily", response_model=List[DailyTransactionSummary])
async def get_daily_summary(
    authorization: str = Header(...),
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Get daily transaction summary for the past N days."""
    merchant = await get_merchant_from_token(authorization, db)

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.merchant_id == merchant.id,
                Transaction.created_at >= start_date,
            )
        )
    )
    transactions = result.scalars().all()

    # Group by date
    daily_data = {}
    for t in transactions:
        date_str = t.created_at.strftime("%Y-%m-%d")
        if date_str not in daily_data:
            daily_data[date_str] = {
                "collection": Decimal("0.00"),
                "payouts": Decimal("0.00"),
                "count": 0,
            }

        if t.type == "payment" and t.status == "completed":
            daily_data[date_str]["collection"] += t.amount
        elif t.type == "payout" and t.status == "completed":
            daily_data[date_str]["payouts"] += t.amount

        daily_data[date_str]["count"] += 1

    # Build response
    summaries = []
    for date_str in sorted(daily_data.keys()):
        data = daily_data[date_str]
        summaries.append(DailyTransactionSummary(
            date=date_str,
            collection=data["collection"],
            payouts=data["payouts"],
            net=data["collection"] - data["payouts"],
            transaction_count=data["count"],
        ))

    return summaries


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific transaction."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.id == transaction_id,
                Transaction.merchant_id == merchant.id,
            )
        )
    )
    transaction = result.scalars().first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    return TransactionResponse.model_validate(transaction)


@router.get("/today/stats")
async def get_today_stats(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get today's transaction statistics for dashboard."""
    merchant = await get_merchant_from_token(authorization, db)

    # Get today's start
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.merchant_id == merchant.id,
                Transaction.created_at >= today,
            )
        )
    )
    transactions = result.scalars().all()

    collection = Decimal("0.00")
    payouts = Decimal("0.00")
    pending = Decimal("0.00")

    for t in transactions:
        if t.type == "payment" and t.status == "completed":
            collection += t.amount
        elif t.type == "payout" and t.status == "completed":
            payouts += t.amount
        elif t.status == "pending":
            pending += t.amount

    return {
        "today_collection": float(collection),
        "today_payouts": float(payouts),
        "today_pending": float(pending),
        "today_net": float(collection - payouts),
        "transaction_count": len(transactions),
    }
