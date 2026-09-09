import logging
import random
import subprocess
import tempfile
import uuid
from pathlib import Path

from sqlalchemy import update

from app.config import settings
from app.database import SessionLocal
from app.models import Clip, ClipStatus, Job, JobStatus, User, Video, VideoStatus
from app.services.clip_scoring import score_segments
from app.services.billing import calculate_cost
from app.services.storage import StorageService
from app.services.subtitles import (
    filter_and_shift_segments,
    transcribe_to_segments,
    translate_segments,
    write_srt,
)
from app.services.tts import generate_voiceover, voice_for_language
from app.worker.celery_app import celery_app

logger = logging.getLogger("clipforge.worker.tasks")


class InsufficientCreditsError(Exception):
    """Raised when the user does not have enough credits to process a video."""


class NonRetryableError(Exception):
    """Raised for failures that should not trigger a retry."""


def _retry_countdown(retry_index: int, base_seconds: int = 60) -> int:
    """Exponential backoff with jitter."""
    return int(base_seconds * (2 ** retry_index) + random.uniform(0, 10))


def _charge_credits(db, job: "Job | None", user_id, cost: int) -> User:
    """Atomically deduct credits, exactly once per job even across Celery
    retries of the same task attempt.

    Uses a conditional UPDATE (balance check + deduction in one statement)
    so two concurrent charges for the same user can't both read a stale
    balance and both succeed.
    """
    if job is not None and job.credits_charged:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise InsufficientCreditsError("User not found")
        return user

    result = db.execute(
        update(User)
        .where(User.id == user_id, User.credits_balance >= cost)
        .values(credits_balance=User.credits_balance - cost, credits_used=User.credits_used + cost)
    )
    if result.rowcount == 0:
        user = db.query(User).filter(User.id == user_id).first()
        raise InsufficientCreditsError(
            f"Insufficient credits: {cost} required, {user.credits_balance if user else 0} available"
        )
    if job is not None:
        job.credits_charged = True
    db.commit()
    return db.query(User).filter(User.id == user_id).first()


@celery_app.task(bind=True, max_retries=3)
def process_video(self, video_id: str, job_id: str):
    db = SessionLocal()
    video = job = None
    try:
        video = db.query(Video).filter(Video.id == video_id).first()
        job = db.query(Job).filter(Job.id == job_id).first()
        if not video or not job:
            raise NonRetryableError("Video or job not found")

        job.status = JobStatus.PROCESSING
        db.commit()

        # Clear any leftover clips from a previous run to avoid duplicates on retry.
        db.query(Clip).filter(Clip.video_id == video.id).delete(synchronize_session=False)
        db.commit()

        storage = StorageService()
        with tempfile.TemporaryDirectory() as tmpdir:
            local_input = Path(tmpdir) / f"{uuid.uuid4()}_input.mp4"
            storage.download_file(video.source_key, storage.uploads_bucket, str(local_input))

            duration = _probe_duration(str(local_input))
            video.duration = duration
            video.status = VideoStatus.PROCESSING
            db.commit()

            # Enforce credits before any AI work. Idempotent across retries:
            # a job is only ever charged once (see _charge_credits).
            cost = calculate_cost(duration, video.audio_mode)
            _charge_credits(db, job, video.user_id, cost)

            # Transcribe once for scoring (and translate if a target language was chosen).
            local_audio = Path(tmpdir) / f"{uuid.uuid4()}_audio.mp3"
            _extract_audio(str(local_input), str(local_audio))
            segments = transcribe_to_segments(str(local_audio), video.source_language or "en")
            subtitle_segments = translate_segments(segments, video.target_language) if video.target_language else segments

            # Cache the full transcript so regenerating clips doesn't re-run Whisper.
            video.transcript = subtitle_segments
            db.commit()

            clips = score_segments(
                subtitle_segments,
                duration,
                settings.CLIP_MIN_DURATION_SECONDS,
                settings.CLIP_MAX_DURATION_SECONDS,
                settings.CLIP_TARGET_COUNT,
            )

            for i, (start, end, clip_score) in enumerate(clips):
                clip = Clip(
                    video_id=video.id,
                    start_time=start,
                    end_time=end,
                    score=clip_score,
                    status=ClipStatus.PROCESSING,
                )
                db.add(clip)
                db.commit()
                db.refresh(clip)

                output_key = f"{video_id}/{clip.id}.mp4"
                local_output = Path(tmpdir) / f"{clip.id}.mp4"

                local_srt = None
                local_audio = None
                if subtitle_segments:
                    clip_segments = filter_and_shift_segments(subtitle_segments, start, end)
                    local_srt = Path(tmpdir) / f"{clip.id}.srt"
                    write_srt(clip_segments, str(local_srt))

                    if video.audio_mode != "subtitles_only" and video.target_language:
                        voiceover_text = " ".join(seg["text"] for seg in clip_segments)
                        if voiceover_text.strip():
                            local_audio = Path(tmpdir) / f"{clip.id}.mp3"
                            voice = video.voice or voice_for_language(video.target_language)
                            generate_voiceover(voiceover_text, str(local_audio), voice=voice)

                _crop_clip(
                    str(local_input),
                    str(local_output),
                    start,
                    end,
                    video,
                    srt_path=str(local_srt) if local_srt else None,
                    audio_path=str(local_audio) if local_audio else None,
                )
                upload_source = str(local_output)

                storage.upload_file(upload_source, output_key, storage.clips_bucket)

                clip.output_key = output_key
                clip.output_url = storage.get_url(output_key, storage.clips_bucket)
                clip.status = ClipStatus.DONE
                db.commit()

                progress = int(((i + 1) / len(clips)) * 100)
                job.progress = progress
                db.commit()

        video.status = VideoStatus.DONE
        job.status = JobStatus.DONE
        job.progress = 100
        db.commit()

    except InsufficientCreditsError as exc:
        db.rollback()
        logger.warning("process_video.insufficient_credits", extra={"video_id": video_id, "job_id": job_id, "error": str(exc)})
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            db.commit()
        if video:
            video.status = VideoStatus.FAILED
            db.commit()
        # Do not retry; user needs to buy credits.
        return
    except NonRetryableError as exc:
        db.rollback()
        logger.error("process_video.non_retryable_error", extra={"video_id": video_id, "job_id": job_id, "error": str(exc)})
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            db.commit()
        if video:
            video.status = VideoStatus.FAILED
            db.commit()
        return
    except Exception as exc:
        db.rollback()
        logger.exception("process_video.retryable_error", extra={"video_id": video_id, "job_id": job_id, "retry": self.request.retries})
        # While a Celery retry is still pending, leave job/video status as
        # PROCESSING rather than FAILED. Otherwise the frontend shows a
        # "Retry" button during the retry backoff window, and a user click
        # there enqueues a second concurrent process_video run for the same
        # video on top of the one Celery is about to retry.
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            db.commit()
        if video:
            video.status = VideoStatus.FAILED
            # The clip being encoded when the final retry failed is otherwise
            # left stuck at PROCESSING forever, since it's a local loop
            # variable the except block never touches.
            db.query(Clip).filter(
                Clip.video_id == video.id, Clip.status == ClipStatus.PROCESSING
            ).update({"status": ClipStatus.FAILED})
            db.commit()
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3)
def regenerate_clip(self, clip_id: str, job_id: str | None = None):
    """Re-crop a single clip using its current boundaries and the video's subtitle style."""
    db = SessionLocal()
    clip = None
    job = None
    try:
        clip = db.query(Clip).filter(Clip.id == clip_id).first()
        if not clip:
            raise NonRetryableError("Clip not found")

        video = clip.video
        if not video:
            raise NonRetryableError("Video not found")

        if job_id:
            job = db.query(Job).filter(Job.id == job_id).first()
            if job:
                job.status = JobStatus.PROCESSING
                db.commit()

        clip.status = ClipStatus.PROCESSING
        db.commit()

        # Enforce credits for regeneration. Idempotent across retries: a job
        # is only ever charged once (see _charge_credits).
        duration = clip.end_time - clip.start_time
        cost = calculate_cost(duration, video.audio_mode)
        _charge_credits(db, job, video.user_id, cost)

        storage = StorageService()
        with tempfile.TemporaryDirectory() as tmpdir:
            local_input = Path(tmpdir) / f"{uuid.uuid4()}_input.mp4"
            storage.download_file(video.source_key, storage.uploads_bucket, str(local_input))

            # Reuse the cached transcript when available to avoid re-running Whisper.
            if video.transcript:
                subtitle_segments = video.transcript
            else:
                local_audio = Path(tmpdir) / f"{uuid.uuid4()}_audio.mp3"
                _extract_audio(str(local_input), str(local_audio))
                segments = transcribe_to_segments(
                    str(local_audio), video.source_language or "en"
                )
                subtitle_segments = (
                    translate_segments(segments, video.target_language)
                    if video.target_language
                    else segments
                )

            start = clip.start_time
            end = clip.end_time
            local_output = Path(tmpdir) / f"{clip.id}.mp4"
            output_key = f"{video.id}/{clip.id}.mp4"

            if clip.output_key:
                storage.delete_file(clip.output_key, storage.clips_bucket)

            local_srt = None
            local_audio = None
            if subtitle_segments:
                clip_segments = filter_and_shift_segments(subtitle_segments, start, end)
                local_srt = Path(tmpdir) / f"{clip.id}.srt"
                write_srt(clip_segments, str(local_srt))

                if video.audio_mode != "subtitles_only" and video.target_language:
                    voiceover_text = " ".join(seg["text"] for seg in clip_segments)
                    if voiceover_text.strip():
                        local_audio = Path(tmpdir) / f"{clip.id}.mp3"
                        voice = video.voice or voice_for_language(video.target_language)
                        generate_voiceover(voiceover_text, str(local_audio), voice=voice)

            _crop_clip(
                str(local_input),
                str(local_output),
                start,
                end,
                video,
                srt_path=str(local_srt) if local_srt else None,
                audio_path=str(local_audio) if local_audio else None,
            )
            storage.upload_file(str(local_output), output_key, storage.clips_bucket)

            clip.output_key = output_key
            clip.output_url = storage.get_url(output_key, storage.clips_bucket)
            clip.status = ClipStatus.DONE
            db.commit()

            if job:
                job.status = JobStatus.DONE
                job.progress = 100
                db.commit()

    except InsufficientCreditsError as exc:
        db.rollback()
        logger.warning("regenerate_clip.insufficient_credits", extra={"clip_id": clip_id, "job_id": job_id, "error": str(exc)})
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            db.commit()
        if clip:
            clip.status = ClipStatus.FAILED
            db.commit()
        return
    except NonRetryableError as exc:
        db.rollback()
        logger.error("regenerate_clip.non_retryable_error", extra={"clip_id": clip_id, "job_id": job_id, "error": str(exc)})
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            db.commit()
        if clip:
            clip.status = ClipStatus.FAILED
            db.commit()
        return
    except Exception as exc:
        db.rollback()
        logger.exception("regenerate_clip.retryable_error", extra={"clip_id": clip_id, "job_id": job_id, "retry": self.request.retries})
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=_retry_countdown(self.request.retries))
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(exc)
            db.commit()
        if clip:
            clip.status = ClipStatus.FAILED
            db.commit()
    finally:
        db.close()


def _probe_duration(input_path: str) -> float:
    """Return video duration using ffprobe."""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        input_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")
    return float(result.stdout.strip())


def _crop_clip(
    input_path: str,
    output_path: str,
    start: float,
    end: float,
    video: Video,
    srt_path: str | None = None,
    audio_path: str | None = None,
):
    """Crop a 16:9 input to 9:16 vertical output using ffmpeg directly.

    If srt_path is provided, the subtitles are burned into the cropped clip
    in the same pass to avoid a second full re-encode. The subtitle style is
    read from the video record.

    If audio_path is provided, the generated voiceover is mixed in according
    to the video's audio_mode.
    """
    duration = end - start
    vf = "crop=trunc(ih*9/16/2)*2:ih:(iw-trunc(ih*9/16/2)*2)/2:0,scale=1080:1920"
    if srt_path:
        style = _build_subtitle_style(video)
        vf += f",subtitles={srt_path}:force_style='{style}'"

    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        str(start),
        "-t",
        str(duration),
        "-i",
        input_path,
    ]

    if audio_path:
        cmd += ["-i", audio_path]

    cmd += ["-vf", vf]

    if audio_path:
        if video.audio_mode == "voiceover":
            cmd += [
                "-filter_complex",
                f"[1:a]apad=pad_dur={duration}[outa]",
                "-map",
                "0:v",
                "-map",
                "[outa]",
                "-c:a",
                "aac",
                "-shortest",
            ]
        elif video.audio_mode == "voiceover_with_original":
            cmd += [
                "-filter_complex",
                "[0:a]volume=0.2[orig];[orig][1:a]amix=inputs=2:duration=first[outa]",
                "-map",
                "0:v",
                "-map",
                "[outa]",
                "-c:a",
                "aac",
            ]
    else:
        cmd += ["-c:a", "aac"]

    cmd += [
        "-c:v",
        "libx264",
        # The container reports the host's full core count (not the actual
        # cgroup CPU quota), so libx264 auto-detects far more threads than
        # are usable and over-allocates lookahead buffers accordingly. Cap
        # it to the actual quota to avoid resource-pressure crashes mid-encode.
        "-threads",
        "2",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-crf",
        "25",
        "-preset",
        "veryfast",
        "-r",
        "30",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr}")


def _build_subtitle_style(video: Video) -> str:
    """Convert the video's subtitle style fields into an FFmpeg force_style string."""
    primary = _hex_to_ass_color(video.subtitle_color or "#FFFFFF")
    outline = _hex_to_ass_color(video.subtitle_outline_color or "#000000")
    alignment = _alignment_from_position(video.subtitle_position or "bottom-center")
    return (
        f"FontName={video.subtitle_font or 'Arial'},"
        f"FontSize={video.subtitle_size or 56},"
        f"PrimaryColour={primary},"
        f"OutlineColour={outline},"
        f"Outline={video.subtitle_outline or 2},"
        f"Shadow=0,"
        f"Alignment={alignment},"
        f"MarginV=100"
    )


def _hex_to_ass_color(hex_color: str) -> str:
    """Convert a #RRGGBB hex color to the ASS BGR format FFmpeg expects."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        raise ValueError(f"Invalid hex color: {hex_color}")
    r, g, b = hex_color[0:2], hex_color[2:4], hex_color[4:6]
    return f"&H00{b}{g}{r}".upper()


def _alignment_from_position(position: str) -> int:
    """Map a human-readable subtitle position to an ASS alignment value."""
    mapping = {
        "bottom-left": 1,
        "bottom": 2,
        "bottom-center": 2,
        "bottom-right": 3,
        "middle-left": 4,
        "middle": 5,
        "middle-center": 5,
        "center": 5,
        "middle-right": 6,
        "top-left": 7,
        "top": 8,
        "top-center": 8,
        "top-right": 9,
    }
    return mapping.get(position.lower(), 2)


def _extract_audio(input_path: str, output_path: str):
    """Extract audio track to MP3 for Whisper."""
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-vn",
        "-acodec",
        "libmp3lame",
        "-q:a",
        "2",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg audio extraction failed: {result.stderr}")



