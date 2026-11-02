/* Round-trips: every patterns/day-*.json must survive the full circle
   file -> shared validator -> the game's own sanitizeRhythm -> compiled
   chart -> chartToElements -> validator again, with notes and flams intact.
   This is the same path an admin export takes when it is published. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../scripts/lib/load-game.mjs';
import { validateRhythm, countFlams } from '../scripts/lib/validate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = loadGame(join(root, 'index.html'));
const files = readdirSync(join(root, 'patterns')).filter(f => /^day-\d+\.json$/.test(f)).sort();

test('patterns/day-*.json round-trip through the validator and the game sanitizer', async (t) => {
  assert.ok(files.length >= 10, `expected at least 10 pattern files, found ${files.length}`);
  for (const file of files) {
    await t.test(file, () => {
      const raw = JSON.parse(readFileSync(join(root, 'patterns', file), 'utf8'));

      const first = validateRhythm(raw, file);
      assert.ok(first.ok, `${file}: shared validator rejected it:\n${first.errors.join('\n')}`);

      const sanitized = game.sanitizeRhythm(JSON.parse(JSON.stringify(raw)));
      assert.ok(sanitized, `${file}: the game's sanitizeRhythm rejected it`);

      const second = validateRhythm(sanitized, `${file} after sanitize`);
      assert.ok(second.ok, `${file}: sanitized rhythm failed revalidation:\n${second.errors.join('\n')}`);

      const chartA = game.buildChart(game.defFromElements(first.rhythm).measures);
      const roundTripped = game.chartToElements(game.defFromElements(sanitized));
      const chartB = game.buildChart(game.defFromElements({ name: sanitized.name, bpm: sanitized.bpm, measures: roundTripped }).measures);
      assert.equal(chartB.notes.length, chartA.notes.length, `${file}: note count changed across the round-trip`);
      assert.equal(chartB.notes.filter(n => n.flam).length, chartA.notes.filter(n => n.flam).length,
        `${file}: flam count changed across the round-trip`);
      assert.equal(countFlams(second.rhythm), countFlams(first.rhythm), `${file}: element flam count changed across the round-trip`);
      assert.deepEqual(
        chartB.notes.map(n => [n.beat, n.dur]),
        chartA.notes.map(n => [n.beat, n.dur]),
        `${file}: note positions changed across the round-trip`
      );
    });
  }
});

test('validator rejects broken rhythms with the day and measure named', () => {
  const broken = { name: 'Broken', bpm: 67, measures: [[{ t: 'n', d: 1 }], [{ t: 'n', d: 1 }]] };
  const { ok, errors } = validateRhythm(broken, 'day 99');
  assert.equal(ok, false);
  assert.ok(errors.some(e => e.includes('day 99') && e.includes('measure 1')), `errors should name day and measure, got: ${errors.join(' | ')}`);

  const badFlam = { name: 'Bad flam', bpm: 67, measures: [[{ t: 'r', d: 2, flam: true }, { t: 'n', d: 2 }]] };
  const res2 = validateRhythm(badFlam, 'day 98');
  assert.equal(res2.ok, false);
  assert.ok(res2.errors.some(e => e.includes('flam')), `expected a flam error, got: ${res2.errors.join(' | ')}`);

  const badTuplet = { name: 'Bad tuplet', bpm: 500, measures: [[{ t: 't', n: 4, cells: [1, 1, 1, 1] }, { t: 'n', d: 1 }, { t: 'n', d: 1 }, { t: 'n', d: 1 }]] };
  const res3 = validateRhythm(badTuplet, 'day 97');
  assert.equal(res3.ok, false);
  assert.ok(res3.errors.some(e => e.includes('tuplet')), `expected a tuplet error, got: ${res3.errors.join(' | ')}`);
  assert.ok(res3.errors.some(e => e.includes('tempo')), `expected a tempo error, got: ${res3.errors.join(' | ')}`);
});
