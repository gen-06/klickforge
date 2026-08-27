"""Tests for the health endpoint."""

from unittest.mock import patch


def test_health_healthy(client):
    with patch("app.services.health.check_database", return_value={"status": "ok"}):
        with patch("app.services.health.check_redis", return_value={"status": "ok"}):
            response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["checks"]["database"]["status"] == "ok"
    assert data["checks"]["redis"]["status"] == "ok"


def test_health_unhealthy(client):
    with patch("app.services.health.check_database", return_value={"status": "error", "detail": "db down"}):
        with patch("app.services.health.check_redis", return_value={"status": "ok"}):
            response = client.get("/health")
    assert response.status_code == 503
    assert response.json()["status"] == "unhealthy"
