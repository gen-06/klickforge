from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings, validate_settings
from app.database import engine
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.models import Base
from app.routers import billing, clips, jobs, public, users, videos, waitlist
from app.services.health import run_health_checks
from app.services.storage import StorageService
from app.worker import tasks  # noqa: F401


if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_settings()
    if settings.ENVIRONMENT != "production":
        Base.metadata.create_all(bind=engine)
    StorageService().ensure_buckets()
    yield


app = FastAPI(title="Youtubers Short-Form API", lifespan=lifespan)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router, prefix="/api/v1/videos", tags=["videos"])
app.include_router(clips.router, prefix="/api/v1/clips", tags=["clips"])
app.include_router(jobs.router, prefix="/api/v1/jobs", tags=["jobs"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["billing"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(waitlist.router, prefix="/api/v1/waitlist", tags=["waitlist"])
app.include_router(public.router, prefix="/api/v1/public", tags=["public"])


@app.get("/health")
def health():
    result = run_health_checks()
    status_code = 200 if result["status"] == "healthy" else 503
    from fastapi.responses import JSONResponse

    return JSONResponse(content=result, status_code=status_code)
