"""Order related schemas."""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .common import BaseSchema


class OrderItem(BaseModel):
    """Single order item."""
    product_id: UUID
    name: str
    price: Decimal
    quantity: int = Field(..., gt=0)
    total: Decimal


class OrderCreate(BaseModel):
    """Schema for creating order."""
    customer_phone: Optional[str] = Field(None, max_length=15)
    customer_name: Optional[str] = Field(None, max_length=100)
    items: List[OrderItem]
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    """Schema for updating order."""
    status: Optional[str] = Field(None, pattern="^(pending|confirmed|completed|cancelled)$")
    payment_status: Optional[str] = Field(None, pattern="^(unpaid|paid|refunded)$")
    notes: Optional[str] = None


class OrderResponse(BaseSchema):
    """Order response schema."""
    id: UUID
    merchant_id: UUID
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    items: List[OrderItem]
    subtotal: Decimal
    tax: Decimal = Decimal("0.00")
    total: Decimal
    status: str
    payment_id: Optional[UUID] = None
    payment_status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class OrderListResponse(BaseModel):
    """Paginated order list."""
    items: List[OrderResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class OrderSummary(BaseModel):
    """Order summary for reporting."""
    total_orders: int = 0
    total_revenue: Decimal = Decimal("0.00")
    pending_orders: int = 0
    completed_orders: int = 0
    cancelled_orders: int = 0
    average_order_value: Decimal = Decimal("0.00")


class QuickOrderCreate(BaseModel):
    """Quick order creation (without cart)."""
    product_ids: List[UUID]
    quantities: List[int]
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
