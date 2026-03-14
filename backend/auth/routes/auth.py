"""Authentication routes for OTP and JWT management."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from shared.config import settings
from shared.database import get_db, Merchant, OTP, RefreshToken
from shared.schemas.auth import (
    OTPSendRequest,
    OTPSendResponse,
    OTPVerifyRequest,
    TokenResponse,
    RefreshTokenRequest,
    MerchantProfile,
    MerchantProfileUpdate,
    SetPinRequest,
    VerifyPinRequest,
    DeviceInfo,
)
from shared.schemas.common import MessageResponse
from shared.utils.security import generate_otp, hash_otp, verify_otp, hash_password, verify_password

from ..services.jwt import create_access_token, create_refresh_token, decode_token, get_current_merchant_id
from ..services.otp import send_otp_sms

router = APIRouter()


@router.post("/otp/send", response_model=OTPSendResponse)
async def send_otp(
    request: OTPSendRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Send OTP to phone number for authentication.
    Creates a new merchant account if phone doesn't exist.
    """
    phone = request.phone

    # Check for rate limiting (max 3 OTPs per 10 minutes)
    ten_minutes_ago = datetime.utcnow() - timedelta(minutes=10)
    recent_otps = await db.execute(
        select(OTP).where(
            and_(
                OTP.phone == phone,
                OTP.created_at > ten_minutes_ago,
            )
        )
    )
    if len(recent_otps.scalars().all()) >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many OTP requests. Please try again later.",
        )

    # Generate OTP
    otp = generate_otp(settings.otp_length)
    otp_hashed = hash_otp(otp)
    expires_at = datetime.utcnow() + timedelta(seconds=settings.otp_expiry_seconds)

    # Store OTP
    otp_record = OTP(
        phone=phone,
        otp_hash=otp_hashed,
        expires_at=expires_at,
    )
    db.add(otp_record)
    await db.flush()

    # Send OTP via SMS (mock in development)
    await send_otp_sms(phone, otp)

    return OTPSendResponse(
        phone=phone,
        expires_in=settings.otp_expiry_seconds,
    )


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp_endpoint(
    request: OTPVerifyRequest,
    device_info: Optional[DeviceInfo] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify OTP and return JWT tokens.
    Creates a new merchant if this is their first login.
    """
    phone = request.phone
    otp = request.otp

    # Find valid OTP
    result = await db.execute(
        select(OTP).where(
            and_(
                OTP.phone == phone,
                OTP.is_verified == False,
                OTP.expires_at > datetime.utcnow(),
            )
        ).order_by(OTP.created_at.desc())
    )
    otp_record = result.scalars().first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    # Check attempts
    if otp_record.attempts >= settings.otp_max_attempts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum OTP attempts exceeded. Please request a new OTP.",
        )

    # Verify OTP
    if not verify_otp(otp, otp_record.otp_hash):
        otp_record.attempts += 1
        await db.flush()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP",
        )

    # Mark OTP as verified
    otp_record.is_verified = True
    await db.flush()

    # Get or create merchant
    result = await db.execute(
        select(Merchant).where(Merchant.phone == phone)
    )
    merchant = result.scalars().first()

    if not merchant:
        # Create new merchant
        merchant = Merchant(phone=phone)
        db.add(merchant)
        await db.flush()

    # Generate tokens
    access_token = create_access_token(merchant.id)
    refresh_token = create_refresh_token(merchant.id)

    # Store refresh token
    refresh_token_record = RefreshToken(
        merchant_id=merchant.id,
        token_hash=hash_otp(refresh_token),  # Using same hash function
        device_info=device_info.model_dump() if device_info else None,
        expires_at=datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days),
    )
    db.add(refresh_token_record)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token."""
    try:
        payload = decode_token(request.refresh_token)
        merchant_id = UUID(payload["sub"])
        token_type = payload.get("type")

        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type",
            )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Verify refresh token exists and is not revoked
    token_hash = hash_otp(request.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            and_(
                RefreshToken.merchant_id == merchant_id,
                RefreshToken.token_hash == token_hash,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.utcnow(),
            )
        )
    )
    refresh_token_record = result.scalars().first()

    if not refresh_token_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
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
        )

    # Generate new access token
    access_token = create_access_token(merchant.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=request.refresh_token,  # Return same refresh token
        expires_in=settings.jwt_access_token_expire_minutes * 60,
    )


@router.get("/me", response_model=MerchantProfile)
async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated merchant profile."""
    merchant_id = await get_current_merchant_id(authorization, db)

    result = await db.execute(
        select(Merchant).where(Merchant.id == merchant_id)
    )
    merchant = result.scalars().first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found",
        )

    return MerchantProfile.model_validate(merchant)


@router.put("/me", response_model=MerchantProfile)
async def update_profile(
    request: MerchantProfileUpdate,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Update current merchant profile."""
    merchant_id = await get_current_merchant_id(authorization, db)

    result = await db.execute(
        select(Merchant).where(Merchant.id == merchant_id)
    )
    merchant = result.scalars().first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found",
        )

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(merchant, field, value)

    await db.flush()

    return MerchantProfile.model_validate(merchant)


@router.post("/pin/set", response_model=MessageResponse)
async def set_transaction_pin(
    request: SetPinRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Set transaction PIN for the merchant."""
    merchant_id = await get_current_merchant_id(authorization, db)

    result = await db.execute(
        select(Merchant).where(Merchant.id == merchant_id)
    )
    merchant = result.scalars().first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found",
        )

    # Hash and store PIN
    merchant.pin_hash = hash_password(request.pin)

    return MessageResponse(message="PIN set successfully")


@router.post("/pin/verify", response_model=MessageResponse)
async def verify_transaction_pin(
    request: VerifyPinRequest,
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Verify transaction PIN."""
    merchant_id = await get_current_merchant_id(authorization, db)

    result = await db.execute(
        select(Merchant).where(Merchant.id == merchant_id)
    )
    merchant = result.scalars().first()

    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant not found",
        )

    if not merchant.pin_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN not set",
        )

    if not verify_password(request.pin, merchant.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN",
        )

    return MessageResponse(message="PIN verified successfully")


@router.post("/logout", response_model=MessageResponse)
async def logout(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db),
):
    """Logout and revoke current refresh token."""
    merchant_id = await get_current_merchant_id(authorization, db)

    # Revoke all refresh tokens for this merchant
    result = await db.execute(
        select(RefreshToken).where(
            and_(
                RefreshToken.merchant_id == merchant_id,
                RefreshToken.is_revoked == False,
            )
        )
    )
    tokens = result.scalars().all()

    for token in tokens:
        token.is_revoked = True

    return MessageResponse(message="Logged out successfully")
