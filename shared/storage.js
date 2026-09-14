export const POLICY_STORAGE_KEY = "privacyMonitorPolicies";
export const SETTINGS_STORAGE_KEY = "privacyMonitorSettings";

export const DEFAULT_SETTINGS = Object.freeze({
  enforcementMode: "extension",
  alertsEnabled: true,
  alertStyle: "toast",
  alertColors: {
    start: "#141418",
    end: "#27205a",
    text: "#ffffff",
    accent: "#9b8cff"
  },
  alertRadius: 12,
  alertGlow: true,
  alertDuration: 5,
  backgroundEnabled: false,
  backgroundImage: "",
  backgroundName: "",
  backgroundPosition: "center",
  backgroundOverlay: 42,
  panelOpacity: 9
});

const SCHEMA_VERSION = 1;
const HEX = /^#[0-9a-fA-F]{6}$/;
const POSITIONS = ["center", "top", "bottom", "left", "right"];

export function createMemoryStorage(initial = {}) {
  const data = structuredClone(initial);
  return {
    async get(key) {
      return structuredClone(data[key]);
    },
    async set(key, value) {
      data[key] = structuredClone(value);
    },
    async clear() {
      for (const key of Object.keys(data)) delete data[key];
    }
  };
}

export function createChromeStorageAdapter(chromeApi) {
  return {
    async get(key) {
      const result = await chromeApi.storage.local.get(key);
      return result[key];
    },
    async set(key, value) {
      await chromeApi.storage.local.set({ [key]: value });
    }
  };
}

export async function loadPolicies(store) {
  const saved = await store.get(POLICY_STORAGE_KEY);
  if (!saved || saved.version !== SCHEMA_VERSION || typeof saved.policies !== "object") {
    return { version: SCHEMA_VERSION, policies: {} };
  }
  return { version: SCHEMA_VERSION, policies: saved.policies };
}

export async function savePolicy(store, key, decision, timestamp = Date.now()) {
  if (!["allow", "block"].includes(decision)) throw new TypeError("Decision must be allow or block");
  const current = await loadPolicies(store);
  current.policies[key] = { decision, updatedAt: timestamp };
  await store.set(POLICY_STORAGE_KEY, current);
  return current.policies[key];
}

export async function getPolicy(store, key) {
  const current = await loadPolicies(store);
  return current.policies[key] ?? null;
}

export async function loadSettings(store) {
  const saved = await store.get(SETTINGS_STORAGE_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...(saved && saved.version === SCHEMA_VERSION ? saved.settings : {}),
    alertColors: {
      ...DEFAULT_SETTINGS.alertColors,
      ...((saved && saved.version === SCHEMA_VERSION ? saved.settings : {})?.alertColors || {})
    }
  };
}

export async function saveSettings(store, patch) {
  const current = await loadSettings(store);
  const settings = {
    ...current,
    ...patch,
    alertColors: {
      ...current.alertColors,
      ...(patch.alertColors || {})
    }
  };
  if (!["browser", "extension"].includes(settings.enforcementMode)) {
    throw new TypeError("Invalid enforcement mode");
  }
  if (typeof settings.alertsEnabled !== "boolean") {
    throw new TypeError("alertsEnabled must be boolean");
  }
  if (!["toast", "badge", "both"].includes(settings.alertStyle)) {
    throw new TypeError("Invalid alert style");
  }
  for (const key of ["start", "end", "text", "accent"]) {
    if (typeof settings.alertColors?.[key] !== "string" || !HEX.test(settings.alertColors[key])) {
      throw new TypeError(`Invalid alertColors.${key}`);
    }
  }
  if (!Number.isInteger(settings.alertRadius) || settings.alertRadius < 6 || settings.alertRadius > 28) {
    throw new TypeError("Invalid alertRadius");
  }
  if (typeof settings.alertGlow !== "boolean") throw new TypeError("alertGlow must be boolean");
  if (!Number.isInteger(settings.alertDuration) || settings.alertDuration < 2 || settings.alertDuration > 12) {
    throw new TypeError("Invalid alertDuration");
  }
  if (typeof settings.backgroundEnabled !== "boolean") throw new TypeError("backgroundEnabled must be boolean");
  if (typeof settings.backgroundImage !== "string") throw new TypeError("backgroundImage must be a string");
  if (typeof settings.backgroundName !== "string") throw new TypeError("backgroundName must be a string");
  if (!POSITIONS.includes(settings.backgroundPosition)) throw new TypeError("Invalid backgroundPosition");
  if (!Number.isInteger(settings.backgroundOverlay) || settings.backgroundOverlay < 0 || settings.backgroundOverlay > 80) {
    throw new TypeError("Invalid backgroundOverlay");
  }
  if (!Number.isInteger(settings.panelOpacity) || settings.panelOpacity < 4 || settings.panelOpacity > 22) {
    throw new TypeError("Invalid panelOpacity");
  }
  if (settings.backgroundImage && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(settings.backgroundImage)) {
    throw new TypeError("Unsupported background image format");
  }
  await store.set(SETTINGS_STORAGE_KEY, { version: SCHEMA_VERSION, settings });
  return settings;
}
