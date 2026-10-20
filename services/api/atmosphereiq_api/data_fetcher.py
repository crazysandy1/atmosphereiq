"""Fetch live station data from the WAQI API (https://aqicn.org/api/)."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import urllib.parse
from collections import deque
from datetime import datetime

import aiohttp
import pytz

from . import config
from .aqi import aqi_category
from .grid_processor import cell_name_for

logger = logging.getLogger(__name__)

RATE_LIMIT_CALLS = 50
RATE_LIMIT_WINDOW = 60
_request_timestamps: deque = deque()


class WaqiError(RuntimeError):
    """Raised when WAQI cannot be reached or rejects the request."""


def _load_cache() -> dict:
    try:
        with open(config.cache_file(), "r", encoding="utf-8") as fh:
            return json.load(fh)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _save_cache(key: str, records: list) -> None:
    path = config.cache_file()
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({key: records}, fh)  # keep only the current hour


def clean_float(value) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return 0.0 if number != number or number in (float("inf"), float("-inf")) else number


async def _throttle() -> None:
    now = time.time()
    while _request_timestamps and now - _request_timestamps[0] > RATE_LIMIT_WINDOW:
        _request_timestamps.popleft()
    if len(_request_timestamps) >= RATE_LIMIT_CALLS:
        wait = RATE_LIMIT_WINDOW - (now - _request_timestamps[0])
        logger.info("Rate limit reached, sleeping %.1fs", wait)
        await asyncio.sleep(wait)


async def _get_json(session, url: str, retries: int = 3, backoff: float = 2.0):
    for attempt in range(retries):
        await _throttle()
        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                _request_timestamps.append(time.time())
                data = await response.json()
                if data.get("status") == "ok":
                    return data
                logger.warning("WAQI returned status=%s", data.get("status"))
        except (TimeoutError, aiohttp.ClientError, ValueError) as exc:
            logger.warning("WAQI request failed (%s)", type(exc).__name__)
        if attempt < retries - 1:
            await asyncio.sleep(backoff * (2 ** attempt))
    return None


def _station_url(record: dict, token: str) -> str:
    if record.get("uid") is not None:
        return f"https://api.waqi.info/feed/@{record['uid']}/?token={token}"
    name = "".join(c for c in record["location"] if c.isalnum() or c in " ,-").strip()
    return f"https://api.waqi.info/feed/{urllib.parse.quote(name, safe='')}/?token={token}"


async def fetch_waqi_data() -> list:
    """Return one record per WAQI station in the Bengaluru bounding box.

    ``aqi`` is the AQI WAQI reports for the station. ``pm25``/``pm10``/... are
    WAQI ``iaqi`` sub-indices (not raw concentrations). Results are cached for
    the current UTC hour.
    """
    token = config.waqi_api_key()
    if not token:
        raise WaqiError("WAQI_API_KEY is not set. Copy .env.example to .env and add your token.")

    cache_key = f"bengaluru_{datetime.now(pytz.UTC):%Y%m%d%H}"
    cached = _load_cache().get(cache_key)
    if cached:
        return cached

    c, span = config.CENTER, config.BBOX_HALF_SPAN
    bounds = f"{c['lat'] - span},{c['lon'] - span},{c['lat'] + span},{c['lon'] + span}"
    url = f"https://api.waqi.info/map/bounds/?token={token}&latlng={bounds}"

    async with aiohttp.ClientSession() as session:
        payload = await _get_json(session, url)
        if not payload:
            raise WaqiError("WAQI request failed. Check the API key or try again later.")

        records = []
        for station in payload["data"]:
            raw = station.get("aqi", "-")
            if raw in ("-", None, ""):
                continue  # station currently offline
            aqi = clean_float(raw)
            info = station.get("station", {})
            records.append({
                "uid": station.get("uid"),
                "location": info.get("name", "Unknown"),
                "latitude": clean_float(station.get("lat")),
                "longitude": clean_float(station.get("lon")),
                "aqi": aqi,
                "aqi_category": aqi_category(aqi),
                "pm25": aqi,  # refined from iaqi below when available
                "pm10": 0.0, "no2": 0.0, "so2": 0.0, "co": 0.0,
                "last_updated": info.get("time") or datetime.now(pytz.UTC).isoformat(),
                "forecast": {},
            })
        logger.info("Fetched %d stations from WAQI", len(records))

        semaphore = asyncio.Semaphore(5)

        async def enrich(record: dict) -> None:
            async with semaphore:
                data = await _get_json(session, _station_url(record, token), retries=2)
            if not data:
                return
            iaqi = data["data"].get("iaqi", {})
            for key in ("pm25", "pm10", "no2", "so2", "co"):
                if iaqi.get(key):
                    record[key] = clean_float(iaqi[key].get("v"))
            daily = data["data"].get("forecast", {}).get("daily", {})
            for days in daily.values():
                for day in days:
                    for k in ("avg", "min", "max"):
                        day[k] = clean_float(day.get(k))
            record["forecast"] = daily

        await asyncio.gather(*(enrich(r) for r in records))

    _save_cache(cache_key, records)
    return records


async def fetch_region_data(grid_name: str) -> list:
    """Stations that fall inside one grid cell."""
    records = await fetch_waqi_data()
    return [r for r in records if cell_name_for(r["latitude"], r["longitude"]) == grid_name]
