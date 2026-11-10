/* Flag rendering rules: an ungrouped note's flags come from its undotted
   base value. A dotted eighth (effective duration 0.75) is still an eighth
   and needs one flag; keying off the effective duration alone drew it with
   no flag, identical to a dotted quarter (regression reported 2026-11-10,
   visible on Day 10's '1111', whose measure 6 stacks four dotted eighths
   that each stand alone). Dotted rests must also keep their dot through
   the chart so the renderer can draw it (Day 10 measure 8). */

import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from '../scripts/lib/load-game.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = loadGame(join(root, 'index.html'));

test('flags: flagCount follows the undotted base duration', async (t) => {
  const cases = [
    [{ dur: 0.5 }, 1, 'eighth'],
    [{ dur: 0.75, dot: true }, 1, 'dotted eighth'],
    [{ dur: 0.25 }, 2, 'sixteenth'],
    [{ dur: 0.375, dot: true }, 2, 'dotted sixteenth'],
    [{ dur: 0.125 }, 3, 'thirty-second'],
    [{ dur: 0.1875, dot: true }, 3, 'dotted thirty-second'],
    [{ dur: 1 }, 0, 'quarter'],
    [{ dur: 1.5, dot: true }, 0, 'dotted quarter'],
    [{ dur: 2 }, 0, 'half'],
    [{ dur: 3, dot: true }, 0, 'dotted half']
  ];
  for (const [note, expected, label] of cases) {
    await t.test(label, () => {
      assert.equal(game.flagCount(note), expected, `${label}: expected ${expected} flags`);
    });
  }
});

test('flags: day 10 measure 6 dotted eighths stand alone and each earns a flag', () => {
  const chart = game.buildChart(game.DAYS[9].measures);
  const m6 = chart.notes.filter(n => n.measure === 6 && n.dot);
  assert.equal(m6.length, 4, 'day 10 measure 6 should have four dotted notes');
  for (const n of m6) {
    assert.equal(n.dur, 0.75, 'dotted eighth effective duration');
    assert.equal(n.grouped, false, 'dotted eighths in measure 6 are ungrouped, so flags carry them');
    assert.equal(game.flagCount(n), 1, 'each dotted eighth needs exactly one flag');
  }
});

test('flags: day 10 measure 8 dotted rest keeps its dot in the chart and round-trips', () => {
  const chart = game.buildChart(game.DAYS[9].measures);
  const m8rests = chart.rests.filter(r => r.measure === 8);
  assert.equal(m8rests.length, 1, 'day 10 measure 8 should have one rest');
  assert.equal(m8rests[0].dot, true, 'the eighth rest in measure 8 is dotted');
  assert.equal(m8rests[0].dur, 0.75, 'dotted eighth rest effective duration');
  const els = game.chartToElements(game.DAYS[9]);
  const rel = els[7][1];
  assert.equal(rel.t, 'r', 'round-trip restores the dotted eighth rest element');
  assert.equal(rel.d, 0.5, 'round-tripped rest base duration');
  assert.equal(rel.dot, true, 'round-tripped rest dot');
});
