/* Authored-day integrity: every measure of every authored day, both as
   embedded in index.html (the DAYS table) and as shipped in patterns.json,
   sums to exactly 4 beats with no gaps in the compiled chart.
   Failures name the day and the measure. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../scripts/lib/load-game.mjs';
import { measureBeats, EPS } from '../scripts/lib/validate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = loadGame(join(root, 'index.html'));
const patternsJson = JSON.parse(readFileSync(join(root, 'patterns.json'), 'utf8'));

/* Walk the notes and rests of one compiled measure and require them to tile
   [0, 4) with no gap larger than the tolerance. */
function assertCoverage(dayLabel, def) {
  const chart = game.buildChart(def.measures);
  assert.equal(chart.totalBeats, def.measures.length * 4, `${dayLabel}: total beats`);
  for (let m = 1; m <= def.measures.length; m++) {
    const base = (m - 1) * 4;
    const ivs = [];
    chart.notes.forEach(n => { if (n.measure === m) ivs.push([n.beat - base, n.beat - base + n.dur]); });
    chart.rests.forEach(r => { if (r.measure === m) ivs.push([r.beat - base, r.beat - base + r.dur]); });
    ivs.sort((a, b) => a[0] - b[0]);
    let cursor = 0;
    for (const [s, e] of ivs) {
      assert.ok(s <= cursor + 0.02, `${dayLabel} measure ${m}: gap before ${s.toFixed(3)} (coverage reached ${cursor.toFixed(3)})`);
      cursor = Math.max(cursor, e);
    }
    assert.ok(Math.abs(cursor - 4) <= EPS, `${dayLabel} measure ${m}: coverage ends at ${cursor.toFixed(3)} beats, expected 4`);
  }
}

function assertElementSums(dayLabel, measures) {
  measures.forEach((els, mi) => {
    const total = measureBeats(els);
    assert.ok(Math.abs(total - 4) <= EPS, `${dayLabel} measure ${mi + 1}: elements sum to ${total.toFixed(3)} beats, expected exactly 4`);
  });
}

test('embedded DAYS in index.html: 11 days, each measure sums to 4 with no gaps', async (t) => {
  assert.equal(game.DAYS.length, 11, 'index.html should embed exactly 11 hand-written days');
  for (let i = 0; i < game.DAYS.length; i++) {
    const day = i + 1;
    await t.test(`day ${day}`, () => {
      assertElementSums(`embedded day ${day}`, game.chartToElements(game.DAYS[i]));
      assertCoverage(`embedded day ${day}`, game.DAYS[i]);
    });
  }
});

test('patterns.json: keys match patterns/day-*.json and every measure sums to 4 with no gaps', async (t) => {
  const { readdirSync } = await import('node:fs');
  const files = readdirSync(join(root, 'patterns')).filter(f => /^day-\d+\.json$/.test(f)).sort();
  const fileDays = files.map(f => String(parseInt(f.slice(4, 7), 10)));
  assert.deepEqual(Object.keys(patternsJson).sort((a, b) => a - b), fileDays,
    'patterns.json keys do not match the patterns/day-*.json files on disk (rerun: node scripts/build-patterns.mjs)');
  for (const day of Object.keys(patternsJson)) {
    await t.test(`day ${day}`, () => {
      const rhythm = patternsJson[day];
      assertElementSums(`patterns.json day ${day}`, rhythm.measures);
      assertCoverage(`patterns.json day ${day}`, game.defFromElements(rhythm));
    });
  }
});

test('patterns.json agrees with the embedded DAYS (same name, bpm, notes)', () => {
  for (let i = 0; i < game.DAYS.length; i++) {
    const day = String(i + 1);
    const rhythm = patternsJson[day];
    assert.ok(rhythm, `patterns.json is missing day ${day}`);
    assert.equal(rhythm.name, game.DAYS[i].title, `day ${day}: name differs from index.html title`);
    assert.equal(rhythm.bpm, game.DAYS[i].bpm, `day ${day}: bpm differs from index.html`);
    /* The game's own import path (sanitizeRhythm) rounds durations to 3
       decimals, so the exported files carry 0.667 where the embedded table
       has 2/3. Compare positions and durations to 2 decimal places. */
    const round2 = (x) => Math.round(x * 100) / 100;
    const a = game.buildChart(game.DAYS[i].measures).notes.map(n => [round2(n.beat), round2(n.dur), n.flam ? 1 : 0]);
    const b = game.buildChart(game.defFromElements(rhythm).measures).notes.map(n => [round2(n.beat), round2(n.dur), n.flam ? 1 : 0]);
    assert.deepEqual(b, a, `day ${day}: notes compiled from patterns.json differ from the embedded day`);
  }
});
