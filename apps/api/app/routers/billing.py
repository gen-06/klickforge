"""Billing endpoints: Paddle Checkout, subscriptions, and webhooks."""

import json
import logging
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from paddle_billing.Notifications import Secret, Verifier
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import SessionLocal, get_db
from app.middleware.rate_limit import get_client_ip
from app.models import CreditPurchase, Customer, Subscription, User
from app.services.paddle_client import paddle
from app.services.paddle_webhook_security import is_paddle_ip
from app.schemas import CreditPackOut
from app.services.credits import credits_for_price_id
from app.services.subscriptions import (
    get_active_subscription,
    maybe_grant_subscription_credits,
    subscription_tier,
)

logger = logging.getLogger("clipforge.billing")
router = APIRouter()

# One-time credit top-up packs. Create these in Paddle and set the env vars.
CREDIT_PACKS = [
    {"price_id_key": "PADDLE_PRICE_CREDITS_SMALL", "credits": 500, "label": "500 credits"},
    {"price_id_key": "PADDLE_PRICE_CREDITS_MEDIUM", "credits": 2_000, "label": "2,000 credits"},
    {"price_id_key": "PADDLE_PRICE_CREDITS_LARGE", "credits": 10_000, "label": "10,000 credits"},
]


@router.get("/credits/packs", response_model=List[CreditPackOut])
def list_credit_packs():
    """Return configured one-time credit top-up packs."""
    from app.config import settings

    packs = []
    for pack in CREDIT_PACKS:
        price_id = getattr(settings, pack["price_id_key"])
        if price_id:
            packs.append(
                {
                    "price_id": price_id,
                    "credits": pack["credits"],
                    "label": pack["label"],
                }
            )
    return packs


@router.post("/portal")
def billing_portal(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not user.customer:
        raise HTTPException(status_code=404, detail="No subscription found")

    try:
        from paddle_billing.Resources.CustomerPortalSessions.Operations.CreateCustomerPortalSession import (
            CreateCustomerPortalSession,
        )

        session = paddle.customer_portal_sessions.create(
            user.customer.customer_id,
            CreateCustomerPortalSession(),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Portal session failed: {exc}")

    return {"url": session.urls.general.overview}


@router.get("/subscription")
def billing_subscription(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sub = get_active_subscription(db, user)
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found")

    tier = subscription_tier(sub)
    plan_name = {"starter": "Starter", "pro": "Pro", "advanced": "Advanced"}.get(tier, tier)

    return {
        "subscription_id": sub.subscription_id,
        "status": sub.status,
        "tier": tier,
        "plan_name": plan_name,
        "next_billed_at": sub.next_billed_at,
        "scheduled_change_action": sub.scheduled_change_action,
        "scheduled_change_at": sub.scheduled_change_at,
    }


def _parse_datetime(value):
    if not value:
        return None
    dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return dt.replace(tzinfo=None)


def _get_nested(obj, *keys, default=None):
    for key in keys:
        if obj is None:
            return default
        if isinstance(obj, dict):
            obj = obj.get(key, default)
        else:
            obj = getattr(obj, key, default)
    return obj


def _ensure_customer(db: Session, customer_id: str, email: str) -> Customer:
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if customer:
        return customer

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            clerk_id=f"paddle_placeholder_{uuid.uuid4()}",
            email=email,
            plan="free",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    customer = Customer(
        customer_id=customer_id,
        user_id=user.id,
        email=email,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def _handle_customer_event(db: Session, data):
    customer_id = _get_nested(data, "id")
    email = _get_nested(data, "email")
    if not customer_id or not email:
        return

    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if customer:
        customer.email = email
        db.commit()
        return

    _ensure_customer(db, customer_id, email)


def _subscription_price_and_product(data):
    items = _get_nested(data, "items", default=[])
    if not items:
        return None, None
    first = items[0]
    price = _get_nested(first, "price")
    if price:
        price_id = _get_nested(price, "id")
        product_id = _get_nested(price, "product_id")
        return price_id, product_id
    return _get_nested(first, "price_id"), _get_nested(first, "product_id")


def _handle_subscription_event(db: Session, data):
    subscription_id = _get_nested(data, "id")
    customer_id = _get_nested(data, "customer_id")
    status = _get_nested(data, "status")
    price_id, product_id = _subscription_price_and_product(data)
    next_billed_at = _parse_datetime(_get_nested(data, "next_billed_at"))
    scheduled_change = _get_nested(data, "scheduled_change")
    scheduled_action = _get_nested(scheduled_change, "action")
    scheduled_at = _parse_datetime(_get_nested(scheduled_change, "effective_at"))

    if not subscription_id or not customer_id:
        return

    subscription = db.query(Subscription).filter(Subscription.subscription_id == subscription_id).first()
    if subscription:
        subscription.customer_id = customer_id
        subscription.status = status
        if price_id:
            subscription.price_id = price_id
        if product_id:
            subscription.product_id = product_id
        subscription.next_billed_at = next_billed_at
        subscription.scheduled_change_action = scheduled_action
        subscription.scheduled_change_at = scheduled_at
    else:
        subscription = Subscription(
            subscription_id=subscription_id,
            customer_id=customer_id,
            status=status,
            price_id=price_id or "",
            product_id=product_id or "",
            next_billed_at=next_billed_at,
            scheduled_change_action=scheduled_action,
            scheduled_change_at= scheduled_at,
        )
        db.add(subscription)
    db.commit()

    # Grant credits for active/trialing subscriptions (initial or renewal).
    maybe_grant_subscription_credits(db, subscription)


def _handle_transaction_completed(db: Session, data):
    """Grant one-time credits for credit-pack purchases."""
    transaction_id = _get_nested(data, "id")
    customer_id = _get_nested(data, "customer_id")
    items = _get_nested(data, "items", default=[])

    if not transaction_id or not customer_id or not items:
        return

    # Avoid double-granting credits for the same transaction.
    existing = db.query(CreditPurchase).filter(CreditPurchase.transaction_id == transaction_id).first()
    if existing:
        return

    first_item = items[0]
    price_id = _get_nested(first_item, "price", "id") or _get_nested(first_item, "price_id")
    credits = credits_for_price_id(price_id)
    if credits <= 0:
        return

    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        return

    user = db.query(User).filter(User.id == customer.user_id).first()
    if not user:
        return

    # Atomic increment: avoids a lost update if another credit grant lands
    # for the same user at the same time (e.g. a subscription renewal).
    db.execute(
        update(User).where(User.id == user.id).values(credits_balance=User.credits_balance + credits)
    )
    purchase = CreditPurchase(
        transaction_id=transaction_id,
        customer_id=customer_id,
        price_id=price_id,
        credits=credits,
    )
    db.add(purchase)
    db.commit()


class _WebhookRequest:
    def __init__(self, body: bytes, signature: str):
        self.body = body
        self.content = body
        self.data = body
        self.headers = {"Paddle-Signature": signature}


@router.post("/webhook")
async def paddle_webhook(request: Request):
    client_ip = get_client_ip(request)
    allowed = is_paddle_ip(client_ip)
    logger.warning(
        f"paddle_webhook.ip_check client_ip={client_ip} xff={request.headers.get('x-forwarded-for')} "
        f"cf_connecting_ip={request.headers.get('cf-connecting-ip')} allowed={allowed}"
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Source IP is not a recognized Paddle IP")

    raw_body = await request.body()
    signature_header = request.headers.get("paddle-signature", "")

    if not settings.PADDLE_WEBHOOK_SECRET:
        raise HTTPException(status_code=400, detail="Paddle webhook secret is not configured")

    # Allow up to 60s variance to account for tunnel/network delays in sandbox.
    verifier = Verifier(maximum_variance=60)
    verified = verifier.verify(
        _WebhookRequest(raw_body, signature_header),
        Secret(settings.PADDLE_WEBHOOK_SECRET),
    )
    if not verified:
        raise HTTPException(status_code=400, detail="Paddle signature verification failed")

    try:
        event = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}")

    event_type = event.get("event_type")
    data = event.get("data", {})

    # The handlers below do synchronous SQLAlchemy I/O (network round-trips to
    # Postgres). Running them inline on the event loop blocks it for the
    # duration of every webhook, which serializes concurrent deliveries —
    # Paddle commonly fires several related events (e.g. subscription.updated
    # + subscription.canceled) within the same millisecond, and the second
    # one can time out waiting for the first to finish. Offload to a thread
    # so concurrent deliveries are actually handled concurrently.
    try:
        await run_in_threadpool(_process_webhook_event, event_type, data)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {exc}")

    return {"status": "ok"}


def _process_webhook_event(event_type: str, data: dict):
    db = SessionLocal()
    try:
        if event_type in ("customer.created", "customer.updated"):
            _handle_customer_event(db, data)
        elif event_type in ("subscription.created", "subscription.updated", "subscription.canceled"):
            _handle_subscription_event(db, data)
        elif event_type == "transaction.completed":
            _handle_transaction_completed(db, data)
    finally:
        db.close()
