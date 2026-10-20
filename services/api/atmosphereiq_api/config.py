"""Runtime settings read from environment variables (see ``.env.example``)."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

CENTER = {"lat": 12.9716, "lon": 77.5946}  # Bengaluru
BBOX_HALF_SPAN = 0.54  # degrees, ~60 km box


def waqi_api_key() -> str:
    return os.getenv("WAQI_API_KEY", "").strip()


def allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    return [o.strip() for o in raw.split(",") if o.strip()]


def cache_file() -> str:
    return os.getenv("WAQI_CACHE_FILE", ".cache/waqi_cache.json")


def redis_url() -> str | None:
    if os.getenv("USE_REDIS", "false").lower() != "true":
        return None
    return os.getenv("REDIS_URL", "redis://localhost:6379/0")
