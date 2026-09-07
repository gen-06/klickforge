from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Clip, ClipStatus, Job, JobStatus, User, Video
from app.schemas import ClipOut, ClipUpdate, JobOut
from app.services.storage import StorageService
from app.worker.tasks import regenerate_clip

router = APIRouter()


@router.delete("/{clip_id}", status_code=204)
def delete_clip(
    clip_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    clip = (
        db.query(Clip)
        .join(Clip.video)
        .filter(Clip.id == clip_id, Video.user_id == user.id)
        .first()
    )
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    storage = StorageService()
    if clip.output_key:
        storage.delete_file(clip.output_key, storage.clips_bucket)

    db.delete(clip)
    db.commit()
    return None


@router.patch("/{clip_id}", response_model=ClipOut)
def update_clip(
    clip_id: UUID,
    payload: ClipUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    clip = (
        db.query(Clip)
        .join(Clip.video)
        .filter(Clip.id == clip_id, Video.user_id == user.id)
        .first()
    )
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")

    if payload.start_time < 0:
        raise HTTPException(status_code=400, detail="start_time must be non-negative")
    if payload.start_time >= payload.end_time:
        raise HTTPException(status_code=400, detail="start_time must be before end_time")
    if clip.video.duration and payload.end_time > clip.video.duration:
        raise HTTPException(status_code=400, detail="end_time exceeds video duration")

    video = clip.video
    if payload.subtitle_font is not None:
        video.subtitle_font = payload.subtitle_font
    if payload.subtitle_size is not None:
        video.subtitle_size = payload.subtitle_size
    if payload.subtitle_color is not None:
        video.subtitle_color = payload.subtitle_color
    if payload.subtitle_position is not None:
        video.subtitle_position = payload.subtitle_position
    if payload.subtitle_outline is not None:
        video.subtitle_outline = payload.subtitle_outline
    if payload.subtitle_outline_color is not None:
        video.subtitle_outline_color = payload.subtitle_outline_color

    storage = StorageService()
    if clip.output_key:
        storage.delete_file(clip.output_key, storage.clips_bucket)

    clip.start_time = payload.start_time
    clip.end_time = payload.end_time
    clip.output_key = None
    clip.output_url = None
    clip.status = ClipStatus.PROCESSING
    db.commit()
    db.refresh(clip)
    return clip


@router.post("/{clip_id}/regenerate", response_model=JobOut)
def regenerate_clip_endpoint(
    clip_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    clip = (
        db.query(Clip)
        .join(Clip.video)
        .filter(Clip.id == clip_id, Video.user_id == user.id)
        .first()
    )
    if not clip:
        raise HTTPException(status_code=404, detail="Clip not found")
    if clip.status == ClipStatus.PROCESSING:
        raise HTTPException(status_code=409, detail="Clip is already being regenerated")

    clip.status = ClipStatus.PROCESSING
    clip.output_url = None
    db.commit()

    job = Job(video_id=clip.video_id, type="regenerate", status=JobStatus.QUEUED)
    db.add(job)
    db.commit()
    db.refresh(job)

    regenerate_clip.delay(str(clip.id), str(job.id))
    db.refresh(clip)
    return job


@router.post("/{clip_id}/view", status_code=204)
def record_clip_view(
    clip_id: UUID,
    db: Session = Depends(get_db),
):
    """Increment the view counter for a clip. Public endpoint, no auth required."""
    clip = db.query(Clip).filter(Clip.id == clip_id).first()
    if clip:
        clip.view_count += 1
        db.commit()
    return None


@router.get("/{clip_id}/download")
def download_clip(
    clip_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    clip = (
        db.query(Clip)
        .join(Clip.video)
        .filter(Clip.id == clip_id, Video.user_id == user.id)
        .first()
    )
    if not clip or not clip.output_key:
        raise HTTPException(status_code=404, detail="Clip not ready")

    clip.download_count += 1
    db.commit()

    storage = StorageService()
    filename = f"clip_{clip.video.title or 'video'}_{int(clip.start_time)}s.mp4".replace(" ", "_")
    url = storage.get_signed_download_url(
        clip.output_key,
        storage.clips_bucket,
        content_disposition=f"attachment;filename={filename}",
    )
    return {"url": url}
