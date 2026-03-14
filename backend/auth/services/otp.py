"""OTP service for sending SMS."""

import logging
from typing import Optional

from shared.config import settings

logger = logging.getLogger(__name__)


async def send_otp_sms(phone: str, otp: str) -> bool:
    """
    Send OTP via SMS.
    In development mode, logs the OTP instead of actually sending.
    """
    if settings.environment == "development" or settings.sms_provider == "mock":
        # Mock SMS sending in development
        logger.info(f"[MOCK SMS] OTP for {phone}: {otp}")
        print(f"\n{'='*50}")
        print(f"📱 OTP for {phone}: {otp}")
        print(f"{'='*50}\n")
        return True

    # In production, integrate with actual SMS provider
    # Example providers: Twilio, MSG91, Gupshup
    try:
        if settings.sms_provider == "msg91":
            return await _send_via_msg91(phone, otp)
        elif settings.sms_provider == "twilio":
            return await _send_via_twilio(phone, otp)
        else:
            logger.warning(f"Unknown SMS provider: {settings.sms_provider}")
            return False
    except Exception as e:
        logger.error(f"Failed to send OTP to {phone}: {e}")
        return False


async def _send_via_msg91(phone: str, otp: str) -> bool:
    """Send OTP via MSG91 (popular in India)."""
    import httpx

    if not settings.sms_api_key:
        logger.error("MSG91 API key not configured")
        return False

    # MSG91 API integration would go here
    # This is a placeholder for the actual implementation
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.msg91.com/api/v5/otp",
            headers={"authkey": settings.sms_api_key},
            json={
                "mobile": phone.replace("+", ""),
                "otp": otp,
                "template_id": "nano_otp",
            },
        )
        return response.status_code == 200


async def _send_via_twilio(phone: str, otp: str) -> bool:
    """Send OTP via Twilio."""
    import httpx
    import base64

    if not settings.sms_api_key:
        logger.error("Twilio credentials not configured")
        return False

    # Parse account_sid:auth_token from api_key
    parts = settings.sms_api_key.split(":")
    if len(parts) != 2:
        logger.error("Invalid Twilio credentials format")
        return False

    account_sid, auth_token = parts

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json",
            auth=(account_sid, auth_token),
            data={
                "From": "+15551234567",  # Configure your Twilio number
                "To": phone,
                "Body": f"Your Nano OTP is: {otp}. Valid for 5 minutes.",
            },
        )
        return response.status_code == 201


async def send_payment_notification(phone: str, amount: str, merchant_name: str) -> bool:
    """Send payment confirmation SMS."""
    message = f"Payment of {amount} received from {merchant_name} via Nano."

    if settings.environment == "development" or settings.sms_provider == "mock":
        logger.info(f"[MOCK SMS] Payment notification to {phone}: {message}")
        return True

    # In production, use actual SMS provider
    return False


async def send_payout_notification(phone: str, amount: str, to_name: str) -> bool:
    """Send payout confirmation SMS."""
    message = f"Payout of {amount} sent to {to_name} via Nano."

    if settings.environment == "development" or settings.sms_provider == "mock":
        logger.info(f"[MOCK SMS] Payout notification to {phone}: {message}")
        return True

    return False
