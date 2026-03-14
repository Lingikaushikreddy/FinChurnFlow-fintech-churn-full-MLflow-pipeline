"""Employee and payroll related schemas."""

from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
import re

from .common import BaseSchema


class EmployeeBase(BaseModel):
    """Base employee schema."""
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    upi_id: Optional[str] = Field(None, max_length=100)
    bank_account: Optional[str] = Field(None, max_length=20)
    ifsc: Optional[str] = Field(None, max_length=11)
    salary: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    pay_day: int = Field(default=1, ge=1, le=28)
    department: Optional[str] = Field(None, max_length=50)
    designation: Optional[str] = Field(None, max_length=50)
    joining_date: Optional[date] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = re.sub(r"[\s\-]", "", v)
        if not re.match(r"^(\+91)?[6-9]\d{9}$", v):
            raise ValueError("Invalid Indian phone number")
        if not v.startswith("+91"):
            v = "+91" + v
        return v

    @field_validator("upi_id")
    @classmethod
    def validate_upi(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^[\w.\-]+@[\w]+$", v):
            raise ValueError("Invalid UPI ID format")
        return v

    @field_validator("ifsc")
    @classmethod
    def validate_ifsc(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", v.upper()):
            raise ValueError("Invalid IFSC code format")
        return v.upper()


class EmployeeCreate(EmployeeBase):
    """Schema for creating employee."""
    pass


class EmployeeUpdate(BaseModel):
    """Schema for updating employee."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    upi_id: Optional[str] = Field(None, max_length=100)
    bank_account: Optional[str] = Field(None, max_length=20)
    ifsc: Optional[str] = Field(None, max_length=11)
    salary: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    pay_day: Optional[int] = Field(None, ge=1, le=28)
    department: Optional[str] = Field(None, max_length=50)
    designation: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class EmployeeResponse(BaseSchema):
    """Employee response schema."""
    id: UUID
    merchant_id: UUID
    name: str
    phone: Optional[str] = None
    upi_id: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc: Optional[str] = None
    salary: Optional[Decimal] = None
    pay_day: int = 1
    department: Optional[str] = None
    designation: Optional[str] = None
    joining_date: Optional[date] = None
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None


class EmployeeListResponse(BaseModel):
    """Paginated employee list."""
    items: List[EmployeeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Salary Payment Schemas
class SalaryPaymentCreate(BaseModel):
    """Schema for processing salary."""
    employee_ids: List[UUID]
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)


class SalaryPaymentResponse(BaseSchema):
    """Salary payment response."""
    id: UUID
    employee_id: UUID
    merchant_id: UUID
    amount: Decimal
    month: int
    year: int
    status: str
    transaction_id: Optional[UUID] = None
    paid_at: Optional[datetime] = None
    created_at: datetime


class SalaryBatchResponse(BaseModel):
    """Batch salary processing response."""
    total_employees: int
    total_amount: Decimal
    successful: int
    failed: int
    payments: List[SalaryPaymentResponse]


class SalaryHistoryResponse(BaseModel):
    """Salary history response."""
    items: List[SalaryPaymentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Advance Schemas
class AdvanceCreate(BaseModel):
    """Schema for recording advance."""
    employee_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    reason: Optional[str] = None


class AdvanceResponse(BaseSchema):
    """Advance response schema."""
    id: UUID
    employee_id: UUID
    amount: Decimal
    deducted: Decimal = Decimal("0.00")
    reason: Optional[str] = None
    status: str
    created_at: datetime


class AdvanceDeduction(BaseModel):
    """Advance deduction request."""
    advance_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)


class PayrollSummary(BaseModel):
    """Payroll summary for reporting."""
    total_employees: int = 0
    active_employees: int = 0
    monthly_payroll: Decimal = Decimal("0.00")
    pending_advances: Decimal = Decimal("0.00")
    this_month_paid: Decimal = Decimal("0.00")
    this_month_pending: Decimal = Decimal("0.00")
