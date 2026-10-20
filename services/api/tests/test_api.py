import pytest
from fastapi.testclient import TestClient

from atmosphereiq_api import main

SAMPLE = [
    {
        "uid": 1, "location": "Hebbal", "latitude": 13.03, "longitude": 77.59, "aqi": 80.0,
        "aqi_category": "Moderate", "pm25": 80.0, "pm10": 30.0, "no2": 5.0, "so2": 1.0, "co": 2.0,
        "last_updated": "2025-01-01T00:00:00+00:00", "forecast": {},
    }
]


@pytest.fixture
def client(monkeypatch):
    async def fake():
        return SAMPLE

    monkeypatch.setattr(main, "fetch_waqi_data", fake)
    return TestClient(main.app)


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_geojson(client):
    body = client.get("/api/geojson").json()
    assert len(body["grids"]["features"]) == 1
    assert body["stations"][0]["color"] == "yellow"


def test_geojson_filters_out_high_aqi(client):
    body = client.get("/api/geojson", params={"max_value": 50}).json()
    assert body["grids"]["features"] == []


def test_bad_pollutant_is_422(client):
    assert client.get("/api/geojson", params={"pollutant": "lead"}).status_code == 422


def test_bad_search_is_400(client):
    assert client.get("/api/geojson", params={"search_term": "a;drop"}).status_code == 400


def test_report_is_pdf(client):
    response = client.get("/api/report")
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
