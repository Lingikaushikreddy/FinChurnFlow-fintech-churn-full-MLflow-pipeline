"""Salary processing routes."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_db, Merchant, Employee, SalaryPayment, Transaction, Advance
from shared.schemas.employee import (
    SalaryPaymentCreate,
    SalaryPaymentResponse,
    SalaryBatchResponse,
    SalaryHistoryResponse,
    AdvanceCreate,
    AdvanceResponse,
    PayrollSummary,
)
from shared.utils.helpers import generate_reference_id

from shared.auth import get_merchant_from_token

router = APIRouter()


class ProcessSalaryRequest(BaseModel):
    """Request to process salary payments."""
    employee_ids: Optional[List[UUID]] = None  # None means all active employees
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020)
    pin: str = Field(..., min_length=4, max_length=6)


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


@router.post("/process", response_model=SalaryBatchResponse)
async def process_salary(
    request: ProcessSalaryRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Process salary payments for employees."""
    merchant = await get_merchant_from_token(authorization, db)

    # Verify PIN
    await verify_merchant_pin(merchant, request.pin)

    # Get employees
    query = select(Employee).where(
        and_(
            Employee.merchant_id == merchant.id,
            Employee.is_active == True,
        )
    )

    if request.employee_ids:
        query = query.where(Employee.id.in_(request.employee_ids))

    result = await db.execute(query)
    employees = result.scalars().all()

    if not employees:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No employees found to process",
        )

    # Check for already processed salaries
    for employee in employees:
        existing = await db.execute(
            select(SalaryPayment).where(
                and_(
                    SalaryPayment.employee_id == employee.id,
                    SalaryPayment.month == request.month,
                    SalaryPayment.year == request.year,
                    SalaryPayment.status.in_(["pending", "processing", "completed"]),
                )
            )
        )
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Salary already processed for {employee.name} for {request.month}/{request.year}",
            )

    payments = []
    successful = 0
    failed = 0
    total_amount = Decimal("0.00")

    for employee in employees:
        if not employee.salary:
            failed += 1
            continue

        if not employee.upi_id and not employee.bank_account:
            failed += 1
            continue

        # Calculate net salary (deduct pending advances)
        pending_advances = await db.execute(
            select(Advance).where(
                and_(
                    Advance.employee_id == employee.id,
                    Advance.status == "approved",
                    Advance.deducted < Advance.amount,
                )
            )
        )
        advances = pending_advances.scalars().all()

        deductions = Decimal("0.00")
        for advance in advances:
            remaining = advance.amount - advance.deducted
            deductions += remaining

        net_salary = employee.salary - deductions

        if net_salary <= 0:
            failed += 1
            continue

        # Generate reference ID
        reference_id = generate_reference_id("sal")

        try:
            # Create transaction record
            transaction = Transaction(
                merchant_id=merchant.id,
                type="salary",
                amount=net_salary,
                status="processing",
                reference_id=reference_id,
                counterparty_name=employee.name,
                counterparty_upi=employee.upi_id,
                counterparty_phone=employee.phone,
                description=f"Salary for {request.month}/{request.year}",
                metadata={
                    "employee_id": str(employee.id),
                    "month": request.month,
                    "year": request.year,
                    "deductions": float(deductions),
                },
            )
            db.add(transaction)
            await db.flush()

            # Create salary payment record
            salary_payment = SalaryPayment(
                employee_id=employee.id,
                merchant_id=merchant.id,
                amount=net_salary,
                month=request.month,
                year=request.year,
                status="processing",
                transaction_id=transaction.id,
            )
            db.add(salary_payment)
            await db.flush()

            # Update advance deductions
            for advance in advances:
                remaining = advance.amount - advance.deducted
                advance.deducted = advance.amount
                if advance.deducted >= advance.amount:
                    advance.status = "deducted"

            # Simulate successful payment (in real scenario, this would be async)
            transaction.status = "completed"
            salary_payment.status = "completed"
            salary_payment.paid_at = datetime.utcnow()

            payments.append(SalaryPaymentResponse.model_validate(salary_payment))
            successful += 1
            total_amount += net_salary

        except Exception:
            failed += 1

    return SalaryBatchResponse(
        total_amount=total_amount,
        successful=successful,
        failed=failed,
        payments=payments,
    )


@router.get("/history", response_model=SalaryHistoryResponse)
async def get_salary_history(
    authorization: str = Header(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    employee_id: Optional[UUID] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020),
    db: AsyncSession = Depends(get_db),
):
    """Get salary payment history."""
    merchant = await get_merchant_from_token(authorization, db)

    # Build query
    query = select(SalaryPayment).where(SalaryPayment.merchant_id == merchant.id)

    if employee_id:
        query = query.where(SalaryPayment.employee_id == employee_id)
    if month:
        query = query.where(SalaryPayment.month == month)
    if year:
        query = query.where(SalaryPayment.year == year)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(SalaryPayment.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    payments = result.scalars().all()

    return SalaryHistoryResponse(
        items=[SalaryPaymentResponse.model_validate(p) for p in payments],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/summary", response_model=PayrollSummary)
async def get_payroll_summary(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get payroll summary."""
    merchant = await get_merchant_from_token(authorization, db)

    # Get employee counts
    result = await db.execute(
        select(Employee).where(Employee.merchant_id == merchant.id)
    )
    employees = result.scalars().all()

    total_employees = len(employees)
    active_employees = sum(1 for e in employees if e.is_active)
    monthly_payroll = sum(e.salary or Decimal("0") for e in employees if e.is_active and e.salary)

    # Get pending advances
    result = await db.execute(
        select(Advance).where(
            and_(
                Advance.employee_id.in_([e.id for e in employees]),
                Advance.status == "approved",
                Advance.deducted < Advance.amount,
            )
        )
    )
    advances = result.scalars().all()
    pending_advances = sum(a.amount - a.deducted for a in advances)

    # This month's payments
    current_month = datetime.utcnow().month
    current_year = datetime.utcnow().year

    result = await db.execute(
        select(SalaryPayment).where(
            and_(
                SalaryPayment.merchant_id == merchant.id,
                SalaryPayment.month == current_month,
                SalaryPayment.year == current_year,
            )
        )
    )
    this_month_payments = result.scalars().all()

    this_month_paid = sum(p.amount for p in this_month_payments if p.status == "completed")
    this_month_pending = monthly_payroll - this_month_paid

    return PayrollSummary(
        total_employees=total_employees,
        active_employees=active_employees,
        monthly_payroll=monthly_payroll,
        pending_advances=pending_advances,
        this_month_paid=this_month_paid,
        this_month_pending=max(Decimal("0"), this_month_pending),
    )


@router.post("/advance", response_model=AdvanceResponse)
async def record_advance(
    request: AdvanceCreate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Record a salary advance for an employee."""
    merchant = await get_merchant_from_token(authorization, db)

    # Verify employee
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.id == request.employee_id,
                Employee.merchant_id == merchant.id,
            )
        )
    )
    employee = result.scalars().first()

    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    advance = Advance(
        employee_id=request.employee_id,
        amount=request.amount,
        reason=request.reason,
        status="approved",  # Auto-approve for now
    )
    db.add(advance)
    await db.flush()

    return AdvanceResponse.model_validate(advance)


@router.get("/advances/{employee_id}", response_model=List[AdvanceResponse])
async def get_employee_advances(
    employee_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get advances for an employee."""
    merchant = await get_merchant_from_token(authorization, db)

    # Verify employee belongs to merchant
    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.id == employee_id,
                Employee.merchant_id == merchant.id,
            )
        )
    )
    if not result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    result = await db.execute(
        select(Advance)
        .where(Advance.employee_id == employee_id)
        .order_by(Advance.created_at.desc())
    )
    advances = result.scalars().all()

    return [AdvanceResponse.model_validate(a) for a in advances]
