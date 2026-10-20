"""Aggregate station readings into a regular lat/lon grid."""

from __future__ import annotations

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import box

from .aqi import aqi_category, aqi_color

GRID_SPACING = 0.05  # degrees, ~5.5 km
POLLUTANTS = ["aqi", "pm25", "pm10", "no2", "so2", "co"]
_EPS = 1e-9


def cell_index(lat: float, lon: float) -> tuple[int, int]:
    """Grid cell (row, col) containing a coordinate."""
    return (
        int(np.floor(lat / GRID_SPACING + _EPS)),
        int(np.floor(lon / GRID_SPACING + _EPS)),
    )


def cell_name(row: int, col: int) -> str:
    """Stable cell id built from the south-west corner."""
    return f"Grid_{row * GRID_SPACING:.4f}_{col * GRID_SPACING:.4f}"


def cell_name_for(lat: float, lon: float) -> str:
    return cell_name(*cell_index(lat, lon))


def process_grid_aqi(records: list[dict]) -> gpd.GeoDataFrame:
    """Return one polygon per grid cell that contains at least one station."""
    if not records:
        return gpd.GeoDataFrame()

    df = pd.DataFrame(records)
    for col in POLLUTANTS:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    cells = [cell_index(lat, lon) for lat, lon in zip(df["latitude"], df["longitude"])]
    df["row"] = [c[0] for c in cells]
    df["col"] = [c[1] for c in cells]

    rows = []
    for (row, col), group in df.groupby(["row", "col"]):
        mean_aqi = float(group["aqi"].mean())
        rows.append({
            "grid_name": cell_name(row, col),
            "stations": ", ".join(group["location"].tolist()),
            "aqi": mean_aqi,
            "aqi_category": aqi_category(mean_aqi),
            "color": aqi_color(mean_aqi),
            **{p: float(group[p].mean()) for p in POLLUTANTS if p != "aqi"},
            "score": float(max(0.0, 100.0 - mean_aqi * 0.5)),
            "geometry": box(
                col * GRID_SPACING, row * GRID_SPACING,
                (col + 1) * GRID_SPACING, (row + 1) * GRID_SPACING,
            ),
        })

    return gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
