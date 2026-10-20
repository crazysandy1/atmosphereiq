"""AQI helpers: category, map colour and health advice (US EPA breakpoints)."""

from __future__ import annotations

import math

# (upper bound, category, map colour, advice)
_BANDS = [
    (50, "Good", "green", "Air quality is good. Enjoy outdoor activities."),
    (100, "Moderate", "yellow",
     "Air quality is moderate. Sensitive groups should limit prolonged outdoor exertion."),
    (150, "Unhealthy for Sensitive Groups", "orange",
     "Unhealthy for sensitive groups. Reduce outdoor activities."),
    (200, "Unhealthy", "red",
     "Air quality is unhealthy. Avoid prolonged outdoor activities."),
    (300, "Very Unhealthy", "purple",
     "Air quality is very unhealthy. Avoid outdoor activities and use air purifiers indoors."),
    (math.inf, "Hazardous", "maroon",
     "Air quality is hazardous. Stay indoors and avoid outdoor exposure."),
]

# PM2.5 (ug/m3) -> AQI, US EPA 2012 breakpoints: (c_low, c_high, i_low, i_high)
_PM25_BREAKPOINTS = [
    (0.0, 12.0, 0, 50),
    (12.1, 35.4, 51, 100),
    (35.5, 55.4, 101, 150),
    (55.5, 150.4, 151, 200),
    (150.5, 250.4, 201, 300),
    (250.5, 350.4, 301, 400),
    (350.5, 500.4, 401, 500),
]


def _clean(value: object) -> float:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0
    return 0.0 if math.isnan(number) or math.isinf(number) else max(number, 0.0)


def aqi_band(aqi: object) -> tuple[str, str, str]:
    """Return ``(category, colour, advice)`` for an AQI value."""
    value = _clean(aqi)
    for upper, category, colour, advice in _BANDS:
        if value <= upper:
            return category, colour, advice
    raise AssertionError("unreachable")  # pragma: no cover


def aqi_category(aqi: object) -> str:
    return aqi_band(aqi)[0]


def aqi_color(aqi: object) -> str:
    return aqi_band(aqi)[1]


def health_recommendation(aqi: object) -> str:
    return aqi_band(aqi)[2]


def pm25_to_aqi(pm25: object) -> float:
    """Convert a PM2.5 concentration (ug/m3) to a US EPA AQI value."""
    value = _clean(pm25)
    for c_low, c_high, i_low, i_high in _PM25_BREAKPOINTS:
        if value <= c_high:
            return (i_high - i_low) / (c_high - c_low) * (max(value, c_low) - c_low) + i_low
    return 500.0
