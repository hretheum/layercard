import { test } from "node:test";
import assert from "node:assert/strict";
import { inheritedUtm } from "../src/utm.ts";

test("passes on only the four utm keys, normalised", () => {
  assert.equal(inheritedUtm("?utm_source=QR&utm_medium=Print&utm_campaign=Figma Maker&utm_content=karta"), "utm_source=qr&utm_medium=print&utm_campaign=figma-maker&utm_content=karta");
});

test("drops g, fx, q, utm_term and every other parameter", () => {
  assert.equal(inheritedUtm("?g=3&fx=v2&q=1&utm_term=x&utm_source=qr&foo=bar&application_source=cv"), "utm_source=qr");
});

test("nothing to pass on gives an empty string", () => {
  assert.equal(inheritedUtm(""), "");
  assert.equal(inheritedUtm("?g=2&fx=v2"), "");
});

test("values that could carry an address or free text are cut or dropped", () => {
  assert.equal(inheritedUtm("?utm_source=a@b.pl&utm_content=" + "x".repeat(80)), "utm_content=" + "x".repeat(64));
  assert.equal(inheritedUtm("?utm_source=" + encodeURIComponent("https://evil.example/?id=1")), "utm_source=httpsevil.exampleid1");
});

test("no identifier appears in the result", () => {
  const out = inheritedUtm("?utm_source=qr&room=abcdef&id=xyz&cid=1");
  assert.doesNotMatch(out, /room|id=|cid|abcdef|xyz/);
});
