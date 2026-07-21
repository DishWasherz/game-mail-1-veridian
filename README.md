# Game Mail — Case 01

Browser-based detective mystery disguised as a webmail client.

Push to main deploys automatically via Railway.

## Run locally

```
npm install
npm run dev
```

Opens on http://localhost:3000. Analytics disabled on localhost.

## Build for production

```
npm run build
```

Output in `dist/`. Served in production by `npm start` (uses `serve -s` for SPA fallback).

## Deploy (Railway)

Railway auto-deploys on push to main. Required environment variables:

- `POSTHOG_KEY` — PostHog project API key
- `POSTHOG_HOST` — PostHog ingest host (e.g. `https://eu.i.posthog.com`)
- `SESSION_REPLAY` — `true` for playtest builds, omit or `false` for public launch

Railway config: build command `npm run build`, start command `npm start`. The `PORT` env var is provided by Railway automatically.

## Content pipeline

Email content lives in the design folder (separate from this repo). The parsed output `data/emails.json` is committed. To regenerate after content edits:

```
npm run parse
```

## Playtest constants

All tunable values live in `src/config.js`:

- `EFB_THRESHOLDS` — how many emails (total, MISSING, AFFAIR) must be opened before the EFB arrives
- `BOARD_DROPDOWN_THRESHOLD` — emails opened in Sarah's inbox before dropdowns activate
- `BOARD_COOLDOWN_MS` — milliseconds between board submissions
- `BOARD_KEYWORDS` — free-text pass/fail keyword lists per field

## Architecture

- Static SPA, no backend
- Vanilla JS with Vite as bundler
- localStorage for all persistence (opened emails, stars, board state, credentials)
- Content parsed from markdown at build time, never hand-edited in code
- PostHog analytics (EU host, cookieless, no autocapture)
