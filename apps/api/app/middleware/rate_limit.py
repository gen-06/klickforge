"""In-memory rate limiting middleware.

This is a simple per-process rate limiter. For multi-instance deployments,
switch to a Redis-backed limiter.
"""

import logging
import time
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

# Any key untouched for longer than this is considered stale and dropped by
# the periodic sweep, regardless of which window it was last checked with.
_STALE_AFTER_SECONDS = 3600
_SWEEP_INTERVAL_SECONDS = 300


class _RateLimitStore:
    def __init__(self):
        self.buckets: dict[str, list[float]] = {}
        self._last_swept = time.time()

    def is_allowed(self, key: str, window: int, max_requests: int) -> bool:
        now = time.time()
        cutoff = now - window
        bucket = [ts for ts in self.buckets.get(key, []) if ts > cutoff]

        allowed = len(bucket) < max_requests
        if allowed:
            bucket.append(now)
        self.buckets[key] = bucket

        if now - self._last_swept > _SWEEP_INTERVAL_SECONDS:
            self._sweep(now)

        return allowed

    def _sweep(self, now: float) -> None:
        """Drop keys with no requests in the last hour, so tokens/IPs that
        are never seen again don't accumulate in memory forever."""
        cutoff = now - _STALE_AFTER_SECONDS
        stale_keys = [k for k, ts_list in self.buckets.items() if not any(ts > cutoff for ts in ts_list)]
        for k in stale_keys:
            del self.buckets[k]
        self._last_swept = now


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
        window, max_requests = self.auth_limit if is_authenticated else self.public_limit

        if self.key_func:
            key = self.key_func(request)
        elif is_authenticated:
            key = f"auth:{hash(auth_header)}"
        else:
            key = f"ip:{_get_client_ip(request)}"

        if not _store.is_allowed(key, window, max_requests):
            logger.warning("rate_limit.exceeded", extra={"key": key, "path": request.url.path})
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please slow down."},
                headers={"Retry-After": str(window)},
            )

        return await call_next(request)
