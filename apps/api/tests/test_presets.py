"""Tests for the caption presets API."""


def test_list_presets_empty(client):
    response = client.get("/api/v1/presets")
    assert response.status_code == 200
    assert response.json() == []


def test_create_and_list_preset(client):
    payload = {
        "name": "My vlog style",
        "target_language": "es",
        "subtitle_font": "Impact",
        "subtitle_size": 64,
        "voice": "nova",
    }
    response = client.post("/api/v1/presets", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "My vlog style"
    assert data["subtitle_font"] == "Impact"
    assert data["subtitle_size"] == 64
    assert data["voice"] == "nova"
    assert data["is_default"] is False

    response = client.get("/api/v1/presets")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_create_preset_with_default_clears_other_defaults(client):
    first = client.post("/api/v1/presets", json={"name": "A", "is_default": True}).json()
    second = client.post("/api/v1/presets", json={"name": "B", "is_default": True}).json()

    presets = {p["id"]: p for p in client.get("/api/v1/presets").json()}
    assert presets[first["id"]]["is_default"] is False
    assert presets[second["id"]]["is_default"] is True


def test_update_preset_rename_and_set_default(client):
    a = client.post("/api/v1/presets", json={"name": "A"}).json()
    b = client.post("/api/v1/presets", json={"name": "B", "is_default": True}).json()

    response = client.patch(f"/api/v1/presets/{a['id']}", json={"name": "A renamed", "is_default": True})
    assert response.status_code == 200
    assert response.json()["name"] == "A renamed"
    assert response.json()["is_default"] is True

    presets = {p["id"]: p for p in client.get("/api/v1/presets").json()}
    assert presets[b["id"]]["is_default"] is False


def test_update_preset_not_found(client):
    response = client.patch(
        "/api/v1/presets/00000000-0000-0000-0000-000000000000", json={"name": "X"}
    )
    assert response.status_code == 404


def test_delete_preset(client):
    preset = client.post("/api/v1/presets", json={"name": "Temp"}).json()
    response = client.delete(f"/api/v1/presets/{preset['id']}")
    assert response.status_code == 204
    assert client.get("/api/v1/presets").json() == []


def test_delete_preset_not_found(client):
    response = client.delete("/api/v1/presets/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
