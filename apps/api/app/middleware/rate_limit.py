"""In-memory rate limiting middleware.

This is a simple per-process rate limiter. For multi-instance deployments,
switch to a Redis-backed limiter.
"""

import logging
import time
from collections import defaultdict
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("clipforge.rate_limit")

# window_seconds -> max_requests
PublicLimit = tuple[int, int]
AuthLimit = tuple[int, int]

DEFAULT_PUBLIC_LIMIT: PublicLimit = (60, 30)  # 30 requests per minute
DEFAULT_AUTH_LIMIT: AuthLimit = (60, 120)  # 120 requests per minute


class _RateLimitStore:
    def __init__(self):
        self.buckets: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str, window: int, max_requests: int) -> bool:
        now = time.time()
        cutoff = now - window
        self.buckets[key] = [ts for ts in self.buckets[key] if ts > cutoff]

        if len(self.buckets[key]) >= max_requests:
            return False

        self.buckets[key].append(now)
        return True


_store = _RateLimitStore()


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        public_limit: PublicLimit = DEFAULT_PUBLIC_LIMIT,
        auth_limit: AuthLimit = DEFAULT_AUTH_LIMIT,
        key_func: Callable[[Request], str] | None = None,
    ):
        super().__init__(app)
        self.public_limit = public_limit
        self.auth_limit = auth_limit
        self.key_func = key_func

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        if request.method == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        is_authenticated = auth_header.startswith("Bearer ")

        if self.key_func:
            key = self.key_func(request)
        elif is_authenticated:
            key = f"auth:{hash(auth_header)}"
            window, max_requests = self.auth_limit
        else:
            key = f"ip:{_get_client_ip(request)}"
            window, max_requests = self.public_limit

        if not _store.is_allowed(key, window, max_requests):
            logger.warning("rate_limit.exceeded", extra={"key": key, "path": request.url.path})
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please slow down."},
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)
