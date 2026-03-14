"""
Reports Service - Handles analytics and report generation.
"""

from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import FastAPI, Depends, Header, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database.connection import init_db, close_db, get_db
from shared.database import Merchant, Transaction, Order, Employee, SalaryPayment


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Nano - Reports Service",
    description="Analytics and reporting",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DailyReport(BaseModel):
    """Daily report response."""
    date: str
    total_collection: float
    total_payouts: float
    net_balance: float
    transaction_count: int
    top_payment_method: str
    peak_hour: Optional[int] = None


class WeeklyReport(BaseModel):
    """Weekly report response."""
    week_start: str
    week_end: str
    total_collection: float
    total_payouts: float
    daily_breakdown: List[dict]
    growth_percentage: float


class MonthlyReport(BaseModel):
    """Monthly P&L report."""
    month: str
    year: int
    revenue: float
    payouts: float
    salaries: float
    net_profit: float
    order_count: int
    employee_count: int


class InsightResponse(BaseModel):
    """AI-generated insight."""
    type: str
    title: str
    description: str
    action: Optional[str] = None


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "reports",
        "version": "1.0.0",
    }


@app.get("/reports/daily", response_model=DailyReport)
async def get_daily_report(
    authorization: str = Header(...),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db),
):
    """Get daily report."""
    merchant = await get_merchant_from_token(authorization, db)

    # Parse date or use today
    if date:
        report_date = datetime.strptime(date, "%Y-%m-%d")
    else:
        report_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    next_date = report_date + timedelta(days=1)

    # Get transactions for the day
    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.merchant_id == merchant.id,
                Transaction.created_at >= report_date,
                Transaction.created_at < next_date,
            )
        )
    )
    transactions = result.scalars().all()

    # Calculate metrics
    total_collection = Decimal("0")
    total_payouts = Decimal("0")
    hour_counts = {}

    for t in transactions:
        if t.type == "payment" and t.status == "completed":
            total_collection += t.amount
            hour = t.created_at.hour
            hour_counts[hour] = hour_counts.get(hour, 0) + 1
        elif t.type == "payout" and t.status == "completed":
            total_payouts += t.amount

    peak_hour = max(hour_counts, key=hour_counts.get) if hour_counts else None

    return DailyReport(
        date=report_date.strftime("%Y-%m-%d"),
        total_collection=float(total_collection),
        total_payouts=float(total_payouts),
        net_balance=float(total_collection - total_payouts),
        transaction_count=len(transactions),
        top_payment_method="UPI",
        peak_hour=peak_hour,
    )


@app.get("/reports/weekly", response_model=WeeklyReport)
async def get_weekly_report(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get weekly report."""
    merchant = await get_merchant_from_token(authorization, db)

    # Calculate week range
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)

    # Get transactions for the week
    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.merchant_id == merchant.id,
                Transaction.created_at >= week_start,
                Transaction.created_at < week_end,
            )
        )
    )
    transactions = result.scalars().all()

    # Calculate daily breakdown
    daily_data = {}
    total_collection = Decimal("0")
    total_payouts = Decimal("0")

    for t in transactions:
        date_str = t.created_at.strftime("%Y-%m-%d")
        if date_str not in daily_data:
            daily_data[date_str] = {"collection": Decimal("0"), "payouts": Decimal("0")}

        if t.type == "payment" and t.status == "completed":
            daily_data[date_str]["collection"] += t.amount
            total_collection += t.amount
        elif t.type == "payout" and t.status == "completed":
            daily_data[date_str]["payouts"] += t.amount
            total_payouts += t.amount

    daily_breakdown = [
        {"date": date, "collection": float(data["collection"]), "payouts": float(data["payouts"])}
        for date, data in sorted(daily_data.items())
    ]

    # Calculate growth (compare to previous week)
    prev_week_start = week_start - timedelta(days=7)
    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.merchant_id == merchant.id,
                Transaction.created_at >= prev_week_start,
                Transaction.created_at < week_start,
                Transaction.type == "payment",
                Transaction.status == "completed",
            )
        )
    )
    prev_transactions = result.scalars().all()
    prev_collection = sum(t.amount for t in prev_transactions)

    growth = 0.0
    if prev_collection > 0:
        growth = float((total_collection - prev_collection) / prev_collection * 100)

    return WeeklyReport(
        week_start=week_start.strftime("%Y-%m-%d"),
        week_end=(week_end - timedelta(days=1)).strftime("%Y-%m-%d"),
        total_collection=float(total_collection),
        total_payouts=float(total_payouts),
        daily_breakdown=daily_breakdown,
        growth_percentage=round(growth, 2),
    )


@app.get("/reports/monthly", response_model=MonthlyReport)
async def get_monthly_report(
    authorization: str = Header(...),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020),
    db: AsyncSession = Depends(get_db),
):
    """Get monthly P&L report."""
    merchant = await get_merchant_from_token(authorization, db)

    # Use current month if not specified
    now = datetime.utcnow()
    report_month = month or now.month
    report_year = year or now.year

    # Calculate date range
    month_start = datetime(report_year, report_month, 1)
    if report_month == 12:
        month_end = datetime(report_year + 1, 1, 1)
    else:
        month_end = datetime(report_year, report_month + 1, 1)

    # Get transactions
    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.merchant_id == merchant.id,
                Transaction.created_at >= month_start,
                Transaction.created_at < month_end,
            )
        )
    )
    transactions = result.scalars().all()

    revenue = sum(t.amount for t in transactions if t.type == "payment" and t.status == "completed")
    payouts = sum(t.amount for t in transactions if t.type == "payout" and t.status == "completed")
    salaries = sum(t.amount for t in transactions if t.type == "salary" and t.status == "completed")

    # Get order count
    result = await db.execute(
        select(func.count(Order.id)).where(
            and_(
                Order.merchant_id == merchant.id,
                Order.created_at >= month_start,
                Order.created_at < month_end,
            )
        )
    )
    order_count = result.scalar() or 0

    # Get employee count
    result = await db.execute(
        select(func.count(Employee.id)).where(
            and_(
                Employee.merchant_id == merchant.id,
                Employee.is_active == True,
            )
        )
    )
    employee_count = result.scalar() or 0

    return MonthlyReport(
        month=month_start.strftime("%B"),
        year=report_year,
        revenue=float(revenue),
        payouts=float(payouts),
        salaries=float(salaries),
        net_profit=float(revenue - payouts - salaries),
        order_count=order_count,
        employee_count=employee_count,
    )


@app.get("/reports/insights", response_model=List[InsightResponse])
async def get_insights(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get AI-generated insights."""
    merchant = await get_merchant_from_token(authorization, db)

    insights = []

    # Get recent transaction data
    week_ago = datetime.utcnow() - timedelta(days=7)
    result = await db.execute(
        select(Transaction).where(
            and_(
                Transaction.merchant_id == merchant.id,
                Transaction.created_at >= week_ago,
            )
        )
    )
    transactions = result.scalars().all()

    # Generate insights based on data
    if not transactions:
        insights.append(InsightResponse(
            type="tip",
            title="Get started with payments",
            description="Create your first payment link to start accepting payments.",
            action="create_payment_link",
        ))
    else:
        # Collection trend
        total = sum(t.amount for t in transactions if t.type == "payment")
        insights.append(InsightResponse(
            type="stat",
            title=f"₹{total:,.0f} collected this week",
            description="Your weekly collection from all payment methods.",
        ))

        # Peak time insight
        hour_counts = {}
        for t in transactions:
            if t.type == "payment":
                hour = t.created_at.hour
                hour_counts[hour] = hour_counts.get(hour, 0) + 1

        if hour_counts:
            peak_hour = max(hour_counts, key=hour_counts.get)
            insights.append(InsightResponse(
                type="insight",
                title=f"Peak business hour: {peak_hour}:00",
                description=f"You receive most payments around {peak_hour}:00. Consider staffing accordingly.",
            ))

    # Check for pending salaries
    now = datetime.utcnow()
    if now.day >= 25:
        result = await db.execute(
            select(Employee).where(
                and_(
                    Employee.merchant_id == merchant.id,
                    Employee.is_active == True,
                )
            )
        )
        employees = result.scalars().all()

        if employees:
            insights.append(InsightResponse(
                type="reminder",
                title="Salary payment reminder",
                description=f"You have {len(employees)} employees. Consider processing salaries.",
                action="process_salary",
            ))

    return insights[:5]  # Return top 5 insights
