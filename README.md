# Game Mail — Case 01

Browser-based detective mystery disguised as a webmail client.

## Run locally

```
npm install
npm run dev
```

Opens on http://localhost:3000.

## Build for production

```
npm run build
```

Output in `dist/`. Deploy as static files to Vercel, Netlify, or zip for itch.io.

## Content pipeline

Email content lives in `design/email-bodies.md` and `design/case-01-email-metadata.md`. Never edit content in JS directly.

To regenerate after content edits:

```
npm run parse
```

This runs two scripts:
- `build/parse-content.cjs` — parses markdown into `data/emails.json`
- `build/hash-answers.cjs` — generates hashed board answers in `data/answer-hashes.js`

## Deploy to itch.io

1. `npm run build`
2. Zip the `dist/` folder
3. Upload to itch.io as HTML game

## Deploy to Vercel/Netlify

Point the build command to `npm run build` with output directory `dist/`.

## Playtest constants

All tunable values live in `src/config.js`:

- `EFB_THRESHOLDS` — how many emails (total, MISSING, AFFAIR) must be opened before the EFB arrives
- `BOARD_DROPDOWN_THRESHOLD` — emails opened in Sarah's inbox before dropdowns activate
- `BOARD_COOLDOWN_MS` — milliseconds between board submissions
- `PASSWORD_WORDS` — word pool for randomized credentials
- `ANALYTICS_ENABLED` — toggle event tracking (off by default)

Board answer synonyms (what free-text inputs are accepted as correct) are in `build/hash-answers.cjs`. After editing, re-run `npm run parse` to regenerate hashes.

## Architecture

- Static SPA, no backend
- Vanilla JS with Vite as bundler
- localStorage for all persistence (opened emails, stars, board state, credentials)
- Content parsed from markdown at build time, never hand-edited in code
- Board answers stored as salted SHA-256 hashes in the bundle
