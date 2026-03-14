"""Security utilities for authentication and encryption."""

import secrets
import hashlib
from typing import Tuple

from passlib.context import CryptContext

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def generate_otp(length: int = 6) -> str:
    """Generate a random numeric OTP."""
    # Use secrets for cryptographically secure random numbers
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def hash_otp(otp: str) -> str:
    """Hash OTP using SHA256 for storage."""
    return hashlib.sha256(otp.encode()).hexdigest()


def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
    """Verify OTP against its hash."""
    return hash_otp(plain_otp) == hashed_otp


def generate_token(length: int = 32) -> str:
    """Generate a secure random token."""
    return secrets.token_urlsafe(length)


def generate_api_key() -> Tuple[str, str]:
    """Generate an API key pair (key_id, key_secret)."""
    key_id = f"rzpn_{secrets.token_hex(8)}"
    key_secret = secrets.token_urlsafe(32)
    return key_id, key_secret
