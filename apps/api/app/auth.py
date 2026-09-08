import base64
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request
from jose import jwt
from jose.exceptions import JWTError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User


def _get_issuer_from_publishable_key(key: str) -> str:
    # pk_<env>_<base64domain> -> decode domain
    parts = key.split("_")
    if len(parts) < 3:
        raise ValueError("Invalid Clerk publishable key format")
    domain = base64.urlsafe_b64decode(parts[2] + "==").decode("utf-8").rstrip("$")
    return f"https://{domain}"


def _get_clerk_issuer() -> str:
    if hasattr(settings, "CLERK_ISSUER") and settings.CLERK_ISSUER:
        return settings.CLERK_ISSUER
    if not settings.CLERK_PUBLISHABLE_KEY:
        raise ValueError("CLERK_PUBLISHABLE_KEY or CLERK_ISSUER must be set")
    return _get_issuer_from_publishable_key(settings.CLERK_PUBLISHABLE_KEY)


async def verify_clerk_token(token: str) -> dict:
    issuer = _get_clerk_issuer()
    jwks_url = f"{issuer}/.well-known/jwks.json"

    async with httpx.AsyncClient() as client:
        resp = await client.get(jwks_url)
        resp.raise_for_status()
        jwks = resp.json()

    unverified = jwt.get_unverified_header(token)
    kid = unverified.get("kid")
    if not kid:
        raise JWTError("No kid in token header")

    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        raise JWTError("Signing key not found")

    return jwt.decode(
        token,
        key,
        algorithms=["RS256"],
        issuer=issuer,
        audience=settings.CLERK_PUBLISHABLE_KEY if settings.CLERK_PUBLISHABLE_KEY else None,
        options={"verify_aud": bool(settings.CLERK_PUBLISHABLE_KEY)},
    )


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    # Demo mode is only allowed when token verification is explicitly disabled.
    if not settings.CLERK_VERIFY_TOKENS:
        user = db.query(User).filter(User.email == "demo@example.com").first()
        if not user:
            user = User(clerk_id="demo", email="demo@example.com", plan="free")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split(" ", 1)[1]
    try:
        claims = await verify_clerk_token(token)
    except JWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

    clerk_id = claims.get("sub")
    email = claims.get("email", "")
    if not clerk_id:
        raise HTTPException(status_code=401, detail="Invalid token claims")

    user = db.query(User).filter(User.clerk_id == clerk_id).first()
    if not user:
        user = User(clerk_id=clerk_id, email=email, plan="free")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    admin_emails = set(settings.admin_email_list)
    if not admin_emails or user.email.lower() not in admin_emails:
        raise HTTPException(status_code=403, detail="Forbidden")
    return user
