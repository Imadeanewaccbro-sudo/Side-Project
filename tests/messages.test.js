import test from "node:test";
import assert from "node:assert/strict";
import { isPermissionAttempt, makePermissionAttempt } from "../shared/messages.js";

test("creates and validates permission attempt messages", () => {
  const msg = makePermissionAttempt("camera", "https://a.test", 42);
  assert.equal(msg.type, "PERMISSION_ATTEMPT");
  assert.equal(msg.data.timestamp, 42);
  assert.equal(isPermissionAttempt(msg), true);
  assert.equal(isPermissionAttempt({ type:"PERMISSION_ATTEMPT", data:{permission:"camera"} }), false);
});
