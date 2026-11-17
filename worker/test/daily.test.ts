import { test } from "node:test";
import assert from "node:assert/strict";
import { addCount, dayKey, emptyDay, normalizeTag, tagsFromSearch, toRows, tokensEqual, MAX_COMBOS_PER_DAY, OTHER_KEY, BOT_RE } from "../src/daily.ts";

test("normalizeTag follows the site rules", () => {
  assert.equal(normalizeTag("Figma Maker!"), "figma-maker");
  assert.equal(normalizeTag("Żółć/QR"), "zoc" + "qr");
  assert.equal(normalizeTag("a@b.pl"), "");
  assert.equal(normalizeTag("x".repeat(80)).length, 64);
  assert.equal(normalizeTag(null), "");
});

test("g is a layer number, never a traffic source", () => {
  const t = tagsFromSearch("?g=3&fx=v2&utm_source=LinkedIn&utm_campaign=figma-maker&utm_content=qr");
  assert.deepEqual(t, { source: "linkedin", medium: "", campaign: "figma-maker", content: "qr" });
  assert.deepEqual(tagsFromSearch("?g=3"), { source: "", medium: "", campaign: "", content: "" });
});

test("day key uses Warsaw time", () => {
  assert.equal(dayKey(Date.parse("2026-11-16T23:30:00Z")), "2026-11-17"); // 00:30 CET
  assert.equal(dayKey(Date.parse("2026-07-16T21:30:00Z")), "2026-07-16"); // 23:30 CEST
});

test("counts per combination and per day total", () => {
  const d = emptyDay();
  const t = tagsFromSearch("?utm_source=qr&utm_campaign=figma-maker");
  addCount(d, "card", t); addCount(d, "card", t); addCount(d, "hello", t);
  assert.equal(d.total.card, 2);
  assert.equal(d.utm["qr||figma-maker|"].card, 2);
  assert.equal(d.utm["qr||figma-maker|"].hello, 1);
});

test("distinct tag combinations are limited per day; the rest goes to inne and the total stays exact", () => {
  const d = emptyDay();
  for (let i = 0; i < MAX_COMBOS_PER_DAY + 20; i++) addCount(d, "card", tagsFromSearch(`?utm_content=c${i}`));
  assert.equal(Object.keys(d.utm).filter((k) => k !== OTHER_KEY).length, MAX_COMBOS_PER_DAY);
  assert.equal(d.utm[OTHER_KEY].card, 20);
  assert.equal(d.total.card, MAX_COMBOS_PER_DAY + 20);
  addCount(d, "card", tagsFromSearch("?utm_content=c0")); // a known combination still counts on its own row
  assert.equal(d.utm["|||c0"].card, 2);
});

test("the response has no identifier: only dates, tags and numbers", () => {
  const d = emptyDay();
  addCount(d, "ready", tagsFromSearch("?utm_source=qr"));
  const rows = toRows({ "2026-11-16": d });
  const allowed = new Set(["date", "total", "utm"]);
  const rowAllowed = new Set(["source", "medium", "campaign", "content", "card", "host", "hello", "ready", "assembled", "bye"]);
  for (const r of rows) {
    assert.deepEqual(Object.keys(r).filter((k) => !allowed.has(k)), []);
    for (const u of r.utm) {
      assert.deepEqual(Object.keys(u).filter((k) => !rowAllowed.has(k)), []);
      for (const [k, v] of Object.entries(u)) if (!["source", "medium", "campaign", "content"].includes(k)) assert.equal(typeof v, "number");
    }
  }
  assert.doesNotMatch(JSON.stringify(rows), /"(ip|id|client|room|ua|cookie)"/i);
});

test("tokens and bots", () => {
  assert.ok(tokensEqual("abc", "abc"));
  assert.ok(!tokensEqual("abc", "abd"));
  assert.ok(!tokensEqual("abc", "abcd"));
  assert.ok(BOT_RE.test("Slackbot-LinkExpanding 1.0"));
  assert.ok(!BOT_RE.test("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1"));
});
