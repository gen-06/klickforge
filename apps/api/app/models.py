import enum
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


def generate_uuid():
    return str(uuid4())


class VideoStatus(str, enum.Enum):
    PENDING = "pending"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class ClipStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class JobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    clerk_id = Column(String(255), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=False)
    plan = Column(String(50), default="free")
    credits_balance = Column(Integer, default=300, nullable=False)
    credits_used = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    videos = relationship("Video", back_populates="user")
    customer = relationship("Customer", uselist=False, back_populates="user")


class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(String(255), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    email = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="customer")
    subscriptions = relationship("Subscription", back_populates="customer")
    credit_purchases = relationship("CreditPurchase", back_populates="customer")


class Subscription(Base):
    __tablename__ = "subscriptions"

    subscription_id = Column(String(255), primary_key=True)
    customer_id = Column(String(255), ForeignKey("customers.customer_id"), nullable=False, index=True)
    status = Column(String(50), nullable=False)
    price_id = Column(String(255), nullable=False)
    product_id = Column(String(255), nullable=False)
    next_billed_at = Column(DateTime, nullable=True)
    scheduled_change_action = Column(String(50), nullable=True)
    scheduled_change_at = Column(DateTime, nullable=True)
    credits_granted = Column(Integer, default=0, nullable=False)
    last_credit_grant_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="subscriptions")


class CreditPurchase(Base):
    __tablename__ = "credit_purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    transaction_id = Column(String(255), unique=True, nullable=False, index=True)
    customer_id = Column(String(255), ForeignKey("customers.customer_id"), nullable=False, index=True)
    price_id = Column(String(255), nullable=False)
    credits = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="credit_purchases")


class Video(Base):
    __tablename__ = "videos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    source_key = Column(String(1024), nullable=False)
    source_url = Column(Text)
    source_language = Column(String(10), default="en")
    target_language = Column(String(10), nullable=True)
    subtitle_font = Column(String(255), default="Arial", nullable=False)
    subtitle_size = Column(Integer, default=56, nullable=False)
    subtitle_color = Column(String(32), default="#FFFFFF", nullable=False)
    subtitle_position = Column(String(32), default="bottom-center", nullable=False)
    subtitle_outline = Column(Integer, default=2, nullable=False)
    subtitle_outline_color = Column(String(32), default="#000000", nullable=False)
    status = Column(Enum(VideoStatus), default=VideoStatus.PENDING)
    duration = Column(Float)
    transcript = Column(JSON, nullable=True)
    audio_mode = Column(String(32), default="subtitles_only", nullable=False)
    voice = Column(String(32), default="alloy", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="videos")
    clips = relationship("Clip", back_populates="video")
    jobs = relationship("Job", back_populates="video")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id"), nullable=False, index=True)
    type = Column(String(50), default="split")
    status = Column(Enum(JobStatus), default=JobStatus.QUEUED)
    progress = Column(Integer, default=0)
    error_message = Column(Text)
    # Set once credits have been deducted for this job, so a Celery retry of
    # the same job attempt never charges the user twice.
    credits_charged = Column(Boolean, default=False, nullable=False, server_default="false")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    video = relationship("Video", back_populates="jobs")


class Clip(Base):
    __tablename__ = "clips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    video_id = Column(UUID(as_uuid=True), ForeignKey("videos.id"), nullable=False, index=True)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    score = Column(Float, default=0.0)
    output_key = Column(String(1024))
    output_url = Column(Text)
    status = Column(Enum(ClipStatus), default=ClipStatus.PENDING)
    view_count = Column(Integer, default=0, nullable=False)
    download_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    video = relationship("Video", back_populates="clips")


class Waitlist(Base):
    __tablename__ = "waitlist"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)
    source = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
