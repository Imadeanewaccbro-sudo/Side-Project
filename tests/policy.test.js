import test from "node:test";
import assert from "node:assert/strict";
import { DECISIONS, ENFORCEMENT_MODES, makePolicyKey, normalizeOrigin, resolvePolicy } from "../shared/policy.js";

test("normalizes origins", () => {
  assert.equal(normalizeOrigin("https://Example.COM/path?q=1"), "https://example.com");
  assert.equal(normalizeOrigin("ftp://example.com"), null);
});

test("policy keys isolate origin and permission", () => {
  assert.notEqual(makePolicyKey("https://a.test", "camera"), makePolicyKey("https://b.test", "camera"));
  assert.notEqual(makePolicyKey("https://a.test", "camera"), makePolicyKey("https://a.test", "microphone"));
});

test("extension block wins", () => {
  const r = resolvePolicy({ decision: DECISIONS.BLOCK, browserState: "granted", enforcementMode: ENFORCEMENT_MODES.EXTENSION });
  assert.deepEqual(r, { action:"block", source:"extension", requiresUserDecision:false, reason:"The saved site policy blocks this protected-data access." });
});

test("extension ask requires a decision", () => {
  const r = resolvePolicy({ decision: DECISIONS.ASK, browserState:"granted", enforcementMode:ENFORCEMENT_MODES.EXTENSION });
  assert.equal(r.action, "ask");
  assert.equal(r.requiresUserDecision, true);
});

test("browser mode follows browser state when no saved decision exists", () => {
  assert.equal(resolvePolicy({ decision:"ask", browserState:"granted", enforcementMode:"browser" }).action, "allow");
  assert.equal(resolvePolicy({ decision:"ask", browserState:"denied", enforcementMode:"browser" }).action, "block");
  assert.equal(resolvePolicy({ decision:"ask", browserState:"prompt", enforcementMode:"browser" }).action, "ask");
});
