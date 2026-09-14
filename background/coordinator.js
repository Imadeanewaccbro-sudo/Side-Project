import {
  DECISIONS,
  ENFORCEMENT_MODES,
  makePolicyKey,
  normalizeOrigin,
  resolvePolicy
} from "../shared/policy.js";
import {
  getPolicy,
  loadSettings,
  savePolicy
} from "../shared/storage.js";

export function createPermissionCoordinator({ store, browser }) {
  async function handleAttempt({ permission, origin }) {
    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) {
      return { action: "block", reason: "Invalid origin.", source: "extension", requiresUserDecision: false };
    }

    const settings = await loadSettings(store);
    const key = makePolicyKey(normalizedOrigin, permission);
    const policy = await getPolicy(store, key);
    const browserState = settings.enforcementMode === ENFORCEMENT_MODES.BROWSER
      ? await browser.getState(normalizedOrigin, permission)
      : { state: "unsupported" };

    const resolved = resolvePolicy({
      decision: policy?.decision ?? DECISIONS.ASK,
      browserState: browserState.state,
      enforcementMode: settings.enforcementMode
    });

    return {
      ...resolved,
      permission,
      origin: normalizedOrigin,
      policyDecision: policy?.decision ?? null,
      browserState: browserState.state,
      alertsEnabled: settings.alertsEnabled,
      alertStyle: settings.alertStyle,
      alertColors: settings.alertColors,
      alertRadius: settings.alertRadius,
      alertGlow: settings.alertGlow,
      alertDuration: settings.alertDuration
    };
  }

  async function handleDecision({ permission, origin, decision }) {
    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) throw new TypeError("Invalid origin");
    if (!["allow", "block"].includes(decision)) throw new TypeError("Decision must be allow or block");

    const settings = await loadSettings(store);
    const key = makePolicyKey(normalizedOrigin, permission);
    const saved = await savePolicy(store, key, decision);

    // Extension Level means the extension owns the per-origin policy and
    // applies the corresponding Chrome content setting as the hard enforcement
    // backend. This is necessary because page-level JavaScript interception is
    // observable/bypassable and cannot guarantee that a protected API call is
    // stopped before Chrome handles it.
    // Browser Level instead follows the browser's existing permission state.
    const browserResult = await browser.applyDecision(
      normalizedOrigin,
      permission,
      decision
    );

    return {
      permission,
      origin: normalizedOrigin,
      decision: saved.decision,
      browserResult
    };
  }

  return { handleAttempt, handleDecision };
}
