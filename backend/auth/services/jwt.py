"""JWT token management service."""

from datetime import datetime, timedelta
from typing import Any, Dict
from uuid import UUID

from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import Merchant


def create_access_token(merchant_id: UUID, extra_claims: Dict[str, Any] = None) -> str:
    """Create a JWT access token."""
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)

    payload = {
        "sub": str(merchant_id),
        "type": "access",
        "exp": expire,
        "iat": datetime.utcnow(),
    }

    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(merchant_id: UUID) -> str:
    """Create a JWT refresh token."""
    expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)

    payload = {
        "sub": str(merchant_id),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.utcnow(),
    }

    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_merchant_id(authorization: str, db: AsyncSession) -> UUID:
    """
    Extract and validate merchant ID from authorization header.
    Returns the merchant ID if valid.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization[7:]  # Remove "Bearer " prefix

    try:
        payload = decode_token(token)
        merchant_id = UUID(payload["sub"])
        token_type = payload.get("type")

        if token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify merchant exists and is active
    result = await db.execute(
        select(Merchant).where(
            and_(
                Merchant.id == merchant_id,
                Merchant.is_active == True,
            )
        )
    )
    merchant = result.scalars().first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found or deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return merchant_id


def create_internal_token(service_name: str) -> str:
    """Create an internal service-to-service token."""
    expire = datetime.utcnow() + timedelta(minutes=5)

    payload = {
        "sub": service_name,
        "type": "internal",
        "exp": expire,
        "iat": datetime.utcnow(),
    }

    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_internal_token(token: str) -> str:
    """Verify an internal service token and return the service name."""
    try:
        payload = decode_token(token)

        if payload.get("type") != "internal":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid internal token",
            )

        return payload["sub"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal token",
        )
