import test from "node:test";
import assert from "node:assert/strict";
import { createPermissionCoordinator } from "../background/coordinator.js";
import { createMemoryStorage, savePolicy, saveSettings } from "../shared/storage.js";

function browserFake(state = "prompt") {
  const calls = [];
  return {
    calls,
    async getState() { return { state, source:"browser" }; },
    async applyDecision(origin, permission, decision) {
      calls.push({ origin, permission, decision });
      return { applied:true, source:"browser" };
    }
  };
}

test("saved policy is isolated per origin and permission", async () => {
  const store = createMemoryStorage();
  const browser = browserFake();
  const c = createPermissionCoordinator({ store, browser });
  await savePolicy(store, "https://a.test::camera", "block");
  assert.equal((await c.handleAttempt({origin:"https://a.test/path", permission:"camera"})).action, "block");
  assert.equal((await c.handleAttempt({origin:"https://a.test", permission:"microphone"})).action, "ask");
  assert.equal((await c.handleAttempt({origin:"https://b.test", permission:"camera"})).action, "ask");
});

test("extension decisions apply the hard browser-backed enforcement rule", async () => {
  const store = createMemoryStorage();
  await saveSettings(store, { enforcementMode:"extension" });
  const browser = browserFake();
  const c = createPermissionCoordinator({ store, browser });
  const result = await c.handleDecision({origin:"https://a.test", permission:"camera", decision:"block"});
  assert.equal(result.browserResult.applied, true);
  assert.equal(browser.calls.length, 1);
  assert.deepEqual(browser.calls[0], {
    origin: "https://a.test",
    permission: "camera",
    decision: "block"
  });
});

test("browser decisions call the browser adapter", async () => {
  const store = createMemoryStorage();
  await saveSettings(store, { enforcementMode:"browser" });
  const browser = browserFake();
  const c = createPermissionCoordinator({ store, browser });
  const result = await c.handleDecision({origin:"https://a.test", permission:"camera", decision:"block"});
  assert.equal(result.browserResult.applied, true);
  assert.equal(browser.calls.length, 1);
});

test("browser denial wins over an allow policy in browser mode", async () => {
  const store = createMemoryStorage();
  await saveSettings(store, { enforcementMode:"browser" });
  await savePolicy(store, "https://a.test::camera", "allow");
  const browser = browserFake("denied");
  const c = createPermissionCoordinator({ store, browser });
  assert.equal((await c.handleAttempt({origin:"https://a.test", permission:"camera"})).action, "block");
  assert.equal((await c.handleAttempt({origin:"https://a.test", permission:"camera"})).source, "browser");
});
