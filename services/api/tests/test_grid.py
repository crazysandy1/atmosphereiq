from atmosphereiq_api.grid_processor import cell_name_for, process_grid_aqi


def record(name, lat, lon, aqi):
    return {
        "location": name, "latitude": lat, "longitude": lon, "aqi": aqi,
        "pm25": aqi, "pm10": 0, "no2": 0, "so2": 0, "co": 0,
    }


def test_stations_in_same_cell_are_averaged():
    grid = process_grid_aqi([record("A", 12.971, 77.591, 40), record("B", 12.972, 77.592, 60)])
    assert len(grid) == 1
    row = grid.iloc[0]
    assert row["aqi"] == 50
    assert row["aqi_category"] == "Good"
    assert row["stations"] == "A, B"


def test_far_stations_get_separate_cells():
    grid = process_grid_aqi([record("A", 12.9, 77.5, 40), record("B", 13.3, 77.9, 160)])
    assert len(grid) == 2
    assert set(grid["color"]) == {"green", "red"}


def test_cell_name_matches_polygon():
    grid = process_grid_aqi([record("A", 12.9716, 77.5946, 80)])
    assert grid.iloc[0]["grid_name"] == cell_name_for(12.9716, 77.5946)
    minx, miny, maxx, maxy = grid.iloc[0].geometry.bounds
    assert miny <= 12.9716 < maxy and minx <= 77.5946 < maxx


def test_empty():
    assert len(process_grid_aqi([])) == 0
