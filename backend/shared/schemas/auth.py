"""Authentication related schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
import re

from .common import BaseSchema


class OTPSendRequest(BaseModel):
    """Request to send OTP."""
    phone: str = Field(..., min_length=10, max_length=15, description="Phone number with country code")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Remove any spaces or dashes
        v = re.sub(r"[\s\-]", "", v)
        # Validate format (Indian phone number)
        if not re.match(r"^(\+91)?[6-9]\d{9}$", v):
            raise ValueError("Invalid Indian phone number")
        # Normalize to include +91
        if not v.startswith("+91"):
            v = "+91" + v
        return v


class OTPSendResponse(BaseModel):
    """Response after sending OTP."""
    success: bool = True
    message: str = "OTP sent successfully"
    phone: str
    expires_in: int = Field(..., description="OTP expiry time in seconds")


class OTPVerifyRequest(BaseModel):
    """Request to verify OTP."""
    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=4, max_length=6)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = re.sub(r"[\s\-]", "", v)
        if not v.startswith("+91"):
            v = "+91" + v
        return v


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Access token expiry in seconds")


class RefreshTokenRequest(BaseModel):
    """Request to refresh access token."""
    refresh_token: str


class MerchantProfile(BaseSchema):
    """Merchant profile response."""
    id: UUID
    phone: str
    name: Optional[str] = None
    business_name: Optional[str] = None
    upi_id: Optional[str] = None
    kyc_status: str = "pending"
    is_active: bool = True
    created_at: datetime


class MerchantProfileUpdate(BaseModel):
    """Request to update merchant profile."""
    name: Optional[str] = Field(None, max_length=100)
    business_name: Optional[str] = Field(None, max_length=200)
    upi_id: Optional[str] = Field(None, max_length=100)

    @field_validator("upi_id")
    @classmethod
    def validate_upi(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        # Basic UPI ID validation
        if not re.match(r"^[\w.\-]+@[\w]+$", v):
            raise ValueError("Invalid UPI ID format")
        return v


class SetPinRequest(BaseModel):
    """Request to set transaction PIN."""
    pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d+$")


class VerifyPinRequest(BaseModel):
    """Request to verify transaction PIN."""
    pin: str = Field(..., min_length=4, max_length=6, pattern=r"^\d+$")


class DeviceInfo(BaseModel):
    """Device information for token tracking."""
    device_id: Optional[str] = None
    device_name: Optional[str] = None
    platform: Optional[str] = None  # 'ios', 'android'
    app_version: Optional[str] = None
