"""Transaction related schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .common import BaseSchema


class TransactionBase(BaseModel):
    """Base transaction schema."""
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    description: Optional[str] = Field(None, max_length=500)


class TransactionCreate(TransactionBase):
    """Schema for creating transaction."""
    type: str = Field(..., pattern="^(payment|payout|salary|refund)$")
    counterparty_name: Optional[str] = None
    counterparty_upi: Optional[str] = None
    counterparty_phone: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TransactionResponse(BaseSchema):
    """Transaction response schema."""
    id: UUID
    merchant_id: UUID
    type: str
    amount: Decimal
    status: str
    reference_id: Optional[str] = None
    counterparty_name: Optional[str] = None
    counterparty_upi: Optional[str] = None
    counterparty_phone: Optional[str] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict, alias="extra_data")
    created_at: datetime
    updated_at: Optional[datetime] = None


class TransactionListResponse(BaseModel):
    """Paginated transaction list."""
    items: List[TransactionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TransactionFilter(BaseModel):
    """Transaction filter parameters."""
    type: Optional[str] = None
    status: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    min_amount: Optional[Decimal] = None
    max_amount: Optional[Decimal] = None


class TransactionSummary(BaseModel):
    """Transaction summary for reporting."""
    total_count: int = 0
    total_amount: Decimal = Decimal("0.00")
    payment_count: int = 0
    payment_amount: Decimal = Decimal("0.00")
    payout_count: int = 0
    payout_amount: Decimal = Decimal("0.00")
    pending_count: int = 0
    pending_amount: Decimal = Decimal("0.00")


class DailyTransactionSummary(BaseModel):
    """Daily transaction summary."""
    date: str
    collection: Decimal = Decimal("0.00")
    payouts: Decimal = Decimal("0.00")
    net: Decimal = Decimal("0.00")
    transaction_count: int = 0
