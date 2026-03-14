"""Payment related schemas (QR, Links, Pages)."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .common import BaseSchema


# QR Code Schemas
class QRCodeCreate(BaseModel):
    """Schema for creating QR code."""
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    description: Optional[str] = Field(None, max_length=200)
    is_dynamic: bool = False


class QRCodeResponse(BaseSchema):
    """QR code response schema."""
    id: UUID
    merchant_id: UUID
    upi_id: str
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    qr_data: str
    qr_image_base64: Optional[str] = None
    is_dynamic: bool = False
    scan_count: int = 0
    created_at: datetime


# Payment Link Schemas
class PaymentLinkCreate(BaseModel):
    """Schema for creating payment link."""
    amount: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    description: Optional[str] = Field(None, max_length=500)
    expires_in_hours: Optional[int] = Field(None, gt=0, le=720)  # Max 30 days


class PaymentLinkUpdate(BaseModel):
    """Schema for updating payment link."""
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[str] = Field(None, pattern="^(active|disabled)$")


class PaymentLinkResponse(BaseSchema):
    """Payment link response schema."""
    id: UUID
    merchant_id: UUID
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    short_code: str
    short_url: str
    status: str
    payment_count: int = 0
    total_collected: Decimal = Decimal("0.00")
    expires_at: Optional[datetime] = None
    created_at: datetime


class PaymentLinkListResponse(BaseModel):
    """Paginated payment link list."""
    items: List[PaymentLinkResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaymentLinkPublic(BaseModel):
    """Public view of payment link for customers."""
    merchant_name: str
    business_name: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    upi_id: str
    status: str


# Payment Page Schemas
class PaymentPageCreate(BaseModel):
    """Schema for creating payment page."""
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    amount_options: List[Decimal] = Field(default_factory=list)
    allow_custom_amount: bool = True
    min_amount: Optional[Decimal] = Field(None, gt=0)
    max_amount: Optional[Decimal] = Field(None, gt=0)


class PaymentPageResponse(BaseModel):
    """Payment page response schema."""
    id: UUID
    merchant_id: UUID
    title: str
    description: Optional[str] = None
    amount_options: List[Decimal]
    allow_custom_amount: bool
    short_url: str
    status: str
    created_at: datetime


# Webhook Schemas
class WebhookPayload(BaseModel):
    """Incoming webhook payload."""
    event: str
    payload: Dict[str, Any]
    timestamp: datetime


class PaymentWebhookData(BaseModel):
    """Payment webhook data."""
    payment_id: str
    order_id: str
    amount: Decimal
    status: str
    method: str
    upi_transaction_id: Optional[str] = None
    payer_vpa: Optional[str] = None


# Mock Payment Gateway Schemas
class GatewayOrderCreate(BaseModel):
    """Mock order creation."""
    amount: int  # Amount in paise
    currency: str = "INR"
    receipt: Optional[str] = None
    notes: Dict[str, str] = Field(default_factory=dict)


class GatewayOrderResponse(BaseModel):
    """Mock order response."""
    id: str
    entity: str = "order"
    amount: int
    amount_paid: int = 0
    amount_due: int
    currency: str = "INR"
    receipt: Optional[str] = None
    status: str = "created"
    notes: Dict[str, str] = Field(default_factory=dict)
    created_at: int


class GatewayPaymentResponse(BaseModel):
    """Mock payment response."""
    id: str
    entity: str = "payment"
    amount: int
    currency: str = "INR"
    status: str
    order_id: str
    method: str = "upi"
    vpa: Optional[str] = None
    email: Optional[str] = None
    contact: Optional[str] = None
    created_at: int
