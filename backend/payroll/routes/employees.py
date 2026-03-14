"""Employee management routes."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy import select, and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from shared.auth import get_merchant_from_token
from shared.config import settings
from shared.database import get_db, Merchant, Employee
from shared.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeListResponse,
)

router = APIRouter()


@router.post("/", response_model=EmployeeResponse)
async def create_employee(
    request: EmployeeCreate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Create a new employee."""
    merchant = await get_merchant_from_token(authorization, db)

    # Check for duplicate phone
    if request.phone:
        result = await db.execute(
            select(Employee).where(
                and_(
                    Employee.merchant_id == merchant.id,
                    Employee.phone == request.phone,
                )
            )
        )
        if result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee with this phone already exists",
            )

    employee = Employee(
        merchant_id=merchant.id,
        name=request.name,
        phone=request.phone,
        upi_id=request.upi_id,
        bank_account=request.bank_account,
        ifsc=request.ifsc,
        salary=request.salary,
        pay_day=request.pay_day,
        department=request.department,
        designation=request.designation,
        joining_date=request.joining_date,
    )
    db.add(employee)
    await db.flush()

    return EmployeeResponse.model_validate(employee)


@router.get("/", response_model=EmployeeListResponse)
async def list_employees(
    authorization: str = Header(...),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    active_only: bool = Query(True),
    department: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List all employees."""
    merchant = await get_merchant_from_token(authorization, db)

    # Build query
    query = select(Employee).where(Employee.merchant_id == merchant.id)

    if active_only:
        query = query.where(Employee.is_active == True)
    if department:
        query = query.where(Employee.department == department)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Employee.name.ilike(search_term),
                Employee.phone.ilike(search_term),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * page_size
    query = query.order_by(Employee.name).offset(offset).limit(page_size)

    result = await db.execute(query)
    employees = result.scalars().all()

    return EmployeeListResponse(
        items=[EmployeeResponse.model_validate(e) for e in employees],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific employee."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.id == employee_id,
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

    return EmployeeResponse.model_validate(employee)


@router.put("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: UUID,
    request: EmployeeUpdate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Update an employee."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.id == employee_id,
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

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(employee, field, value)

    await db.flush()

    return EmployeeResponse.model_validate(employee)


@router.delete("/{employee_id}")
async def delete_employee(
    employee_id: UUID,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Delete an employee (soft delete)."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Employee).where(
            and_(
                Employee.id == employee_id,
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

    employee.is_active = False

    return {"message": "Employee deactivated successfully"}


@router.get("/departments/list", response_model=List[str])
async def list_departments(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """List all unique departments."""
    merchant = await get_merchant_from_token(authorization, db)

    result = await db.execute(
        select(Employee.department)
        .where(
            and_(
                Employee.merchant_id == merchant.id,
                Employee.department.isnot(None),
            )
        )
        .distinct()
    )
    departments = [row[0] for row in result.all() if row[0]]

    return departments
