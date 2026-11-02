/* Builds patterns.json (repo root) from patterns/day-*.json.
   Every pattern file is validated first (see scripts/lib/validate.mjs):
   each measure sums to exactly 4 beats, tempo in a sane range, at most
   8 measures, tuplet and flam data well-formed. Any invalid file fails the
   build with the day and measure named.
   Usage: node scripts/build-patterns.mjs */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRhythm } from './lib/validate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const patternsDir = join(root, 'patterns');

export function collectPatterns() {
  const files = readdirSync(patternsDir)
    .filter(f => /^day-\d+\.json$/.test(f))
    .sort();
  if (!files.length) throw new Error('patterns/: no day-*.json files found');
  const out = {};
  const errors = [];
  for (const file of files) {
    const day = parseInt(file.match(/^day-(\d+)\.json$/)[1], 10);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(patternsDir, file), 'utf8'));
    } catch (e) {
      errors.push(`patterns/${file}: invalid JSON (${e.message})`);
      continue;
    }
    const { ok, errors: errs, rhythm } = validateRhythm(parsed, `patterns/${file} (day ${day})`);
    if (!ok) { errors.push(...errs); continue; }
    if (rhythm.day !== undefined && rhythm.day !== day) {
      errors.push(`patterns/${file}: "day" field says ${rhythm.day} but the file name says day ${day}`);
      continue;
    }
    out[day] = rhythm;
  }
  if (errors.length) {
    const err = new Error(`pattern validation failed:\n${errors.map(e => `  ${e}`).join('\n')}`);
    err.validationErrors = errors;
    throw err;
  }
  return out;
}

export function buildPatterns() {
  const patterns = collectPatterns();
  const target = join(root, 'patterns.json');
  writeFileSync(target, JSON.stringify(patterns, null, 2) + '\n');
  return patterns;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const patterns = buildPatterns();
    const days = Object.keys(patterns);
    console.log(`patterns.json written: ${days.length} authored days (${days.join(', ')}).`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
