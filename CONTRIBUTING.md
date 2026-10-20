# Contributing

Thanks for helping. Small, focused pull requests are easiest to review.

1. Fork and clone the repo, then create a branch: `git checkout -b feat/my-change`.
2. Set up the part you are changing (see the README).
3. Run the checks before you push:
   - API: `cd services/api && ruff check . && pytest`
   - React app: `cd apps/web-react && npm run build`
   - AI app: `cd apps/web-ai && npm run typecheck`
4. Open a pull request that says what changed and why.

Good first issues: more cities, raw pollutant concentrations, land-use and amenity scoring from OpenStreetMap, a Docker setup for the web apps.

Never include API keys in issues, commits or screenshots.
