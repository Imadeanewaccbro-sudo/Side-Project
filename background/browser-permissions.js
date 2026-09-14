const CONTENT_SETTING_MAP = Object.freeze({
  camera: "camera",
  microphone: "microphone",
  location: "location"
});

function patternForOrigin(origin) {
  const url = new URL(origin);
  return `${url.protocol}//${url.host}/*`;
}

export function createBrowserPermissionAdapter(chromeApi) {
  return {
    async getState(origin, permission) {
      const apiName = CONTENT_SETTING_MAP[permission];
      const api = apiName && chromeApi?.contentSettings?.[apiName];
      if (!api?.get) return { state: "unsupported", source: "browser" };

      const primaryUrl = origin.endsWith("/") ? origin : `${origin}/`;
      try {
        const result = await api.get({ primaryUrl });
        const state = result?.setting;
        if (state === "allow") return { state: "granted", source: "browser" };
        if (state === "block") return { state: "denied", source: "browser" };
        if (state === "ask") return { state: "prompt", source: "browser" };
        return { state: "unsupported", source: "browser" };
      } catch (error) {
        return { state: "unsupported", source: "browser", reason: String(error?.message || error) };
      }
    },

    async applyDecision(origin, permission, decision) {
      const apiName = CONTENT_SETTING_MAP[permission];
      const api = apiName && chromeApi?.contentSettings?.[apiName];
      if (!api?.set) return { applied: false, source: "browser", reason: "Browser content-setting API is unavailable." };

      if (!["allow", "block", "ask"].includes(decision)) {
        return { applied: false, source: "browser", reason: "Unsupported browser decision." };
      }

      try {
        await api.set({
          primaryPattern: patternForOrigin(origin),
          setting: decision
        });
        return { applied: true, source: "browser" };
      } catch (error) {
        return { applied: false, source: "browser", reason: String(error?.message || error) };
      }
    }
  };
}
