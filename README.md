# Sreadle (Sight Readle)

A daily rhythm sight-reading game, in the spirit of Wordle: one new rhythm to
sight read every day, the same for everyone.

A one-line rhythm staff scrolls under a fixed playhead. Tap the pad (or press
any key) exactly when each note crosses the line. You are judged on timing:
Perfect, Great, Good, or Miss, with a score out of 1000, an accuracy
percentage, and a streak to keep alive.

## How it works

- 4/4, one puzzle per day, rolling over at midnight America/Los_Angeles.
- Day 1 was November 2, 2026. Days 1 to 10 are hand-written rhythms (Day 1 is
  the Level 8 exercise with quintuplet, sextuplet, and septuplet groups);
  Day 11 onward is generated in the browser by a seeded generator keyed to
  the puzzle number, so the daily rhythm is identical for every player with
  no server.
- The metronome clicks on every beat for the whole round.
- Each daily puzzle allows 2 attempts; after that it locks and keeps your
  best result. The results screen shares Wordle-style text (accuracy, score,
  per-measure squares) with a deep link to that day's puzzle, for example
  `https://sreadle.fun/?day=4`.
- Your personal stats (streak, best scores) are stored only in your
  browser's localStorage. The game also sends one anonymous beacon per
  finished round to a stats endpoint that keeps only aggregate counters
  per day (plays, finishes, accuracy bands, shares). No accounts, no
  cookies, no tracking of individual players.

## Creating rhythms (admin page)

The game includes a phone-friendly admin page (the Create/Admin button in the
game, hash route `#/admin`) for composing new rhythms: pick durations and
tuplets (3, 5, 6, 7), flip notes to rests, dot notes, add flams (a grace note
just before a main note, played as two quick taps), preview with real
notation, and test-play before saving. Saved rhythms stay in the browser;
exporting one as JSON and adding it to the authored data in `index.html` is
how a rhythm becomes official for all players (see `DEPLOYMENT.md`).

## Files

- `index.html`: the entire game, self-contained (no build step).
- `patterns/day-001.json` to `day-010.json`: the authored rhythms as data
  files; `patterns.json` is built from them by `scripts/build-patterns.mjs`.
  Publish a new day with `node scripts/publish-pattern.mjs export.json N`.
- `tests/`: the automated test suite, run with `npm test` (Node only, no
  dependencies). CI runs it, plus the patterns build, on every push.
- `functions/api/stats.js`: the aggregate stats endpoint (a Cloudflare
  Pages Function backed by a D1 database, bound in `wrangler.toml`).
- `DEPLOYMENT.md`: how the public hosting works, now Cloudflare Pages with
  automatic deploys on every push to `main`.

## Play it locally

Open `index.html` in any modern browser, or serve the folder with any static
file server.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md). Short version: the game is live at
**https://sreadle.fun** (Cloudflare Pages, connected to this
repository; every push to `main` redeploys). The GitHub Pages mirror at
`https://theoliviawales.github.io/sreadle/` updates from the same pushes.
