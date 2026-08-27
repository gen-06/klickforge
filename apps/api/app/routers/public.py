"""Public endpoints that do not require authentication."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Clip, ClipStatus, Video

router = APIRouter()


def _clip_to_dict(clip: Clip) -> dict:
    return {
        "id": str(clip.id),
        "start_time": clip.start_time,
        "end_time": clip.end_time,
        "duration": clip.end_time - clip.start_time,
        "output_url": clip.output_url,
        "score": clip.score,
        "title": clip.video.title if clip.video else None,
        "view_count": clip.view_count,
        "download_count": clip.download_count,
    }


@router.get("/demo-clips")
def demo_clips(limit: int = 3, db: Session = Depends(get_db)):
    """Return a small set of finished clips for the landing page demo."""
    clips = (
        db.query(Clip)
        .join(Video)
        .filter(Clip.status == ClipStatus.DONE, Clip.output_url.isnot(None))
        .order_by(Clip.score.desc().nullslast(), Clip.created_at.desc())
        .limit(limit)
        .all()
    )

    return {"clips": [_clip_to_dict(clip) for clip in clips]}


@router.get("/clips/{clip_id}")
def public_clip(clip_id: str, db: Session = Depends(get_db)):
    """Return a single finished clip for public sharing."""
    clip = (
        db.query(Clip)
        .join(Video)
        .filter(Clip.id == clip_id, Clip.status == ClipStatus.DONE, Clip.output_url.isnot(None))
        .first()
    )
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    return {"clip": _clip_to_dict(clip)}
