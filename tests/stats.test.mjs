import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequestPost, onRequestGet } from "../functions/api/stats.js";

// Minimal D1 stub: records statements and simulates the daily_stats table
// for the exact INSERT/UPSERT shape the function issues.
function makeDb() {
  const rows = new Map();
  const calls = [];
  return {
    rows,
    calls,
    prepare(sql) {
      const stmt = {
        sql,
        args: [],
        bind(...args) { this.args = args; return this; },
        async run() {
          calls.push({ sql, args: this.args });
          if (sql.startsWith("INSERT INTO daily_stats")) {
            const [day, plays, completes, abandons, shares, att1, att2, acc0, acc1, acc2, acc3] = this.args;
            const row = rows.get(day) || { day, plays: 0, completes: 0, abandons: 0, shares: 0, att1: 0, att2: 0, acc0: 0, acc1: 0, acc2: 0, acc3: 0 };
            row.plays += plays; row.completes += completes; row.abandons += abandons; row.shares += shares;
            row.att1 += att1; row.att2 += att2; row.acc0 += acc0; row.acc1 += acc1; row.acc2 += acc2; row.acc3 += acc3;
            rows.set(day, row);
          }
          return { success: true };
        },
        async all() {
          return { results: [...rows.values()].sort((a, b) => a.day - b.day) };
        },
      };
      return stmt;
    },
  };
}

function postReq(db, body) {
  return onRequestPost({
    env: { STATS: db },
    request: new Request("https://example.com/api/stats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
}

test("valid completion increments only aggregate counters", async () => {
  const db = makeDb();
  const res = await postReq(db, { v: 1, day: 5, event: "complete", attempt: 2, accBucket: 3, shared: false });
  assert.equal(res.status, 204);
  const row = db.rows.get(5);
  assert.deepEqual(row, { day: 5, plays: 1, completes: 1, abandons: 0, shares: 0, att1: 0, att2: 1, acc0: 0, acc1: 0, acc2: 0, acc3: 1 });
});

test("share event needs no attempt or bucket and only counts shares", async () => {
  const db = makeDb();
  const res = await postReq(db, { v: 1, day: 5, event: "share" });
  assert.equal(res.status, 204);
  assert.equal(db.rows.get(5).shares, 1);
  assert.equal(db.rows.get(5).plays, 0);
});

test("extra identifier fields in the payload are never stored", async () => {
  const db = makeDb();
  const res = await postReq(db, { v: 1, day: 2, event: "complete", attempt: 1, accBucket: 0, uid: "abc123", ip: "1.2.3.4" });
  assert.equal(res.status, 204);
  const row = db.rows.get(2);
  assert.deepEqual(Object.keys(row).sort(), ["acc0", "acc1", "acc2", "acc3", "abandons", "att1", "att2", "completes", "day", "plays", "shares"].sort());
});

test("invalid payloads are rejected with 400 and write nothing", async () => {
  const db = makeDb();
  const bad = [
    { v: 2, day: 5, event: "complete", attempt: 1, accBucket: 0 },
    { v: 1, day: 0, event: "complete", attempt: 1, accBucket: 0 },
    { v: 1, day: 5, event: "view", attempt: 1, accBucket: 0 },
    { v: 1, day: 5, event: "complete", attempt: 3, accBucket: 0 },
    { v: 1, day: 5, event: "complete", attempt: 1, accBucket: 4 },
    { v: 1, day: 5.5, event: "complete", attempt: 1, accBucket: 0 },
  ];
  for (const body of bad) {
    const res = await postReq(db, body);
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal(db.rows.size, 0);
});

test("missing database binding returns 503", async () => {
  const res = await onRequestPost({ env: {}, request: new Request("https://example.com/api/stats", { method: "POST", body: "{}" }) });
  assert.equal(res.status, 503);
});

test("GET returns aggregate rows with the privacy note", async () => {
  const db = makeDb();
  await postReq(db, { v: 1, day: 1, event: "complete", attempt: 1, accBucket: 2 });
  const res = await onRequestGet({ env: { STATS: db }, request: new Request("https://example.com/api/stats") });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.days.length, 1);
  assert.equal(data.days[0].completes, 1);
  assert.match(data.note, /No per-player data/);
});
