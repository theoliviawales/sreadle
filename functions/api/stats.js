// Sreadle aggregate stats endpoint (Cloudflare Pages Function, route /api/stats).
//
// Privacy contract: this endpoint stores ONLY running aggregate counters per
// puzzle day. It never stores IP addresses, user agents, cookies, timestamps
// of individual events, or any per-player record. The request body is an
// allowlist; anything else is rejected.

const EVENTS = new Set(["complete", "abandon", "share"]);

function emptyCounters() {
  return {
    plays: 0, completes: 0, abandons: 0, shares: 0,
    att1: 0, att2: 0, acc0: 0, acc1: 0, acc2: 0, acc3: 0,
  };
}

async function ensureTable(db) {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS daily_stats (
       day INTEGER PRIMARY KEY,
       plays INTEGER NOT NULL DEFAULT 0,
       completes INTEGER NOT NULL DEFAULT 0,
       abandons INTEGER NOT NULL DEFAULT 0,
       shares INTEGER NOT NULL DEFAULT 0,
       att1 INTEGER NOT NULL DEFAULT 0,
       att2 INTEGER NOT NULL DEFAULT 0,
       acc0 INTEGER NOT NULL DEFAULT 0,
       acc1 INTEGER NOT NULL DEFAULT 0,
       acc2 INTEGER NOT NULL DEFAULT 0,
       acc3 INTEGER NOT NULL DEFAULT 0
     )`
  ).run();
}

function validate(body) {
  if (body === null || typeof body !== "object") return null;
  const { v, day, event, attempt, accBucket } = body;
  if (v !== 1) return null;
  if (!Number.isInteger(day) || day < 1 || day > 100000) return null;
  if (!EVENTS.has(event)) return null;
  if (event === "share") return { day, event };
  if (attempt !== 1 && attempt !== 2) return null;
  if (!Number.isInteger(accBucket) || accBucket < 0 || accBucket > 3) return null;
  return { day, event, attempt, accBucket };
}

function incrementsFor(valid) {
  const c = emptyCounters();
  if (valid.event === "share") {
    c.shares = 1;
    return c;
  }
  c.plays = 1;
  if (valid.event === "complete") c.completes = 1;
  if (valid.event === "abandon") c.abandons = 1;
  if (valid.attempt === 1) c.att1 = 1; else c.att2 = 1;
  c["acc" + valid.accBucket] = 1;
  return c;
}

export async function onRequestPost(context) {
  const db = context.env && context.env.STATS;
  if (!db) return new Response("stats unavailable", { status: 503 });
  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const valid = validate(body);
  if (!valid) return new Response("bad request", { status: 400 });
  const c = incrementsFor(valid);
  await ensureTable(db);
  await db.prepare(
    `INSERT INTO daily_stats (day, plays, completes, abandons, shares, att1, att2, acc0, acc1, acc2, acc3)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
     ON CONFLICT(day) DO UPDATE SET
       plays = plays + excluded.plays,
       completes = completes + excluded.completes,
       abandons = abandons + excluded.abandons,
       shares = shares + excluded.shares,
       att1 = att1 + excluded.att1,
       att2 = att2 + excluded.att2,
       acc0 = acc0 + excluded.acc0,
       acc1 = acc1 + excluded.acc1,
       acc2 = acc2 + excluded.acc2,
       acc3 = acc3 + excluded.acc3`
  ).bind(
    valid.day, c.plays, c.completes, c.abandons, c.shares,
    c.att1, c.att2, c.acc0, c.acc1, c.acc2, c.acc3
  ).run();
  return new Response(null, { status: 204 });
}

export async function onRequestGet(context) {
  const db = context.env && context.env.STATS;
  if (!db) return new Response("stats unavailable", { status: 503 });
  await ensureTable(db);
  const { results } = await db.prepare(
    "SELECT day, plays, completes, abandons, shares, att1, att2, acc0, acc1, acc2, acc3 FROM daily_stats ORDER BY day"
  ).all();
  return Response.json({
    note: "Aggregate counters only. No per-player data is collected or stored.",
    days: results,
  });
}
