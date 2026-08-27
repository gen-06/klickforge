"""One-time credit top-up helpers."""

from app.config import settings

# Map credit pack price IDs to the number of credits granted.
# These prices must be created in Paddle and set via env vars.
CREDITS_BY_PRICE_ID: dict[str, int] = {}


def _build_credit_map() -> dict[str, int]:
    mapping: dict[str, int] = {}
    packs = [
        (settings.PADDLE_PRICE_CREDITS_SMALL, 500),
        (settings.PADDLE_PRICE_CREDITS_MEDIUM, 2_000),
        (settings.PADDLE_PRICE_CREDITS_LARGE, 10_000),
    ]
    for price_id, credits in packs:
        if price_id:
            mapping[price_id] = credits
    return mapping


def credits_for_price_id(price_id: str | None) -> int:
    """Return credits granted for a credit-pack price ID, or 0 if unknown."""
    if not price_id:
        return 0
    return _build_credit_map().get(price_id, 0)


def is_credit_price_id(price_id: str | None) -> bool:
    """Return True if the price ID belongs to a credit top-up pack."""
    return credits_for_price_id(price_id) > 0
