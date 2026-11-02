/* One-time (and re-runnable) extraction of the 10 hand-written days embedded
   in index.html into patterns/day-001.json .. day-010.json.
   Uses the game's own chartToElements, so the files are in exactly the shape
   the admin creator exports: { name, bpm, measures }.
   Usage: node scripts/extract-days.mjs */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/load-game.mjs';
import { validateRhythm } from './lib/validate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = loadGame(join(root, 'index.html'));

mkdirSync(join(root, 'patterns'), { recursive: true });

let failed = false;
game.DAYS.forEach((def, i) => {
  const day = i + 1;
  const entry = { name: def.title, bpm: def.bpm, measures: game.chartToElements(def), day };
  const { ok, errors, rhythm } = validateRhythm(entry, `day ${day}`);
  if (!ok) {
    console.error(`day ${day} failed validation after extraction:`);
    errors.forEach(e => console.error(`  ${e}`));
    failed = true;
    return;
  }
  const file = join(root, 'patterns', `day-${String(day).padStart(3, '0')}.json`);
  writeFileSync(file, JSON.stringify(rhythm, null, 2) + '\n');
  console.log(`wrote patterns/day-${String(day).padStart(3, '0')}.json (${rhythm.measures.length} measures, ${rhythm.bpm} BPM)`);
});

if (failed) process.exit(1);
console.log('Extraction complete: 10 authored days written to patterns/.');
