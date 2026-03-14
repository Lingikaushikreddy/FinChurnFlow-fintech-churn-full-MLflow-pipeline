"""Merchant related schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .common import BaseSchema


class MerchantBase(BaseModel):
    """Base merchant schema."""
    name: Optional[str] = Field(None, max_length=100)
    business_name: Optional[str] = Field(None, max_length=200)
    upi_id: Optional[str] = Field(None, max_length=100)


class MerchantCreate(MerchantBase):
    """Schema for creating merchant."""
    phone: str


class MerchantUpdate(MerchantBase):
    """Schema for updating merchant."""
    pass


class MerchantResponse(BaseSchema):
    """Merchant response schema."""
    id: UUID
    phone: str
    name: Optional[str] = None
    business_name: Optional[str] = None
    upi_id: Optional[str] = None
    kyc_status: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class MerchantDashboard(BaseModel):
    """Dashboard summary for merchant."""
    today_collection: Decimal = Decimal("0.00")
    today_payouts: Decimal = Decimal("0.00")
    today_transactions: int = 0
    pending_payouts: Decimal = Decimal("0.00")
    total_balance: Decimal = Decimal("0.00")
    week_collection: Decimal = Decimal("0.00")
    week_growth_percent: float = 0.0


class MerchantStats(BaseModel):
    """Merchant statistics."""
    total_transactions: int = 0
    total_volume: Decimal = Decimal("0.00")
    total_payouts: Decimal = Decimal("0.00")
    active_payment_links: int = 0
    total_customers: int = 0
    total_products: int = 0
    total_employees: int = 0


class KYCStatusUpdate(BaseModel):
    """KYC status update schema."""
    status: str = Field(..., pattern="^(pending|submitted|verified|rejected)$")
    notes: Optional[str] = None
