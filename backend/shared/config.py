"""
Configuration management for Nano services.
Uses pydantic-settings for environment variable management.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service Configuration
    service_name: str = "nano"
    service_port: int = 8000
    debug: bool = False
    environment: str = "development"

    # Database
    database_url: str = "postgresql+asyncpg://nano:nano_secret@localhost:5432/nano_db"
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # Redis
    redis_url: str = "redis://localhost:6379"
    redis_prefix: str = "nano"

    # JWT Configuration
    jwt_secret: str = "your-super-secret-jwt-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 15
    jwt_refresh_token_expire_days: int = 30

    # OTP Configuration
    otp_length: int = 6
    otp_expiry_seconds: int = 300
    otp_max_attempts: int = 3

    # Service URLs (for inter-service communication)
    auth_service_url: str = "http://localhost:8001"
    payments_service_url: str = "http://localhost:8002"
    payouts_service_url: str = "http://localhost:8003"
    store_service_url: str = "http://localhost:8004"
    payroll_service_url: str = "http://localhost:8005"
    ai_service_url: str = "http://localhost:8006"
    notifications_service_url: str = "http://localhost:8007"
    reports_service_url: str = "http://localhost:8008"

    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60

    # Mock Payment Gateway Configuration
    mock_gateway_key_id: str = "nano_test_mock123456"
    mock_gateway_key_secret: str = "mock_secret_key_12345"
    webhook_secret: str = "webhook-secret-for-payment-callbacks"

    # Payment Link Configuration
    payment_link_base_url: str = "https://nano.link"

    # Sarvam AI Configuration
    sarvam_api_key: Optional[str] = None
    sarvam_model: str = "sarvam-30b"
    sarvam_stt_model: str = "saaras:v3"
    sarvam_tts_model: str = "bulbul:v2"
    sarvam_tts_speaker: str = "meera"
    sarvam_translate_model: str = "mayura:v1"
    sarvam_base_url: str = "https://api.sarvam.ai"

    # Gemini AI Configuration (deprecated, kept for backward compat)
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-1.5-pro"

    # SMS/WhatsApp Configuration (mock for now)
    sms_provider: str = "mock"
    sms_api_key: Optional[str] = None
    whatsapp_api_key: Optional[str] = None

    # Twilio Configuration
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None

    # Google Cloud STT
    google_cloud_stt_key: Optional[str] = None

    # Whisper API
    whisper_api_key: Optional[str] = None

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8080", "http://localhost:19006"]

    def validate_production_settings(self) -> None:
        """Validate critical settings for production deployment."""
        if self.environment == "production":
            if "change-in-production" in self.jwt_secret:
                raise ValueError("JWT_SECRET must be changed for production deployment!")
            if self.debug:
                raise ValueError("DEBUG must be False in production!")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience access
settings = get_settings()
