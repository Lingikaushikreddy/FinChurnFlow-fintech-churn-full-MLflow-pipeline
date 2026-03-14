"""Product and catalog related schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from .common import BaseSchema


# Price type and unit enums as string literals
PRICE_TYPES = ["fixed", "market_rate", "call_for_price"]
PRICE_UNITS = ["per_kg", "per_500g", "per_250g", "per_piece", "per_dozen", "per_bunch", "per_packet"]


class ProductBase(BaseModel):
    """Base product schema."""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    price: Decimal = Field(..., gt=0, decimal_places=2)
    stock: int = Field(default=0, ge=0)
    sku: Optional[str] = Field(None, max_length=50)
    is_active: bool = True
    # Flexible Pricing
    price_type: str = Field(default="fixed", description="fixed, market_rate, or call_for_price")
    price_unit: str = Field(default="per_piece", description="per_kg, per_500g, per_250g, per_piece, per_dozen, per_bunch, per_packet")


class ProductCreate(ProductBase):
    """Schema for creating product."""
    category_id: Optional[UUID] = None
    images: List[str] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    """Schema for updating product."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    stock: Optional[int] = Field(None, ge=0)
    sku: Optional[str] = Field(None, max_length=50)
    category_id: Optional[UUID] = None
    images: Optional[List[str]] = None
    is_active: Optional[bool] = None
    # Flexible Pricing
    price_type: Optional[str] = None
    price_unit: Optional[str] = None


class ProductResponse(BaseSchema):
    """Product response schema."""
    id: UUID
    merchant_id: UUID
    name: str
    description: Optional[str] = None
    price: Decimal
    images: List[str] = Field(default_factory=list)
    stock: int = 0
    category_id: Optional[UUID] = None
    sku: Optional[str] = None
    is_active: bool = True
    # Flexible Pricing
    price_type: str = "fixed"
    price_unit: str = "per_piece"
    last_price_update: Optional[datetime] = None
    price_history: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None


# Bulk Price Update Schemas
class PriceUpdateItem(BaseModel):
    """Single product price update."""
    product_id: UUID
    price: Decimal = Field(..., gt=0, decimal_places=2)


class BulkPriceUpdateRequest(BaseModel):
    """Bulk price update request."""
    updates: List[PriceUpdateItem]


class BulkPriceUpdateResponse(BaseModel):
    """Bulk price update response."""
    updated: int
    failed: int
    products: List[ProductResponse]


# Daily Rate Board Schemas
class RateBoardItem(BaseModel):
    """Single item in rate board."""
    name: str
    price: Decimal
    price_unit: str
    price_type: str


class DailyRateBoardResponse(BaseModel):
    """Daily rate board response."""
    merchant_name: str
    business_name: Optional[str] = None
    date: str
    items: List[RateBoardItem]
    share_text: str  # Pre-formatted text for WhatsApp sharing


class ProductListResponse(BaseModel):
    """Paginated product list."""
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CategoryCreate(BaseModel):
    """Schema for creating category."""
    name: str = Field(..., min_length=1, max_length=100)
    parent_id: Optional[UUID] = None


class CategoryUpdate(BaseModel):
    """Schema for updating category."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    parent_id: Optional[UUID] = None


class CategoryResponse(BaseSchema):
    """Category response schema."""
    id: UUID
    merchant_id: UUID
    name: str
    parent_id: Optional[UUID] = None
    created_at: datetime


class CategoryWithProducts(CategoryResponse):
    """Category with nested products."""
    products: List[ProductResponse] = Field(default_factory=list)


class CatalogResponse(BaseModel):
    """Public catalog response."""
    merchant_name: str
    business_name: Optional[str] = None
    categories: List[CategoryWithProducts] = Field(default_factory=list)
    products: List[ProductResponse] = Field(default_factory=list)


class StockUpdate(BaseModel):
    """Stock update request."""
    product_id: UUID
    quantity: int = Field(..., description="Positive to add, negative to subtract")
    reason: Optional[str] = None


class BulkStockUpdate(BaseModel):
    """Bulk stock update request."""
    updates: List[StockUpdate]
