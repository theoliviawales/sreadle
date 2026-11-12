/* The Day 12+ generator must be deterministic: the same puzzle number yields
   the identical rhythm on every run, in every browser. We load the whole game
   twice in two fresh vm contexts (two "runs") and compare the serialized
   rhythms for a sample of days, plus a same-context repeat check. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../scripts/lib/load-game.mjs';
import { measureBeats, EPS } from '../scripts/lib/validate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'index.html');

function serialize(game, n) {
  const def = game.generateDay(n);
  const chart = game.buildChart(def.measures);
  return JSON.stringify({
    bpm: def.bpm,
    measures: def.measures.length,
    elements: game.chartToElements(def),
    notes: chart.notes.map(x => [x.beat, x.dur, x.flam ? 1 : 0]),
    rests: chart.rests.map(x => [x.beat, x.dur])
  });
}

for (const n of [12, 50, 365]) {
  test(`generator determinism: day ${n} identical across two fresh runs`, () => {
    const runA = loadGame(indexPath);
    const runB = loadGame(indexPath);
    assert.equal(serialize(runB, n), serialize(runA, n), `day ${n}: generated rhythm differs between runs`);
  });
}

test('generator determinism: repeated calls in one run agree, and measures sum to 4', () => {
  const game = loadGame(indexPath);
  for (const n of [12, 25, 50, 100, 365]) {
    assert.equal(serialize(game, n), serialize(game, n), `day ${n}: repeated generation differs`);
    const els = game.chartToElements(game.generateDay(n));
    els.forEach((measure, mi) => {
      const total = measureBeats(measure);
      assert.ok(Math.abs(total - 4) <= EPS, `generated day ${n} measure ${mi + 1}: sums to ${total.toFixed(3)} beats, expected exactly 4`);
    });
  }
});

test('getDay routes days 1 to 11 to the authored table and 12+ to the generator', () => {
  const game = loadGame(indexPath);
  assert.equal(game.getDay(1).title, game.DAYS[0].title);
  assert.equal(game.getDay(11).title, game.DAYS[10].title);
  assert.equal(game.getDay(12).bpm, game.generateDay(12).bpm);
});
