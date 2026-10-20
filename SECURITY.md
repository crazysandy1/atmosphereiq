# Security

- Never commit API keys. Copy each `.env.example` to `.env`; `.env` files are git-ignored.
- Restrict `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` by HTTP referrer, because it ships to the browser.
- Report vulnerabilities privately through GitHub's "Report a vulnerability" button on the Security tab.
