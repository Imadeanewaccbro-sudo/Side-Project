import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const popup = fs.readFileSync(new URL("../popup/popup.js", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../background/service-worker.js", import.meta.url), "utf8");

test("popup requests status with the active tab origin", () => {
  assert.match(popup, /send\("GET_STATUS", \{ origin \}\)/);
  assert.match(popup, /send\("GET_STATUS", \{ origin: new URL\(tab\.url\)\.origin \}\)/);
});

test("service worker accepts popup-provided origin for status", () => {
  assert.match(worker, /message\.data\?\.origin \|\| sender\.tab\?\.url/);
});
