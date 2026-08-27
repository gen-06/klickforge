"""Tests for the videos API."""

from unittest.mock import patch

from app.models import VideoStatus


def test_presigned_upload_rejects_unsupported_type(client):
    response = client.post("/api/v1/videos/presigned-upload?filename=video.avi")
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_presigned_upload_accepts_supported_type(client):
    with patch("app.services.storage.StorageService.get_presigned_upload_url", return_value="https://example.com/upload"):
        response = client.post("/api/v1/videos/presigned-upload?filename=video.mp4&file_size=1024&content_type=video/mp4")
    assert response.status_code == 200
    data = response.json()
    assert "key" in data
    assert "url" in data


def test_presigned_upload_rejects_oversized_file(client):
    max_size = 2048 * 1024 * 1024 + 1
    response = client.post(f"/api/v1/videos/presigned-upload?filename=video.mp4&file_size={max_size}")
    assert response.status_code == 400
    assert "exceeds maximum size" in response.json()["detail"]


def test_create_video(client, test_user):
    payload = {
        "title": "My test video",
        "source_key": "uploads/test.mp4",
        "source_language": "en",
        "target_language": "es",
        "subtitle_font": "Arial",
        "subtitle_size": 56,
        "subtitle_color": "#FFFFFF",
        "subtitle_position": "bottom-center",
        "subtitle_outline": 2,
        "subtitle_outline_color": "#000000",
        "audio_mode": "subtitles_only",
        "voice": "alloy",
    }
    response = client.post("/api/v1/videos", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "My test video"
    assert data["source_language"] == "en"
    assert data["status"] == "pending"


def test_list_videos(client, test_video):
    response = client.get("/api/v1/videos")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == str(test_video.id)


def test_get_video_clips(client, test_video):
    response = client.get(f"/api/v1/videos/{test_video.id}/clips")
    assert response.status_code == 200
    assert response.json() == []


def test_delete_video(client, test_video):
    with patch("app.services.storage.StorageService.delete_file"):
        response = client.delete(f"/api/v1/videos/{test_video.id}")
    assert response.status_code == 204

    response = client.get("/api/v1/videos")
    assert response.json() == []


def test_complete_upload_requires_existing_video(client):
    response = client.post("/api/v1/videos/00000000-0000-0000-0000-000000000000/complete")
    assert response.status_code == 404


def test_complete_upload_queues_job(client, test_video):
    with patch("app.services.storage.StorageService.get_url", return_value="https://example.com/video.mp4"):
        with patch("app.worker.tasks.process_video.delay") as mock_task:
            response = client.post(f"/api/v1/videos/{test_video.id}/complete")
    assert response.status_code == 200
    data = response.json()
    assert data["type"] == "split"
    assert data["status"] == "queued"
    mock_task.assert_called_once()

    # Video status should now be uploaded.
    response = client.get("/api/v1/videos")
    assert response.json()[0]["status"] == VideoStatus.UPLOADED.value
