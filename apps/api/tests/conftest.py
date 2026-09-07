"""Shared test fixtures."""

import os
import uuid
from datetime import datetime
from uuid import uuid4 as _uuid4

# Force safe defaults for settings that must be syntactically valid at
# import time (e.g. StorageService builds a boto3 client from these), so the
# test suite doesn't break depending on what a developer's local .env has
# filled in (or left as unfilled placeholders like "<ACCOUNT_ID>"). Real
# environment variables take precedence over .env file values in
# pydantic-settings, so this reliably overrides them.
os.environ["STORAGE_ENDPOINT"] = "http://localhost:9000"
os.environ["STORAGE_INTERNAL_ENDPOINT"] = "http://localhost:9000"
os.environ["STORAGE_PUBLIC_URL"] = "http://localhost:9000"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import String, TypeDecorator, create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects import postgresql

# Provide a SQLite-compatible UUID type that converts UUID objects to strings.
class _SQLiteUUID(TypeDecorator):
    impl = String(36)
    cache_ok = True

    def __init__(self, as_uuid=False, length=None, **kwargs):
        kwargs.pop("length", None)
        super().__init__(**kwargs)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return str(value)


postgresql.UUID = _SQLiteUUID

# Models use uuid.uuid4 as default; SQLite needs string UUIDs.
uuid.uuid4 = lambda: str(_uuid4())

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User, Video, VideoStatus  # noqa: E402


@pytest.fixture(scope="function")
def db_session(tmp_path):
    """Provide a fresh file-based SQLite database for each test."""
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    yield session

    session.close()
    engine.dispose()


@pytest.fixture
def test_user(db_session):
    """Create and return a test user."""
    user = User(clerk_id="test_user", email="test@example.com", plan="free")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def client(db_session, test_user):
    """Return a TestClient with DB and auth dependencies overridden."""
    engine = db_session.bind
    SessionLocal = sessionmaker(bind=engine)

    def override_get_db():
        session = SessionLocal()
        try:
            yield session
        finally:
            session.close()

    def override_get_current_user():
        session = SessionLocal()
        user = session.query(User).filter(User.clerk_id == "test_user").first()
        session.close()
        return user

    app.dependency_overrides[get_db] = override_get_db

    # Also override the auth import used by routers.
    from app.auth import get_current_user as auth_get_current_user

    app.dependency_overrides[auth_get_current_user] = override_get_current_user

    yield TestClient(app)

    app.dependency_overrides.clear()


@pytest.fixture
def test_video(db_session, test_user):
    """Create and return a test video."""
    video = Video(
        user_id=test_user.id,
        title="Test video",
        source_key="uploads/test.mp4",
        source_language="en",
        status=VideoStatus.PENDING,
    )
    db_session.add(video)
    db_session.commit()
    db_session.refresh(video)
    return video
