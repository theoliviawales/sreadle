/* Publishes one admin-exported rhythm as an official day.
   Usage: node scripts/publish-pattern.mjs <exported-rhythm.json> <day>
   Validates the export with the same rules as the patterns build, writes
   patterns/day-<day>.json (setting its "day" field to the target day), then
   regenerates patterns.json. Commit and push afterwards and CI does the
   rest. */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRhythm } from './lib/validate.mjs';
import { buildPatterns } from './build-patterns.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [srcPath, dayArg] = process.argv.slice(2);

if (!srcPath || !dayArg) {
  console.error('Usage: node scripts/publish-pattern.mjs <exported-rhythm.json> <day>');
  process.exit(2);
}
const day = parseInt(dayArg, 10);
if (!(day >= 1 && day <= 9999)) {
  console.error(`Invalid day number: ${dayArg}`);
  process.exit(2);
}

let parsed;
try {
  parsed = JSON.parse(readFileSync(srcPath, 'utf8'));
} catch (e) {
  console.error(`Could not read ${srcPath} as JSON: ${e.message}`);
  process.exit(1);
}

const { ok, errors, rhythm } = validateRhythm(parsed, srcPath);
if (!ok) {
  console.error('The exported rhythm is not valid, nothing was published:');
  errors.forEach(e => console.error(`  ${e}`));
  process.exit(1);
}
if (rhythm.day !== undefined && rhythm.day !== day) {
  console.log(`Note: the export was marked for day ${rhythm.day}; publishing it as day ${day} instead.`);
}
rhythm.day = day;

const target = join(root, 'patterns', `day-${String(day).padStart(3, '0')}.json`);
writeFileSync(target, JSON.stringify(rhythm, null, 2) + '\n');
console.log(`Wrote patterns/day-${String(day).padStart(3, '0')}.json ("${rhythm.name}", ${rhythm.bpm} BPM, ${rhythm.measures.length} measures).`);

try {
  const patterns = buildPatterns();
  console.log(`patterns.json regenerated: ${Object.keys(patterns).length} authored days.`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
console.log('Next step: git add patterns patterns.json && git commit && git push.');
