import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../content/page-bridge.js", import.meta.url), "utf8");

test("main-world bridge patches protected API prototypes", () => {
  assert.match(source, /MediaDevices\?\.prototype/);
  assert.match(source, /Geolocation\?\.prototype/);
  assert.match(source, /getUserMedia/);
  assert.match(source, /getCurrentPosition/);
});

test("main-world bridge explicitly rejects blocked media access", () => {
  assert.match(source, /NotAllowedError/);
  assert.match(source, /Privacy Monitor blocked/);
});

test("main-world bridge explicitly reports its active status for the local test site", () => {
  assert.match(source, /__privacyMonitorBridge/);
  assert.match(source, /mediaPatched/);
  assert.match(source, /geoCurrentPatched/);
});
