export const PERMISSIONS = Object.freeze(["camera", "microphone", "location"]);

export const ENFORCEMENT_MODES = Object.freeze({
  BROWSER: "browser",
  EXTENSION: "extension"
});

export const DECISIONS = Object.freeze({
  ALLOW: "allow",
  BLOCK: "block",
  ASK: "ask"
});

export function normalizeOrigin(origin) {
  try {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function makePolicyKey(origin, permission) {
  const normalized = normalizeOrigin(origin);
  if (!normalized || !PERMISSIONS.includes(permission)) {
    throw new TypeError("Invalid origin or permission");
  }
  return `${normalized}::${permission}`;
}

export function resolvePolicy({ decision, browserState = "unsupported", enforcementMode }) {
  if (!ENFORCEMENT_MODES[Object.keys(ENFORCEMENT_MODES).find(
    key => ENFORCEMENT_MODES[key] === enforcementMode
  )]) {
    throw new TypeError("Invalid enforcement mode");
  }

  if (decision === DECISIONS.BLOCK) {
    return {
      action: DECISIONS.BLOCK,
      source: "extension",
      requiresUserDecision: false,
      reason: "The saved site policy blocks this protected-data access."
    };
  }

  if (decision === DECISIONS.ALLOW) {
    if (enforcementMode === ENFORCEMENT_MODES.BROWSER && browserState === "denied") {
      return {
        action: DECISIONS.BLOCK,
        source: "browser",
        requiresUserDecision: false,
        reason: "The browser currently denies this permission."
      };
    }
    return {
      action: DECISIONS.ALLOW,
      source: "extension",
      requiresUserDecision: false,
      reason: "The saved site policy allows this protected-data access."
    };
  }

  if (enforcementMode === ENFORCEMENT_MODES.BROWSER) {
    if (browserState === "denied") {
      return {
        action: DECISIONS.BLOCK,
        source: "browser",
        requiresUserDecision: false,
        reason: "The browser currently denies this permission."
      };
    }
    if (browserState === "granted") {
      return {
        action: DECISIONS.ALLOW,
        source: "browser",
        requiresUserDecision: false,
        reason: "The browser currently grants this permission."
      };
    }
  }

  return {
    action: DECISIONS.ASK,
    source: "none",
    requiresUserDecision: true,
    reason: "No saved policy is available for this site and permission."
  };
}
