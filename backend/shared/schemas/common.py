"""Common Pydantic schemas used across services."""

from datetime import datetime
from typing import Any, Generic, List, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# Generic type for paginated responses
T = TypeVar("T")


class BaseSchema(BaseModel):
    """Base schema with common configuration."""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )


class TimestampMixin(BaseModel):
    """Mixin for created_at and updated_at fields."""
    created_at: datetime
    updated_at: Optional[datetime] = None


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = 1
    page_size: int = 20

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None
    errors: Optional[List[str]] = None


class ErrorResponse(BaseModel):
    """Error response schema."""
    success: bool = False
    message: str
    error_code: Optional[str] = None
    details: Optional[dict] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    service: str
    version: str = "1.0.0"
    timestamp: datetime


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str
