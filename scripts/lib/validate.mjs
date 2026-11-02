/* Shared rhythm validator for the patterns pipeline.
   These rules mirror the game's own sanitizeRhythm in index.html:
   - a rhythm is { name, bpm, measures } (the admin creator's export shape;
     "tempo" is accepted as an alias for "bpm" and normalized to "bpm")
   - 1 to 8 measures
   - tempo (bpm) between 30 and 200
   - each measure's elements sum to exactly 4 beats (tolerance 0.011)
   - an element is { t:'n'|'r', d, dot?, flam? } with 0 < d <= 2, flam only
     on notes, or a tuplet { t:'t', n: 3|5|6|7, cells: [0/1, ...] } that
     spans exactly 1 beat with one cell per tuplet member */

export const EPS = 0.011;
export const TUPLET_SIZES = [3, 5, 6, 7];
export const MIN_BPM = 30;
export const MAX_BPM = 200;
export const MAX_MEASURES = 8;

export function elementBeats(el) {
  if (el.t === 't') return 1;
  return el.d * (el.dot ? 1.5 : 1);
}

export function measureBeats(elements) {
  return elements.reduce((sum, el) => sum + elementBeats(el), 0);
}

/* validateRhythm(input, label) -> { ok, errors, rhythm }
   On success, rhythm is the normalized { name, bpm, measures } object
   (plus day when a valid day was present in the input). */
export function validateRhythm(input, label = 'rhythm') {
  const errors = [];
  const fail = (msg) => errors.push(`${label}: ${msg}`);

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: [`${label}: not a rhythm object`], rhythm: null };
  }

  const name = typeof input.name === 'string' ? input.name.trim().slice(0, 60) : '';
  if (!name) fail('missing or empty "name"');

  const rawBpm = input.bpm !== undefined ? input.bpm : input.tempo;
  const bpm = parseInt(rawBpm, 10);
  if (!(bpm >= MIN_BPM && bpm <= MAX_BPM)) {
    fail(`tempo (bpm) ${JSON.stringify(rawBpm)} is outside the sane range ${MIN_BPM} to ${MAX_BPM}`);
  }

  if (!Array.isArray(input.measures)) {
    fail('"measures" is not an array');
    return { ok: false, errors, rhythm: null };
  }
  if (input.measures.length < 1 || input.measures.length > MAX_MEASURES) {
    fail(`has ${input.measures.length} measures, expected 1 to ${MAX_MEASURES}`);
  }

  const measures = [];
  input.measures.forEach((src, mi) => {
    const mLabel = `${label} measure ${mi + 1}`;
    if (!Array.isArray(src)) { fail(`measure ${mi + 1} is not an array`); return; }
    const els = [];
    src.forEach((e, ei) => {
      const eLabel = `${mLabel} element ${ei + 1}`;
      if (!e || typeof e !== 'object') { fail(`${eLabel}: not an object`); return; }
      if (e.t === 't') {
        if (!TUPLET_SIZES.includes(e.n)) {
          fail(`${eLabel}: tuplet size ${JSON.stringify(e.n)} is not one of ${TUPLET_SIZES.join(', ')}`);
          return;
        }
        if (!Array.isArray(e.cells) || e.cells.length !== e.n) {
          fail(`${eLabel}: tuplet of ${e.n} needs exactly ${e.n} cells`);
          return;
        }
        if (e.flam) { fail(`${eLabel}: flam is not allowed on a tuplet group`); return; }
        if (e.dot) { fail(`${eLabel}: dot is not allowed on a tuplet group`); return; }
        els.push({ t: 't', n: e.n, cells: e.cells.map(c => (c ? 1 : 0)) });
      } else if (e.t === 'n' || e.t === 'r') {
        const d = parseFloat(e.d);
        if (!(d > 0) || d > 2) {
          fail(`${eLabel}: duration ${JSON.stringify(e.d)} is outside (0, 2] beats`);
          return;
        }
        if (e.flam && e.t === 'r') {
          fail(`${eLabel}: flam is only allowed on notes, not rests`);
          return;
        }
        const el = { t: e.t, d: Math.round(d * 1000) / 1000 };
        if (e.dot) el.dot = true;
        if (e.t === 'n' && e.flam) el.flam = true;
        els.push(el);
      } else {
        fail(`${eLabel}: unknown element type ${JSON.stringify(e.t)}`);
      }
    });
    const total = measureBeats(els);
    if (Math.abs(total - 4) > EPS) {
      fail(`measure ${mi + 1} sums to ${Math.round(total * 1000) / 1000} beats, expected exactly 4`);
    }
    measures.push(els);
  });

  if (errors.length) return { ok: false, errors, rhythm: null };

  const rhythm = { name, bpm, measures };
  const day = parseInt(input.day, 10);
  if (day >= 1 && day <= 9999) rhythm.day = day;
  return { ok: true, errors: [], rhythm };
}

export function countFlams(rhythm) {
  let n = 0;
  for (const els of rhythm.measures) for (const el of els) if (el.flam) n++;
  return n;
}
