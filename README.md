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
- Stats (streak, best scores) are stored only in your browser's localStorage.

## Creating rhythms (admin page)

The game includes a phone-friendly admin page (the Create/Admin button in the
game, hash route `#/admin`) for composing new rhythms: pick durations and
tuplets (3, 5, 6, 7), flip notes to rests, dot notes, preview with real
notation, and test-play before saving. Saved rhythms stay in the browser;
exporting one as JSON and adding it to the authored data in `index.html` is
how a rhythm becomes official for all players (see `DEPLOYMENT.md`).

## Files

- `index.html`: the entire game, self-contained (no build step).
- `DEPLOYMENT.md`: the plan for hosting it publicly, starting with free
  GitHub Pages.

## Play it locally

Open `index.html` in any modern browser, or serve the folder with any static
file server.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md). Short version: enable GitHub Pages on
this repository (Settings, Pages, deploy from `main`, root folder) and the
game is live at `https://theoliviawales.github.io/sreadle/`.
