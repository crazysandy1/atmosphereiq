import pytest

from atmosphereiq_api.aqi import aqi_category, aqi_color, health_recommendation, pm25_to_aqi


@pytest.mark.parametrize(
    "pm25, expected",
    [(0, 0), (12, 50), (35.4, 100), (55.4, 150), (150.4, 200), (500.4, 500)],
)
def test_pm25_breakpoints(pm25, expected):
    assert pm25_to_aqi(pm25) == pytest.approx(expected, abs=0.6)


def test_pm25_garbage_is_zero():
    assert pm25_to_aqi("n/a") == 0
    assert pm25_to_aqi(float("nan")) == 0


@pytest.mark.parametrize(
    "aqi, category, colour",
    [
        (0, "Good", "green"),
        (50, "Good", "green"),
        (51, "Moderate", "yellow"),
        (150, "Unhealthy for Sensitive Groups", "orange"),
        (151, "Unhealthy", "red"),
        (250, "Very Unhealthy", "purple"),
        (301, "Hazardous", "maroon"),
    ],
)
def test_bands(aqi, category, colour):
    assert aqi_category(aqi) == category
    assert aqi_color(aqi) == colour


def test_bad_input_defaults_to_good():
    assert aqi_category(None) == "Good"
    assert "good" in health_recommendation(float("nan")).lower()
