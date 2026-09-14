(() => {
  const SOURCE = "privacy-transmission-monitor";

  function showAlert(result) {
    if (!result?.alertsEnabled) return;
    const existing = document.getElementById("privacy-monitor-alert");
    if (existing) existing.remove();

    const el = document.createElement("div");
    el.id = "privacy-monitor-alert";
    el.setAttribute("role", "status");
    el.textContent = result.action === "block"
      ? `Privacy Monitor: ${result.reason}`
      : result.action === "ask"
        ? `Privacy Monitor: ${result.permission} access needs your decision.`
        : `Privacy Monitor: ${result.permission} access allowed by policy.`;

    const colors = result.alertColors || {};
    Object.assign(el.style, {
      position: "fixed", right: "16px", bottom: "16px", zIndex: "2147483647",
      maxWidth: "340px", padding: "10px 12px", borderRadius: "10px",
      background: `linear-gradient(135deg, ${colors.start || "#141418"}, ${colors.end || "#27205a"})`,
      color: colors.text || "#ffffff",
      border: `1px solid ${colors.accent || "#9b8cff"}`,
      borderRadius: `${result.alertRadius || 12}px`,
      boxShadow: result.alertGlow === false ? "0 6px 24px rgba(0,0,0,.25)" : `0 6px 24px rgba(0,0,0,.25), 0 0 28px ${(colors.accent || "#9b8cff")}44`,
      font: "13px/1.4 system-ui,sans-serif",
      boxShadow: "0 6px 24px rgba(0,0,0,.25)", pointerEvents: "none"
    });
    document.documentElement.appendChild(el);
    setTimeout(() => el.remove(), Math.max(2000, Number(result.alertDuration || 5) * 1000));
  }

  function pushPolicies(results) {
    const permissions = {};
    for (const result of results || []) {
      if (result?.permission) permissions[result.permission] = result;
    }
    window.postMessage({ source: SOURCE, type: "PERMISSION_POLICY", data: { permissions } }, window.location.origin);
  }

  async function refreshPolicies() {
    try {
      const results = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
      pushPolicies(results?.permissions || []);
    } catch (error) {
      console.warn("Privacy Monitor could not load policy:", error);
    }
  }

  window.addEventListener("message", async event => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data;
    if (message?.source !== SOURCE || message?.type !== "PERMISSION_ATTEMPT") return;

    const permission = message.data?.permission;
    if (!["camera", "microphone", "location"].includes(permission)) return;

    const result = await chrome.runtime.sendMessage({
      type: "PERMISSION_ATTEMPT",
      data: { permission, origin: message.data.origin, timestamp: message.data.timestamp }
    });
    // Feed the decision back to the MAIN-world shim. This is what makes a
    // first protected API call wait for the policy result instead of racing
    // through to the browser API.
    window.postMessage({
      source: SOURCE,
      type: "PERMISSION_POLICY",
      data: { permissions: { [permission]: result } }
    }, window.location.origin);
    showAlert(result);
  });

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === "PERMISSION_POLICY_UPDATE") {
      const result = message.result;
      if (result?.permission) {
        window.postMessage({
          source: SOURCE,
          type: "PERMISSION_POLICY",
          data: { permissions: { [result.permission]: result } }
        }, window.location.origin);
      }
      showAlert(result);
    }
  });

  refreshPolicies();
})();
