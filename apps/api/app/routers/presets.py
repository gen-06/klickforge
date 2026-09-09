from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import CaptionPreset, User
from app.schemas import CaptionPresetIn, CaptionPresetOut, CaptionPresetUpdate

router = APIRouter()


@router.get("", response_model=List[CaptionPresetOut])
def list_presets(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(CaptionPreset)
        .filter(CaptionPreset.user_id == user.id)
        .order_by(CaptionPreset.created_at.desc())
        .all()
    )


def _clear_other_defaults(db: Session, user_id, exclude_id=None):
    query = db.query(CaptionPreset).filter(
        CaptionPreset.user_id == user_id, CaptionPreset.is_default.is_(True)
    )
    if exclude_id is not None:
        query = query.filter(CaptionPreset.id != exclude_id)
    query.update({"is_default": False})


@router.post("", response_model=CaptionPresetOut)
def create_preset(
    payload: CaptionPresetIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.is_default:
        _clear_other_defaults(db, user.id)

    preset = CaptionPreset(user_id=user.id, **payload.model_dump())
    db.add(preset)
    db.commit()
    db.refresh(preset)
    return preset


@router.patch("/{preset_id}", response_model=CaptionPresetOut)
def update_preset(
    preset_id: UUID,
    payload: CaptionPresetUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    preset = (
        db.query(CaptionPreset)
        .filter(CaptionPreset.id == preset_id, CaptionPreset.user_id == user.id)
        .first()
    )
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("is_default") is True:
        _clear_other_defaults(db, user.id, exclude_id=preset.id)

    for key, value in updates.items():
        setattr(preset, key, value)

    db.commit()
    db.refresh(preset)
    return preset


@router.delete("/{preset_id}", status_code=204)
def delete_preset(
    preset_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    preset = (
        db.query(CaptionPreset)
        .filter(CaptionPreset.id == preset_id, CaptionPreset.user_id == user.id)
        .first()
    )
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    db.delete(preset)
    db.commit()
