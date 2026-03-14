"""
SQLAlchemy models for Nano.
These models map to the database tables defined in init.sql.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Mapped, mapped_column

Base = declarative_base()


class Merchant(Base):
    """Merchant/User model."""
    __tablename__ = "merchants"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    phone: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(100))
    business_name: Mapped[Optional[str]] = mapped_column(String(200))
    upi_id: Mapped[Optional[str]] = mapped_column(String(100))
    kyc_status: Mapped[str] = mapped_column(String(20), default="pending")
    pin_hash: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    transactions: Mapped[List["Transaction"]] = relationship("Transaction", back_populates="merchant", cascade="all, delete-orphan")
    contacts: Mapped[List["Contact"]] = relationship("Contact", back_populates="merchant", cascade="all, delete-orphan")
    payment_links: Mapped[List["PaymentLink"]] = relationship("PaymentLink", back_populates="merchant", cascade="all, delete-orphan")
    qr_codes: Mapped[List["QRCode"]] = relationship("QRCode", back_populates="merchant", cascade="all, delete-orphan")
    products: Mapped[List["Product"]] = relationship("Product", back_populates="merchant", cascade="all, delete-orphan")
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="merchant", cascade="all, delete-orphan")
    employees: Mapped[List["Employee"]] = relationship("Employee", back_populates="merchant", cascade="all, delete-orphan")
    refresh_tokens: Mapped[List["RefreshToken"]] = relationship("RefreshToken", back_populates="merchant", cascade="all, delete-orphan")
    chat_sessions: Mapped[List["ChatSession"]] = relationship("ChatSession", back_populates="merchant", cascade="all, delete-orphan")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="merchant", cascade="all, delete-orphan")
    credit_entries: Mapped[List["CreditEntry"]] = relationship("CreditEntry", back_populates="merchant", cascade="all, delete-orphan")


class Transaction(Base):
    """Transaction model for all money movements."""
    __tablename__ = "transactions"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'payment', 'payout', 'salary', 'refund'
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)  # 'pending', 'processing', 'completed', 'failed'
    reference_id: Mapped[Optional[str]] = mapped_column(String(100))
    counterparty_name: Mapped[Optional[str]] = mapped_column(String(100))
    counterparty_upi: Mapped[Optional[str]] = mapped_column(String(100))
    counterparty_phone: Mapped[Optional[str]] = mapped_column(String(15))
    description: Mapped[Optional[str]] = mapped_column(Text)
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict, name="metadata")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="transactions")


class Contact(Base):
    """Contact/Beneficiary model for payouts."""
    __tablename__ = "contacts"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(15))
    upi_id: Mapped[Optional[str]] = mapped_column(String(100))
    bank_account: Mapped[Optional[str]] = mapped_column(String(20))
    ifsc: Mapped[Optional[str]] = mapped_column(String(11))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="contacts")


class PaymentLink(Base):
    """Payment link model."""
    __tablename__ = "payment_links"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    description: Mapped[Optional[str]] = mapped_column(String(500))
    short_code: Mapped[str] = mapped_column(String(20), unique=True)
    short_url: Mapped[Optional[str]] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="active")  # 'active', 'expired', 'disabled'
    payment_count: Mapped[int] = mapped_column(Integer, default=0)
    total_collected: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="payment_links")


class QRCode(Base):
    """QR code model."""
    __tablename__ = "qr_codes"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    upi_id: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    description: Mapped[Optional[str]] = mapped_column(String(200))
    qr_data: Mapped[str] = mapped_column(Text, nullable=False)
    is_dynamic: Mapped[bool] = mapped_column(Boolean, default=False)
    scan_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="qr_codes")


class Product(Base):
    """Product model for store/catalog."""
    __tablename__ = "products"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    images: Mapped[list] = mapped_column(JSONB, default=list)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    category_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("categories.id"))
    sku: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Flexible Pricing System
    price_type: Mapped[str] = mapped_column(String(20), default="fixed")  # 'fixed', 'market_rate', 'call_for_price'
    price_unit: Mapped[str] = mapped_column(String(20), default="per_piece")  # 'per_kg', 'per_500g', 'per_250g', 'per_piece', 'per_dozen', 'per_bunch', 'per_packet'
    last_price_update: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    price_history: Mapped[list] = mapped_column(JSONB, default=list)  # [{price: 50, updated_at: "2026-01-28T09:00:00Z"}]
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="products")
    category: Mapped[Optional["Category"]] = relationship("Category", back_populates="products")


class Category(Base):
    """Category model for products."""
    __tablename__ = "categories"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("categories.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    products: Mapped[List["Product"]] = relationship("Product", back_populates="category")
    children: Mapped[List["Category"]] = relationship("Category", back_populates="parent", remote_side=[id])
    parent: Mapped[Optional["Category"]] = relationship("Category", back_populates="children", remote_side=[parent_id])


class Order(Base):
    """Order model for store purchases."""
    __tablename__ = "orders"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    customer_phone: Mapped[Optional[str]] = mapped_column(String(15))
    customer_name: Mapped[Optional[str]] = mapped_column(String(100))
    items: Mapped[list] = mapped_column(JSONB, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # 'pending', 'confirmed', 'completed', 'cancelled'
    payment_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True))
    payment_status: Mapped[str] = mapped_column(String(20), default="unpaid")  # 'unpaid', 'paid', 'refunded'
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="orders")


class Employee(Base):
    """Employee model for payroll."""
    __tablename__ = "employees"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(15))
    upi_id: Mapped[Optional[str]] = mapped_column(String(100))
    bank_account: Mapped[Optional[str]] = mapped_column(String(20))
    ifsc: Mapped[Optional[str]] = mapped_column(String(11))
    salary: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    pay_day: Mapped[int] = mapped_column(Integer, default=1)
    department: Mapped[Optional[str]] = mapped_column(String(50))
    designation: Mapped[Optional[str]] = mapped_column(String(50))
    joining_date: Mapped[Optional[date]] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="employees")
    salary_payments: Mapped[List["SalaryPayment"]] = relationship("SalaryPayment", back_populates="employee", cascade="all, delete-orphan")
    advances: Mapped[List["Advance"]] = relationship("Advance", back_populates="employee", cascade="all, delete-orphan")


class SalaryPayment(Base):
    """Salary payment record."""
    __tablename__ = "salary_payments"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    employee_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"))
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    month: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # 'pending', 'processing', 'completed', 'failed'
    transaction_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("transactions.id"))
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", back_populates="salary_payments")


class Advance(Base):
    """Salary advance record."""
    __tablename__ = "advances"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    employee_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    deducted: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
    reason: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # 'pending', 'approved', 'deducted'
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    employee: Mapped["Employee"] = relationship("Employee", back_populates="advances")


class OTP(Base):
    """OTP storage for authentication."""
    __tablename__ = "otps"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    phone: Mapped[str] = mapped_column(String(15), nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RefreshToken(Base):
    """Refresh token storage."""
    __tablename__ = "refresh_tokens"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    device_info: Mapped[Optional[dict]] = mapped_column(JSONB)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="refresh_tokens")


class ChatSession(Base):
    """AI chat session storage."""
    __tablename__ = "chat_sessions"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    messages: Mapped[list] = mapped_column(JSONB, default=list)
    context: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="chat_sessions")


class Notification(Base):
    """Notification log."""
    __tablename__ = "notifications"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # 'payment_received', 'payout_sent', etc.
    channel: Mapped[str] = mapped_column(String(20), nullable=False)  # 'sms', 'whatsapp', 'push'
    recipient: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # 'pending', 'sent', 'delivered', 'failed'
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="notifications")


class CreditEntry(Base):
    """Credit/Debit ledger entry (Khaata/Udhaar) for customer credit tracking."""
    __tablename__ = "credit_entries"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    merchant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"))
    customer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_phone: Mapped[Optional[str]] = mapped_column(String(15))
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False, default="debit")  # 'credit' or 'debit'
    description: Mapped[Optional[str]] = mapped_column(Text)
    item: Mapped[Optional[str]] = mapped_column(String(200))
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(20), default="manual")  # 'voice', 'manual', 'ai'
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="credit_entries")
