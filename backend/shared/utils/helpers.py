"""General helper utilities."""

import secrets
import string
from datetime import datetime
from decimal import Decimal
from typing import Optional
import re


def generate_short_code(length: int = 8) -> str:
    """Generate a short alphanumeric code for URLs."""
    # Use a mix of lowercase, uppercase and digits (excluding confusing chars)
    alphabet = string.ascii_lowercase + string.ascii_uppercase + string.digits
    # Remove confusing characters: 0, O, l, 1, I
    alphabet = alphabet.replace("0", "").replace("O", "").replace("l", "").replace("1", "").replace("I", "")
    return "".join(secrets.choice(alphabet) for _ in range(length))


def generate_reference_id(prefix: str = "txn") -> str:
    """Generate a unique reference ID for transactions."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_part = secrets.token_hex(4).upper()
    return f"{prefix}_{timestamp}_{random_part}"


def generate_gateway_id(prefix: str = "pay") -> str:
    """Generate a gateway-style ID."""
    return f"{prefix}_{secrets.token_hex(12)}"


def format_amount(amount: Decimal, currency: str = "INR") -> str:
    """Format amount for display."""
    if currency == "INR":
        # Indian number formatting (lakhs, crores)
        amount_str = f"{amount:,.2f}"
        return f"₹{amount_str}"
    return f"{amount:,.2f}"


def format_phone(phone: str) -> str:
    """Format phone number for display."""
    # Remove +91 prefix for display if present
    if phone.startswith("+91"):
        phone = phone[3:]
    # Format as XXX-XXX-XXXX
    if len(phone) == 10:
        return f"{phone[:3]}-{phone[3:6]}-{phone[6:]}"
    return phone


def mask_phone(phone: str) -> str:
    """Mask phone number for privacy."""
    if phone.startswith("+91"):
        phone = phone[3:]
    if len(phone) >= 10:
        return f"{phone[:3]}****{phone[-3:]}"
    return phone


def mask_upi(upi_id: str) -> str:
    """Mask UPI ID for privacy."""
    if "@" in upi_id:
        parts = upi_id.split("@")
        if len(parts[0]) > 3:
            masked = parts[0][:3] + "***"
        else:
            masked = parts[0]
        return f"{masked}@{parts[1]}"
    return upi_id


def mask_account(account: str) -> str:
    """Mask bank account number for privacy."""
    if len(account) > 4:
        return "X" * (len(account) - 4) + account[-4:]
    return account


def normalize_phone(phone: str) -> str:
    """Normalize phone number to +91XXXXXXXXXX format."""
    # Remove all non-digit characters
    digits = re.sub(r"\D", "", phone)

    # Handle different formats
    if len(digits) == 10:
        return f"+91{digits}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    elif len(digits) == 13 and digits.startswith("091"):
        return f"+91{digits[3:]}"

    return phone


def calculate_pages(total: int, page_size: int) -> int:
    """Calculate total pages for pagination."""
    if page_size <= 0:
        return 0
    return (total + page_size - 1) // page_size


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage."""
    # Remove or replace unsafe characters
    safe_chars = string.ascii_letters + string.digits + ".-_"
    return "".join(c if c in safe_chars else "_" for c in filename)


def truncate_string(s: str, max_length: int, suffix: str = "...") -> str:
    """Truncate string with suffix if too long."""
    if len(s) <= max_length:
        return s
    return s[:max_length - len(suffix)] + suffix
