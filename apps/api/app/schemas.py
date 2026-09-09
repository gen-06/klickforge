from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscriptOut(BaseModel):
    segments: list[TranscriptSegment]
    language: Optional[str] = None


class TranscriptUpdate(BaseModel):
    segments: list[TranscriptSegment]


class UserOut(BaseModel):
    id: UUID
    clerk_id: str
    email: str
    plan: str
    credits_balance: int
    credits_used: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VideoCreate(BaseModel):
    title: str
    source_key: str
    source_language: str = "en"
    target_language: Optional[str] = None
    subtitle_font: Optional[str] = "Arial"
    subtitle_size: Optional[int] = 56
    subtitle_color: Optional[str] = "#FFFFFF"
    subtitle_position: Optional[str] = "bottom-center"
    subtitle_outline: Optional[int] = 2
    subtitle_outline_color: Optional[str] = "#000000"
    audio_mode: Literal["subtitles_only", "voiceover", "voiceover_with_original"] = "subtitles_only"
    voice: Optional[str] = "alloy"


class ClipUpdate(BaseModel):
    start_time: float
    end_time: float
    subtitle_font: Optional[str] = None
    subtitle_size: Optional[int] = None
    subtitle_color: Optional[str] = None
    subtitle_position: Optional[str] = None
    subtitle_outline: Optional[int] = None
    subtitle_outline_color: Optional[str] = None


class ClipOut(BaseModel):
    id: UUID
    video_id: UUID
    start_time: float
    end_time: float
    score: float
    output_url: Optional[str]
    status: str
    view_count: int
    download_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobOut(BaseModel):
    id: UUID
    video_id: UUID
    type: str
    status: str
    progress: int
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class VideoOut(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    source_key: str
    source_url: Optional[str]
    source_language: Optional[str]
    target_language: Optional[str]
    subtitle_font: Optional[str]
    subtitle_size: Optional[int]
    subtitle_color: Optional[str]
    subtitle_position: Optional[str]
    subtitle_outline: Optional[int]
    subtitle_outline_color: Optional[str]
    audio_mode: str
    voice: Optional[str]
    status: str
    duration: Optional[float]
    jobs: List[JobOut] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SignedUrlOut(BaseModel):
    url: str


class PresignedUploadOut(BaseModel):
    key: str
    url: str


class CreditPackOut(BaseModel):
    price_id: str
    credits: int
    label: str


class CaptionPresetIn(BaseModel):
    name: str
    source_language: Optional[str] = "en"
    target_language: Optional[str] = None
    subtitle_font: Optional[str] = "Arial"
    subtitle_size: Optional[int] = 56
    subtitle_color: Optional[str] = "#FFFFFF"
    subtitle_position: Optional[str] = "bottom"
    subtitle_outline: Optional[int] = 2
    subtitle_outline_color: Optional[str] = "#000000"
    audio_mode: Literal["subtitles_only", "voiceover", "voiceover_with_original"] = "subtitles_only"
    voice: Optional[str] = "alloy"
    is_default: bool = False


class CaptionPresetUpdate(BaseModel):
    name: Optional[str] = None
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    subtitle_font: Optional[str] = None
    subtitle_size: Optional[int] = None
    subtitle_color: Optional[str] = None
    subtitle_position: Optional[str] = None
    subtitle_outline: Optional[int] = None
    subtitle_outline_color: Optional[str] = None
    audio_mode: Optional[Literal["subtitles_only", "voiceover", "voiceover_with_original"]] = None
    voice: Optional[str] = None
    is_default: Optional[bool] = None


class CaptionPresetOut(BaseModel):
    id: UUID
    name: str
    source_language: Optional[str]
    target_language: Optional[str]
    subtitle_font: str
    subtitle_size: int
    subtitle_color: str
    subtitle_position: str
    subtitle_outline: int
    subtitle_outline_color: str
    audio_mode: str
    voice: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
