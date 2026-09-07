from typing import List, Optional

from paddle_billing import Environment
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/youtubers"
    REDIS_URL: str = "redis://localhost:6379/0"
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Clerk auth
    CLERK_SECRET_KEY: Optional[str] = None
    CLERK_PUBLISHABLE_KEY: Optional[str] = None
    CLERK_ISSUER: Optional[str] = None
    CLERK_VERIFY_TOKENS: bool = True

    # Admin access: comma-separated list of emails allowed to view waitlist/export data.
    # Plain string (not List[str]) because pydantic-settings parses List-typed env
    # vars as JSON, which is awkward to hand-enter in a hosting dashboard like Railway.
    ADMIN_EMAILS: str = ""

    @property
    def admin_email_list(self) -> List[str]:
        return [e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()]

    # AI / subtitles
    OPENAI_API_KEY: Optional[str] = None

    # Paddle billing
    PADDLE_SANDBOX_API_KEY: Optional[str] = None
    PADDLE_LIVE_API_KEY: Optional[str] = None
    PADDLE_WEBHOOK_SECRET: Optional[str] = None
    PADDLE_ENV: str = "sandbox"
    PADDLE_PRICE_STARTER_MONTH: Optional[str] = None
    PADDLE_PRICE_STARTER_YEAR: Optional[str] = None
    PADDLE_PRICE_PRO_MONTH: Optional[str] = None
    PADDLE_PRICE_PRO_YEAR: Optional[str] = None
    PADDLE_PRICE_ADVANCED_MONTH: Optional[str] = None
    PADDLE_PRICE_ADVANCED_YEAR: Optional[str] = None

    # One-time credit top-up packs (optional but recommended).
    PADDLE_PRICE_CREDITS_SMALL: Optional[str] = None
    PADDLE_PRICE_CREDITS_MEDIUM: Optional[str] = None
    PADDLE_PRICE_CREDITS_LARGE: Optional[str] = None

    @property
    def paddle_api_key(self) -> Optional[str]:
        return self.PADDLE_SANDBOX_API_KEY if self.PADDLE_ENV == "sandbox" else self.PADDLE_LIVE_API_KEY

    @property
    def paddle_environment(self) -> Environment:
        return Environment.SANDBOX if self.PADDLE_ENV == "sandbox" else Environment.LIVE

    # Deployment
    ENVIRONMENT: str = "development"

    # Monitoring
    SENTRY_DSN: Optional[str] = None

    # Object storage (S3-compatible)
    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_INTERNAL_ENDPOINT: str = "http://localhost:9000"
    STORAGE_REGION: str = "us-east-1"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET_UPLOADS: str = "uploads"
    STORAGE_BUCKET_CLIPS: str = "clips"
    STORAGE_PUBLIC_URL: str = "http://localhost:9000"
    STORAGE_USE_SSL: bool = False

    # Processing
    MAX_UPLOAD_SIZE_MB: int = 2048
    CLIP_MIN_DURATION_SECONDS: int = 30
    CLIP_MAX_DURATION_SECONDS: int = 90
    CLIP_TARGET_COUNT: int = 5

    class Config:
        env_file = ".env"


def validate_settings():
    """Fail loudly if required configuration is missing."""
    missing = []

    if not settings.DATABASE_URL:
        missing.append("DATABASE_URL")
    if not settings.REDIS_URL:
        missing.append("REDIS_URL")
    if not settings.CLERK_PUBLISHABLE_KEY:
        missing.append("CLERK_PUBLISHABLE_KEY")
    if not settings.OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")

    if settings.PADDLE_ENV not in ("sandbox", "live"):
        missing.append("PADDLE_ENV must be 'sandbox' or 'live'")
    if not settings.paddle_api_key:
        missing.append(
            f"PADDLE_{settings.PADDLE_ENV.upper()}_API_KEY (for PADDLE_ENV={settings.PADDLE_ENV})"
        )
    if not settings.PADDLE_WEBHOOK_SECRET:
        missing.append("PADDLE_WEBHOOK_SECRET")

    for key in (
        "PADDLE_PRICE_STARTER_MONTH",
        "PADDLE_PRICE_STARTER_YEAR",
        "PADDLE_PRICE_PRO_MONTH",
        "PADDLE_PRICE_PRO_YEAR",
        "PADDLE_PRICE_ADVANCED_MONTH",
        "PADDLE_PRICE_ADVANCED_YEAR",
    ):
        if not getattr(settings, key):
            missing.append(key)

    # Credit top-ups are optional, but if any are configured they must all be.
    credit_price_keys = (
        "PADDLE_PRICE_CREDITS_SMALL",
        "PADDLE_PRICE_CREDITS_MEDIUM",
        "PADDLE_PRICE_CREDITS_LARGE",
    )
    configured_credits = [k for k in credit_price_keys if getattr(settings, k)]
    if configured_credits and len(configured_credits) != len(credit_price_keys):
        missing.extend([k for k in credit_price_keys if not getattr(settings, k)])

    for key in (
        "STORAGE_ENDPOINT",
        "STORAGE_INTERNAL_ENDPOINT",
        "STORAGE_REGION",
        "STORAGE_ACCESS_KEY",
        "STORAGE_SECRET_KEY",
        "STORAGE_BUCKET_UPLOADS",
        "STORAGE_BUCKET_CLIPS",
        "STORAGE_PUBLIC_URL",
    ):
        if not getattr(settings, key):
            missing.append(key)

    if missing:
        raise RuntimeError(
            "Missing required environment variables:\n  - " + "\n  - ".join(missing)
        )


settings = Settings()
