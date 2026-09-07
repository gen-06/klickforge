"""IP allowlisting for Paddle webhook deliveries.

Defense-in-depth on top of signature verification (the actual security
boundary): reject deliveries that don't even originate from Paddle's
published IP ranges before doing any signature/body work. The list is
fetched from Paddle's own endpoint rather than hard-coded, since Paddle
says it can change.
"""

import ipaddress
import logging
import time

import httpx

logger = logging.getLogger("clipforge.paddle_webhook_security")

PADDLE_IPS_URL = "https://api.paddle.com/ips"
_CACHE_TTL_SECONDS = 3600

_cached_networks: list[ipaddress.IPv4Network] = []
_cached_at: float = 0.0


def _refresh_cache() -> None:
    global _cached_networks, _cached_at
    try:
        resp = httpx.get(PADDLE_IPS_URL, timeout=5.0)
        resp.raise_for_status()
        cidrs = resp.json()["data"]["ipv4_cidrs"]
        _cached_networks = [ipaddress.ip_network(c) for c in cidrs]
        _cached_at = time.time()
    except Exception as exc:
        # Keep serving whatever we last fetched successfully (even if
        # stale) rather than blocking all webhook delivery on a transient
        # failure of Paddle's own IP-list endpoint.
        logger.warning(
            "paddle_webhook_security.ip_refresh_failed",
            extra={"error": str(exc), "using_cached_count": len(_cached_networks)},
        )


def is_paddle_ip(client_ip: str) -> bool:
    if time.time() - _cached_at > _CACHE_TTL_SECONDS:
        _refresh_cache()

    if not _cached_networks:
        # Never successfully fetched the list (e.g. first request after
        # boot and Paddle's IP endpoint is down) — fail open and rely on
        # signature verification alone rather than rejecting all webhooks.
        logger.warning("paddle_webhook_security.no_ip_list_available")
        return True

    try:
        addr = ipaddress.ip_address(client_ip)
    except ValueError:
        return False

    return any(addr in network for network in _cached_networks)
