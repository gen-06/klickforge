from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Subscription, User

TIER_PRICES = {
    "starter": ["PADDLE_PRICE_STARTER_MONTH", "PADDLE_PRICE_STARTER_YEAR"],
    "pro": ["PADDLE_PRICE_PRO_MONTH", "PADDLE_PRICE_PRO_YEAR"],
    "advanced": ["PADDLE_PRICE_ADVANCED_MONTH", "PADDLE_PRICE_ADVANCED_YEAR"],
}

ACCESS_GRANTING_STATUSES = {"active", "trialing"}

# Credits granted per month for each subscription tier.
CREDITS_PER_MONTH = {
    "starter": 1_000,
    "pro": 5_000,
    "advanced": 20_000,
}

YEARLY_PRICE_IDS = {
    "PADDLE_PRICE_STARTER_YEAR",
    "PADDLE_PRICE_PRO_YEAR",
    "PADDLE_PRICE_ADVANCED_YEAR",
}


def _price_ids_for_tier(tier: str) -> set[str]:
    from app.config import settings

    keys = TIER_PRICES.get(tier, [])
    return {getattr(settings, key) for key in keys if getattr(settings, key)}


def get_active_subscription(db: Session, user: User) -> Subscription | None:
    """Return the user's subscription if it currently grants paid access."""
    if not user.customer:
        return None
    return (
        db.query(Subscription)
        .filter(
            Subscription.customer_id == user.customer.customer_id,
            Subscription.status.in_(list(ACCESS_GRANTING_STATUSES)),
        )
        .order_by(Subscription.created_at.desc())
        .first()
    )


def has_paid_access(db: Session, user: User) -> bool:
    """Return True if the user has an active or trialing subscription."""
    return get_active_subscription(db, user) is not None


def subscription_tier(sub: Subscription | None) -> str | None:
    """Map subscription price to tier name: starter/pro/advanced."""
    if sub is None:
        return None
    for tier in ("advanced", "pro", "starter"):
        if sub.price_id in _price_ids_for_tier(tier):
            return tier
    return None


def _is_yearly_price(price_id: str) -> bool:
    from app.config import settings

    return price_id in {
        settings.PADDLE_PRICE_STARTER_YEAR,
        settings.PADDLE_PRICE_PRO_YEAR,
        settings.PADDLE_PRICE_ADVANCED_YEAR,
    }


def credits_for_subscription(sub: Subscription) -> int:
    """Return the number of credits to grant for one billing period."""
    tier = subscription_tier(sub)
    if tier is None:
        return 0
    monthly = CREDITS_PER_MONTH.get(tier, 0)
    if _is_yearly_price(sub.price_id):
        return monthly * 12
    return monthly


def maybe_grant_subscription_credits(db: Session, sub: Subscription) -> int:
    """Grant credits for a new or renewed subscription. Returns credits granted."""
    if sub.status not in ACCESS_GRANTING_STATUSES:
        return 0

    credits = credits_for_subscription(sub)
    if credits <= 0:
        return 0

    # Only grant on initial activation or when the billing period advances.
    is_initial = sub.credits_granted == 0
    is_renewal = (
        sub.last_credit_grant_at is not None
        and sub.next_billed_at is not None
        and sub.next_billed_at > sub.last_credit_grant_at
    )

    if not is_initial and not is_renewal:
        return 0

    user = db.query(User).filter(User.id == sub.customer.user_id).first()
    if not user:
        return 0

    user.credits_balance += credits
    sub.credits_granted += credits
    sub.last_credit_grant_at = datetime.utcnow()
    db.commit()
    return credits
