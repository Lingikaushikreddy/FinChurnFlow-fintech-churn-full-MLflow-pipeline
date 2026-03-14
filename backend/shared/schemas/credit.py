"""Pydantic schemas for Khaata (credit/debit ledger)."""

import re
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# Regex: allow Hindi (Devanagari) + English letters + spaces + dots + hyphens
NAME_PATTERN = re.compile(r"^[\u0900-\u097Fa-zA-Z\s.\-']{2,100}$")
# Indian phone: starts with 6-9, 10 digits
PHONE_PATTERN = re.compile(r"^[6-9]\d{9}$")

MAX_AMOUNT = 10000000  # 1 crore


class CreditEntryCreate(BaseModel):
    """Schema for creating a credit/debit entry."""
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_phone: Optional[str] = Field(None, max_length=15)
    amount: Decimal = Field(..., gt=0, le=MAX_AMOUNT)
    direction: str = Field(default="debit")  # 'credit' or 'debit'
    description: Optional[str] = Field(None, max_length=500)
    item: Optional[str] = Field(None, max_length=200)
    source: str = Field(default="manual")  # 'voice', 'manual', 'ai'

    @field_validator("customer_name")
    @classmethod
    def validate_customer_name(cls, v: str) -> str:
        v = v.strip()
        if not NAME_PATTERN.match(v):
            raise ValueError("Customer name can only contain Hindi/English letters, spaces, dots, and hyphens")
        return v.title()

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = v.strip().replace(" ", "").replace("-", "")
        if cleaned.startswith("+91"):
            cleaned = cleaned[3:]
        if cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        if not PHONE_PATTERN.match(cleaned):
            raise ValueError("Please enter a valid 10-digit Indian mobile number")
        return cleaned

    @field_validator("direction")
    @classmethod
    def validate_direction(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ("credit", "debit"):
            raise ValueError("Direction must be 'credit' or 'debit'")
        return v

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ("voice", "manual", "ai"):
            raise ValueError("Source must be 'voice', 'manual', or 'ai'")
        return v


class CreditEntryResponse(BaseModel):
    """Schema for credit entry response."""
    id: UUID
    merchant_id: UUID
    customer_name: str
    customer_phone: Optional[str] = None
    amount: Decimal
    direction: str
    description: Optional[str] = None
    item: Optional[str] = None
    is_settled: bool
    settled_at: Optional[datetime] = None
    source: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreditEntryListResponse(BaseModel):
    """Schema for listing credit entries."""
    entries: List[CreditEntryResponse]
    total: int
    page: int = 1
    page_size: int = 20


class CustomerLedgerSummary(BaseModel):
    """Summary of a single customer's ledger."""
    customer_name: str
    customer_phone: Optional[str] = None
    total_credit: Decimal = Decimal("0")
    total_debit: Decimal = Decimal("0")
    net_balance: Decimal = Decimal("0")  # positive = customer owes, negative = merchant owes
    entry_count: int = 0
    unsettled_count: int = 0
    last_entry_at: Optional[datetime] = None


class KhaataOverview(BaseModel):
    """Overall khaata summary for the merchant."""
    total_outstanding: Decimal = Decimal("0")  # total owed by all customers
    total_customers: int = 0
    customers_with_dues: int = 0
    customers: List[CustomerLedgerSummary] = Field(default_factory=list)
