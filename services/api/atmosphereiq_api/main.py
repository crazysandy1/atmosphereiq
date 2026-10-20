"""FastAPI app: /api/geojson, /api/region, /api/report, /ws/map."""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Literal

import pandas as pd
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from . import config
from .aqi import aqi_color, health_recommendation
from .data_fetcher import WaqiError, fetch_region_data, fetch_waqi_data
from .grid_processor import process_grid_aqi
from .map_generator import clean_json, generate_geojson, generate_pdf_report

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Pollutant = Literal["aqi", "pm25", "pm10", "no2", "so2", "co"]
SEARCH_RE = re.compile(r"^[a-zA-Z0-9\s\-,.]*$")
CACHE_TTL = 300

app = FastAPI(title="AtmosphereIQ API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

redis_client = None
if config.redis_url():
    try:
        from redis.asyncio import Redis

        redis_client = Redis.from_url(config.redis_url(), decode_responses=True)
        logger.info("Redis cache enabled")
    except Exception as exc:  # redis is optional
        logger.warning("Redis unavailable (%s). Running without cache.", exc)


async def _cache_get(key: str):
    if redis_client:
        try:
            cached = await redis_client.get(key)
            return json.loads(cached) if cached else None
        except Exception as exc:
            logger.error("Redis read failed: %s", exc)
    return None


async def _cache_set(key: str, value) -> None:
    if redis_client:
        try:
            await redis_client.setex(key, CACHE_TTL, json.dumps(value))
        except Exception as exc:
            logger.error("Redis write failed: %s", exc)


async def _records() -> list:
    try:
        records = await fetch_waqi_data()
    except WaqiError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not records:
        raise HTTPException(status_code=503, detail="WAQI returned no stations.")
    return records


def _check_search(term: str) -> None:
    if term and not SEARCH_RE.match(term):
        raise HTTPException(status_code=400, detail="Invalid search term.")


def _filtered_grid(records: list, max_value: float, pollutant: str, search_term: str):
    grid = process_grid_aqi(records)
    if not len(grid):
        return grid
    grid = grid[grid[pollutant] <= max_value]
    if search_term:
        grid = grid[grid["stations"].str.contains(search_term, case=False, na=False, regex=False)]
    return grid


def _build_geojson(records: list, max_value: float, pollutant: str, search_term: str) -> dict:
    stations = pd.DataFrame(records)
    stations["color"] = stations["aqi"].apply(aqi_color)
    stations["health_recommendation"] = stations["aqi"].apply(health_recommendation)
    return generate_geojson(_filtered_grid(records, max_value, pollutant, search_term), stations)


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok"}


@app.get("/api/geojson")
async def get_geojson(
    max_value: float = Query(150, ge=0),
    pollutant: Pollutant = Query("aqi"),
    search_term: str = Query("", max_length=64),
):
    _check_search(search_term)
    key = f"geojson:{max_value}:{pollutant}:{search_term}"
    cached = await _cache_get(key)
    if cached is not None:
        return cached
    result = _build_geojson(await _records(), max_value, pollutant, search_term)
    await _cache_set(key, result)
    return result


@app.get("/api/region")
async def get_region(grid_name: str = Query(..., pattern=r"^Grid_-?\d+\.\d+_-?\d+\.\d+$")):
    key = f"region:{grid_name}"
    cached = await _cache_get(key)
    if cached is not None:
        return cached
    try:
        records = await fetch_region_data(grid_name)
    except WaqiError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not records:
        raise HTTPException(status_code=404, detail="No data for this region.")

    n = len(records)

    def mean(field: str) -> float:
        return sum(r[field] for r in records) / n

    result = clean_json({
        "grid_name": grid_name,
        "stations": records,
        "pollutants": {p: mean(p) for p in ("pm25", "pm10", "no2", "so2", "co")},
        "health_recommendation": health_recommendation(mean("aqi")),
    })
    await _cache_set(key, result)
    return result


@app.get("/api/report")
async def get_report(
    max_value: float = Query(150, ge=0),
    pollutant: Pollutant = Query("aqi"),
    search_term: str = Query("", max_length=64),
):
    _check_search(search_term)
    grid = _filtered_grid(await _records(), max_value, pollutant, search_term)
    return StreamingResponse(
        generate_pdf_report(grid),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=bengaluru_air_quality_report.pdf"},
    )


@app.websocket("/ws/map")
async def websocket_map(websocket: WebSocket):
    """Push the unfiltered map payload every 5 minutes."""
    await websocket.accept()
    try:
        while True:
            try:
                await websocket.send_json(_build_geojson(await fetch_waqi_data(), 1000, "aqi", ""))
            except WaqiError as exc:
                await websocket.send_json({"error": str(exc)})
            await asyncio.sleep(CACHE_TTL)
    except WebSocketDisconnect:
        pass
