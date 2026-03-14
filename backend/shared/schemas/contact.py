"""Contact/Beneficiary related schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
import re

from .common import BaseSchema


class ContactBase(BaseModel):
    """Base contact schema."""
    name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    upi_id: Optional[str] = Field(None, max_length=100)
    bank_account: Optional[str] = Field(None, max_length=20)
    ifsc: Optional[str] = Field(None, max_length=11)

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


class ContactCreate(ContactBase):
    """Schema for creating contact."""
    pass


class ContactUpdate(BaseModel):
    """Schema for updating contact."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=15)
    upi_id: Optional[str] = Field(None, max_length=100)
    bank_account: Optional[str] = Field(None, max_length=20)
    ifsc: Optional[str] = Field(None, max_length=11)


class ContactResponse(BaseSchema):
    """Contact response schema."""
    id: UUID
    merchant_id: UUID
    name: str
    phone: Optional[str] = None
    upi_id: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc: Optional[str] = None
    is_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None


class ContactListResponse(BaseModel):
    """Paginated contact list."""
    items: List[ContactResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ContactSearchRequest(BaseModel):
    """Contact search parameters."""
    query: Optional[str] = None
    has_upi: Optional[bool] = None
    has_bank: Optional[bool] = None
