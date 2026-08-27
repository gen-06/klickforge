"""Public waitlist endpoint for pre-launch signups."""

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import User, Waitlist

router = APIRouter()

_EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


class WaitlistSignup(BaseModel):
    email: str
    source: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not _EMAIL_RE.match(value):
            raise ValueError("Invalid email address")
        return value


@router.post("")
def signup(payload: WaitlistSignup, db: Session = Depends(get_db)):
    existing = db.query(Waitlist).filter(Waitlist.email == payload.email).first()
    if existing:
        return {"status": "already_registered", "email": payload.email}

    entry = Waitlist(email=payload.email, source=payload.source or "landing")
    db.add(entry)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"status": "already_registered", "email": payload.email}

    db.refresh(entry)
    return {"status": "registered", "email": payload.email}


def _require_admin(user: User):
    admin_emails = {email.strip().lower() for email in settings.ADMIN_EMAILS if email.strip()}
    if not admin_emails or user.email.lower() not in admin_emails:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("")
def export_waitlist(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    entries = db.query(Waitlist).order_by(Waitlist.created_at.desc()).all()
    return {
        "count": len(entries),
        "emails": [
            {
                "email": entry.email,
                "source": entry.source,
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
            }
            for entry in entries
        ],
    }
