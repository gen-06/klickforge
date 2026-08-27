"""User endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Job, User, Video
from app.schemas import UserOut

router = APIRouter()


@router.get("/me", response_model=UserOut)
def get_me(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return user


@router.get("/me/activity")
def get_activity(
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return a combined feed of recent user activity (uploads, processing, completions)."""
    videos = (
        db.query(Video)
        .filter(Video.user_id == user.id)
        .order_by(Video.created_at.desc())
        .limit(limit)
        .all()
    )

    jobs = (
        db.query(Job)
        .join(Video)
        .filter(Video.user_id == user.id)
        .order_by(Job.created_at.desc())
        .limit(limit)
        .all()
    )

    items = []
    for video in videos:
        items.append({
            "type": "video_upload",
            "title": video.title,
            "status": video.status.value if hasattr(video.status, "value") else video.status,
            "created_at": video.created_at.isoformat() if video.created_at else None,
        })

    for job in jobs:
        items.append({
            "type": "job_update",
            "title": job.video.title if job.video else "Unknown video",
            "status": job.status.value if hasattr(job.status, "value") else job.status,
            "progress": job.progress,
            "error_message": job.error_message,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        })

    items.sort(key=lambda x: x["created_at"] or "", reverse=True)
    return {"items": items[:limit]}

