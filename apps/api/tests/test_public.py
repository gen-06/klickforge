"""Tests for public endpoints."""

from app.models import Clip, ClipStatus, Video, VideoStatus


def test_public_clip_not_found(client):
    response = client.get("/api/v1/public/clips/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


def test_public_clip_returns_finished_clip(client, db_session, test_video):
    clip = Clip(
        video_id=test_video.id,
        start_time=0,
        end_time=10,
        score=0.85,
        output_url="https://example.com/clip.mp4",
        status=ClipStatus.DONE,
    )
    db_session.add(clip)
    db_session.commit()

    response = client.get(f"/api/v1/public/clips/{clip.id}")
    assert response.status_code == 200
    data = response.json()["clip"]
    assert data["id"] == str(clip.id)
    assert data["output_url"] == clip.output_url
    assert data["duration"] == 10


def test_demo_clips_returns_finished_clips(client, db_session, test_video):
    clip = Clip(
        video_id=test_video.id,
        start_time=0,
        end_time=10,
        score=0.9,
        output_url="https://example.com/clip.mp4",
        status=ClipStatus.DONE,
    )
    db_session.add(clip)
    db_session.commit()

    response = client.get("/api/v1/public/demo-clips")
    assert response.status_code == 200
    data = response.json()
    assert len(data["clips"]) == 1
    assert data["clips"][0]["id"] == str(clip.id)


def test_waitlist_signup(client):
    response = client.post("/api/v1/waitlist", json={"email": "test@example.com"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "registered"
    assert data["email"] == "test@example.com"


def test_waitlist_signup_duplicate(client):
    client.post("/api/v1/waitlist", json={"email": "dup@example.com"})
    response = client.post("/api/v1/waitlist", json={"email": "dup@example.com"})
    assert response.status_code == 200
    assert response.json()["status"] == "already_registered"
