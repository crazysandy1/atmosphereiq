# AtmosphereIQ

Live air-quality map and zone recommendations for Bengaluru, built on the free [WAQI](https://aqicn.org/api/) API.

The repo holds two ways to explore the same idea:

| Path | Stack | What it does |
| --- | --- | --- |
| [`services/api`](services/api) | FastAPI, GeoPandas, ReportLab | Pulls station data from WAQI, aggregates it into a 0.05° grid (~5.5 km), serves GeoJSON, per-region detail, a PDF report and a WebSocket feed. |
| [`apps/web-react`](apps/web-react) | React, Leaflet | Map UI for the API: grid colouring, station popups, pollutant and AQI filters, station search, PDF download. |
| [`apps/web-ai`](apps/web-ai) | Next.js 15, Genkit, Gemini, Google Maps | Standalone app that asks Gemini to recommend residential, commercial or industrial zones and gives personalised advice. |

Sample output from an earlier version is in [`examples/`](examples) (an interactive HTML map and a PDF report). Design notes and the original project report are in [`docs/`](docs).

## Quick start: API + React map

You need Python 3.11+, Node 20+ and a free [WAQI token](https://aqicn.org/data-platform/token/).

```bash
# 1. API
cd services/api
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # add your WAQI_API_KEY
uvicorn atmosphereiq_api.main:app --reload            # http://localhost:8000/docs

# 2. Map UI (new terminal)
cd apps/web-react
cp .env.example .env
npm install
npm start                                             # http://localhost:3000
```

Or run the API in Docker: `docker compose up --build` (reads `services/api/.env`).

## Quick start: AI zone recommender

```bash
cd apps/web-ai
cp .env.example .env     # GEMINI_API_KEY, WAQI_API_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
npm ci
npm run dev              # http://localhost:9002
```

## API

| Endpoint | Description |
| --- | --- |
| `GET /api/geojson?max_value=150&pollutant=aqi&search_term=` | Grid cells (GeoJSON) plus stations. `pollutant` is one of `aqi, pm25, pm10, no2, so2, co`. |
| `GET /api/region?grid_name=Grid_12.9500_77.6000` | Stations, mean pollutants and health advice for one cell. |
| `GET /api/report?...` | PDF of the worst-affected cells (same filters as `/api/geojson`). |
| `WS /ws/map` | Pushes the unfiltered payload every 5 minutes. |
| `GET /api/health` | Liveness check. |

## Data notes

- `aqi` is the AQI WAQI reports for the station. Offline stations are skipped.
- `pm25`, `pm10`, `no2`, `so2`, `co` are WAQI `iaqi` sub-indices, not raw µg/m³ concentrations.
- Station data is cached for the current UTC hour in `.cache/waqi_cache.json` (git-ignored). Redis caching is optional (`USE_REDIS=true`).
- WAQI limits requests per key. The client throttles to 50 calls per minute.

## Development

```bash
cd services/api
pip install -r requirements-dev.txt
ruff check . && pytest
```

CI runs the API tests, builds the React app and type-checks the Next.js app on every push and pull request.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Report security issues as described in [SECURITY.md](SECURITY.md). Never commit API keys.

## License

[MIT](LICENSE). Air-quality data comes from [aqicn.org](https://aqicn.org/) under its terms of use. Map tiles © OpenStreetMap contributors.
