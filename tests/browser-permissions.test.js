import test from "node:test";
import assert from "node:assert/strict";
import { createBrowserPermissionAdapter } from "../background/browser-permissions.js";

test("reports unsupported instead of inventing browser support", async () => {
  const adapter = createBrowserPermissionAdapter({});
  assert.deepEqual(await adapter.getState("https://a.test", "camera"), { state:"unsupported", source:"browser" });
});

test("maps content setting states", async () => {
  const fake = { contentSettings: {
    camera: { get: async () => ({ setting:"block" }) },
    microphone: { get: async () => ({ setting:"allow" }) },
    location: { get: async () => ({ setting:"ask" }) }
  }};
  const adapter = createBrowserPermissionAdapter(fake);
  assert.equal((await adapter.getState("https://a.test","camera")).state, "denied");
  assert.equal((await adapter.getState("https://a.test","microphone")).state, "granted");
  assert.equal((await adapter.getState("https://a.test","location")).state, "prompt");
});

test("applies only supported decisions", async () => {
  const calls = [];
  const fake = { contentSettings: { camera: { set: async x => calls.push(x) } } };
  const adapter = createBrowserPermissionAdapter(fake);
  assert.equal((await adapter.applyDecision("https://a.test","camera","block")).applied, true);
  assert.deepEqual(calls[0], { primaryPattern:"https://a.test/*", setting:"block" });
  assert.equal((await adapter.applyDecision("https://a.test","camera","nope")).applied, false);
});
