(() => {
  const SOURCE = "privacy-transmission-monitor";
  const PERMISSIONS = ["camera", "microphone", "location"];
  const state = { camera: "ask", microphone: "ask", location: "ask" };
  const pending = new Map();
  const marker = "__privacyMonitorPatchedV2";

  window.__privacyMonitorBridge = {
    loaded: true,
    version: 2,
    getState: () => ({ ...state })
  };

  function emitAttempt(permission) {
    window.postMessage({
      source: SOURCE,
      type: "PERMISSION_ATTEMPT",
      data: {
        permission,
        origin: window.location.origin,
        timestamp: Date.now()
      }
    }, window.location.origin);
  }

  function mediaError(permission) {
    return new DOMException(
      `Privacy Monitor blocked ${permission} access.`,
      "NotAllowedError"
    );
  }

  function locationError() {
    return {
      code: 1,
      message: "Privacy Monitor blocked location access.",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    };
  }

  function waitForDecision(required) {
    return new Promise(resolve => {
      const id = Symbol("pending");
      pending.set(id, { required, resolve });
    });
  }

  function resolvePending() {
    for (const [id, request] of pending) {
      if (request.required.every(permission => state[permission] !== "ask")) {
        pending.delete(id);
        request.resolve(request.required.map(permission => ({
          permission,
          action: state[permission]
        })));
      }
    }
  }

  function patchMethod(proto, name, wrapperFactory) {
    if (!proto) return false;

    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (!descriptor || typeof descriptor.value !== "function") return false;
    if (descriptor.value[marker]) return true;

    const original = descriptor.value;
    const patched = wrapperFactory(original);
    Object.defineProperty(patched, marker, { value: true });

    try {
      Object.defineProperty(proto, name, {
        ...descriptor,
        value: patched
      });
      return proto[name] === patched;
    } catch {
      return false;
    }
  }

  // Patch the prototypes rather than assigning onto navigator instances.
  // This is more reliable because several browser Web APIs expose their
  // methods through read-only/special host objects.
  const mediaPatched = patchMethod(
    globalThis.MediaDevices?.prototype,
    "getUserMedia",
    original => function privacyMonitorGetUserMedia(constraints) {
      const required = [];
      if (constraints?.video) required.push("camera");
      if (constraints?.audio) required.push("microphone");

      if (!required.length) return original.call(this, constraints);

      required.forEach(emitAttempt);

      const known = required.map(permission => state[permission]);
      const blocked = required.find(permission => state[permission] === "block");
      if (blocked) return Promise.reject(mediaError(blocked));

      if (known.every(action => action === "allow")) {
        return original.call(this, constraints);
      }

      return waitForDecision(required).then(results => {
        const denied = results.find(result => result.action === "block");
        if (denied) throw mediaError(denied.permission);
        return original.call(this, constraints);
      });
    }
  );

  const geoProto = globalThis.Geolocation?.prototype;
  const geoCurrentPatched = patchMethod(
    geoProto,
    "getCurrentPosition",
    original => function privacyMonitorGetCurrentPosition(success, error, options) {
      emitAttempt("location");

      if (state.location === "block") {
        queueMicrotask(() => (error || (() => {}))(locationError()));
        return undefined;
      }

      if (state.location === "allow") {
        return original.call(this, success, error, options);
      }

      return waitForDecision(["location"]).then(results => {
        if (results[0].action === "block") {
          queueMicrotask(() => (error || (() => {}))(locationError()));
          return undefined;
        }
        return original.call(this, success, error, options);
      });
    }
  );

  const geoWatchPatched = patchMethod(
    geoProto,
    "watchPosition",
    original => function privacyMonitorWatchPosition(success, error, options) {
      emitAttempt("location");

      if (state.location === "block") {
        queueMicrotask(() => (error || (() => {}))(locationError()));
        return -1;
      }

      if (state.location === "allow") {
        return original.call(this, success, error, options);
      }

      // A watchPosition caller expects a numeric ID synchronously. We cannot
      // safely block-and-later-return that ID from a promise, so deny while
      // waiting for a decision rather than accidentally starting the watch.
      return -1;
    }
  );

  window.__privacyMonitorBridge.mediaPatched = mediaPatched;
  window.__privacyMonitorBridge.geoCurrentPatched = geoCurrentPatched;
  window.__privacyMonitorBridge.geoWatchPatched = geoWatchPatched;
  window.__privacyMonitorBridge.active =
    mediaPatched || geoCurrentPatched || geoWatchPatched;

  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data;
    if (message?.source !== SOURCE || message.type !== "PERMISSION_POLICY") return;

    const permissions = message.data?.permissions;
    if (!permissions || typeof permissions !== "object") return;

    for (const permission of PERMISSIONS) {
      const action = permissions[permission]?.action;
      if (["allow", "block", "ask"].includes(action)) {
        state[permission] = action;
      }
    }

    window.__privacyMonitorBridge.state = { ...state };
    resolvePending();
  });
})();
