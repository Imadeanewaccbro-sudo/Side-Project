import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryStorage, getPolicy, loadSettings, savePolicy, saveSettings } from "../shared/storage.js";

test("policy persistence is keyed and survives reads", async () => {
  const store = createMemoryStorage();
  await savePolicy(store, "https://a.test::camera", "block", 123);
  assert.deepEqual(await getPolicy(store, "https://a.test::camera"), { decision:"block", updatedAt:123 });
  assert.equal(await getPolicy(store, "https://a.test::microphone"), null);
});

test("settings merge with defaults and persist", async () => {
  const store = createMemoryStorage();
  assert.equal((await loadSettings(store)).enforcementMode, "extension");
  const saved = await saveSettings(store, { enforcementMode:"browser", alertsEnabled:false });
  assert.equal(saved.enforcementMode, "browser");
  assert.equal(saved.alertsEnabled, false);
  assert.equal((await loadSettings(store)).alertStyle, "toast");
});

test("settings persist customizable warning colors", async () => {
  const store = createMemoryStorage();
  const saved = await saveSettings(store, {
    alertColors: {
      start: "#112233",
      end: "#445566",
      text: "#ffffff",
      accent: "#aabbcc"
    }
  });
  assert.equal(saved.alertColors.start, "#112233");
  const loaded = await loadSettings(store);
  assert.equal(loaded.alertColors.end, "#445566");
});

test("settings persist warning appearance and background customization", async () => {
  const store = createMemoryStorage();
  const saved = await saveSettings(store, {
    alertRadius: 20,
    alertGlow: false,
    alertDuration: 8,
    backgroundEnabled: true,
    backgroundImage: "data:image/png;base64,AAAA",
    backgroundName: "wallpaper.png",
    backgroundPosition: "top",
    backgroundOverlay: 25,
    panelOpacity: 14
  });
  assert.equal(saved.alertRadius, 20);
  assert.equal(saved.alertGlow, false);
  assert.equal(saved.alertDuration, 8);
  assert.equal(saved.backgroundEnabled, true);
  assert.equal(saved.backgroundName, "wallpaper.png");
  assert.equal(saved.backgroundPosition, "top");
  assert.equal(saved.backgroundOverlay, 25);
  assert.equal(saved.panelOpacity, 14);
});
