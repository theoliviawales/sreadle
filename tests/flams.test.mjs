/* Flam rules: authored days may carry flams when the owner publishes them
   (Day 2 was replaced with an authored flam-heavy rhythm on 2026-11-02,
   Day 9 with the owner's '1110' on 2026-11-10, and Day 11 with the owner's
   '1112' on 2026-11-11, which carries 7 flams);
   Day 10 was replaced with the owner's '1111' on 2026-11-10, which carries
   exactly 2 flams, so its original cap of at most 2 still applies, and a
   generated day has at most 1. Counts are taken from the compiled charts
   (a flam is a flag on the main note) and, for the authored days,
   cross-checked against patterns.json so the embedded and published
   copies never drift. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../scripts/lib/load-game.mjs';
import { countFlams } from '../scripts/lib/validate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = loadGame(join(root, 'index.html'));
const patternsJson = JSON.parse(readFileSync(join(root, 'patterns.json'), 'utf8'));

function chartFlams(def) {
  return game.buildChart(def.measures).notes.filter(n => n.flam).length;
}

test('flams: authored days agree between index.html and patterns.json; day 10 has at most 2', async (t) => {
  for (let i = 0; i < 11; i++) {
    const day = i + 1;
    await t.test(`day ${day}`, () => {
      const count = chartFlams(game.DAYS[i]);
      if (day === 10) assert.ok(count <= 2, `day ${day}: expected at most 2 flams, found ${count}`);
      assert.equal(countFlams(patternsJson[String(day)]), count, `day ${day}: patterns.json flam count differs from index.html`);
    });
  }
});

test('flams: generated days have at most 1 (sampled days 12 to 80)', async (t) => {
  for (let n = 12; n <= 80; n++) {
    await t.test(`day ${n}`, () => {
      const count = chartFlams(game.generateDay(n));
      assert.ok(count <= 1, `generated day ${n}: expected at most 1 flam, found ${count}`);
    });
  }
});
