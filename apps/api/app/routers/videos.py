import os
from typing import List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Clip, Job, JobStatus, User, Video, VideoStatus
from app.schemas import (
    ClipOut,
    JobOut,
    PresignedUploadOut,
    TranscriptOut,
    TranscriptUpdate,
    VideoCreate,
    VideoOut,
)
from app.services.storage import StorageService
from app.worker.tasks import process_video

router = APIRouter()

_ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv"}
_ALLOWED_CONTENT_TYPES = {"video/mp4", "video/quicktime", "video/webm", "video/x-matroska"}


def _validate_upload(filename: str, content_type: str | None = None) -> None:
    name_lower = filename.lower()
    ext = os.path.splitext(name_lower)[1]
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(_ALLOWED_EXTENSIONS)}",
        )
    if content_type and content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type. Allowed: {', '.join(_ALLOWED_CONTENT_TYPES)}",
        )


@router.post("/presigned-upload", response_model=PresignedUploadOut)
def presigned_upload(
    filename: str,
    file_size: int | None = None,
    content_type: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _validate_upload(filename, content_type)

    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size is not None and file_size > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB} MB",
        )

    storage = StorageService()
    storage.ensure_buckets()
    key = f"{user.id}/{uuid4()}_{filename}"
    url = storage.get_presigned_upload_url(key, bucket=storage.uploads_bucket)
    return {"key": key, "url": url}


@router.post("", response_model=VideoOut)
def create_video(
    payload: VideoCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = Video(
        user_id=user.id,
        title=payload.title,
        source_key=payload.source_key,
        source_language=payload.source_language,
        target_language=payload.target_language,
        subtitle_font=payload.subtitle_font,
        subtitle_size=payload.subtitle_size,
        subtitle_color=payload.subtitle_color,
        subtitle_position=payload.subtitle_position,
        subtitle_outline=payload.subtitle_outline,
        subtitle_outline_color=payload.subtitle_outline_color,
        audio_mode=payload.audio_mode,
        voice=payload.voice,
        status=VideoStatus.PENDING,
    )
    db.add(video)
    db.commit()
    db.refresh(video)
    return video


@router.get("", response_model=List[VideoOut])
def list_videos(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(Video).filter(Video.user_id == user.id).order_by(Video.created_at.desc()).all()


@router.post("/{video_id}/complete", response_model=JobOut)
def complete_upload(
    video_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    storage = StorageService()
    video.source_url = storage.get_url(video.source_key, bucket=storage.uploads_bucket)
    video.status = VideoStatus.UPLOADED
    db.commit()

    job = Job(video_id=video.id, type="split", status=JobStatus.QUEUED)
    db.add(job)
    db.commit()
    db.refresh(job)

    process_video.delay(str(video.id), str(job.id))
    return job


@router.post("/{video_id}/retry", response_model=JobOut)
def retry_video(
    video_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retry a failed video split from the beginning."""
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.status not in (VideoStatus.FAILED.value, VideoStatus.DONE.value):
        raise HTTPException(status_code=400, detail="Only failed or completed videos can be retried")

    # Clean up previous clips so we don't duplicate or leave stale outputs.
    storage = StorageService()
    for clip in video.clips:
        if clip.output_key:
            storage.delete_file(clip.output_key, storage.clips_bucket)
        db.delete(clip)

    video.status = VideoStatus.UPLOADED
    db.commit()

    job = Job(video_id=video.id, type="split", status=JobStatus.QUEUED)
    db.add(job)
    db.commit()
    db.refresh(job)

    process_video.delay(str(video.id), str(job.id))
    return job


@router.get("/{video_id}/clips", response_model=List[ClipOut])
def list_clips(
    video_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return db.query(Clip).filter(Clip.video_id == video.id).order_by(Clip.score.desc()).all()


@router.delete("/{video_id}", status_code=204)
def delete_video(
    video_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    storage = StorageService()
    for clip in video.clips:
        if clip.output_key:
            storage.delete_file(clip.output_key, storage.clips_bucket)
        db.delete(clip)

    if video.source_key:
        storage.delete_file(video.source_key, storage.uploads_bucket)

    for job in video.jobs:
        db.delete(job)

    db.delete(video)
    db.commit()
    return None


@router.get("/{video_id}/transcript", response_model=TranscriptOut)
def get_transcript(
    video_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return TranscriptOut(
        segments=video.transcript or [],
        language=video.target_language or video.source_language,
    )


@router.put("/{video_id}/transcript", response_model=TranscriptOut)
def update_transcript(
    video_id: UUID,
    payload: TranscriptUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    video = db.query(Video).filter(Video.id == video_id, Video.user_id == user.id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    for seg in payload.segments:
        if seg.start < 0 or seg.end <= seg.start or not seg.text.strip():
            raise HTTPException(
                status_code=400,
                detail="Each segment must have a non-negative start, end after start, and non-empty text",
            )

    video.transcript = [seg.model_dump() for seg in payload.segments]
    db.commit()
    db.refresh(video)
    return TranscriptOut(
        segments=video.transcript or [],
        language=video.target_language or video.source_language,
    )
