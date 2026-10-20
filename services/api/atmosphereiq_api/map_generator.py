"""GeoJSON and PDF output."""

from __future__ import annotations

import json
import math
from datetime import datetime
from io import BytesIO

import geopandas as gpd
import pandas as pd
import pytz
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


def clean_json(data):
    """Recursively replace NaN/inf with 0.0 so the payload is valid JSON."""
    if isinstance(data, dict):
        return {k: clean_json(v) for k, v in data.items()}
    if isinstance(data, list):
        return [clean_json(v) for v in data]
    if isinstance(data, float) and (math.isnan(data) or math.isinf(data)):
        return 0.0
    return data


def generate_geojson(grid_gdf: gpd.GeoDataFrame, stations_df: pd.DataFrame) -> dict:
    """Build the ``{grids, stations}`` payload served to the frontends."""
    grids = json.loads(grid_gdf.to_json()) if len(grid_gdf) else {"type": "FeatureCollection", "features": []}
    return clean_json({"grids": grids, "stations": stations_df.to_dict(orient="records")})


def generate_pdf_report(grid_gdf: gpd.GeoDataFrame, limit: int = 30) -> BytesIO:
    """Render a simple PDF report of the worst-affected grid cells."""
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, 750, "Bengaluru Air Quality Report")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(50, 732, f"Generated: {datetime.now(pytz.UTC):%Y-%m-%d %H:%M UTC}")

    y = 706
    ranked = grid_gdf.sort_values("aqi", ascending=False).head(limit) if len(grid_gdf) else grid_gdf
    if not len(ranked):
        pdf.drawString(50, y, "No grid cells match the selected filters.")
    for _, row in ranked.iterrows():
        pdf.drawString(
            50, y,
            f"{row['grid_name']}  AQI {row['aqi']:.0f} ({row['aqi_category']})  "
            f"PM2.5 {row['pm25']:.0f}  Score {row['score']:.0f}",
        )
        y -= 18
        if y < 50:
            pdf.showPage()
            pdf.setFont("Helvetica", 10)
            y = 750

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer
