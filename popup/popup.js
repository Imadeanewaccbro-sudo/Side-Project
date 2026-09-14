const DEFAULT_COLORS = { start: "#141418", end: "#27205a", text: "#ffffff", accent: "#9b8cff" };
const COLOR_KEYS = ["start", "end", "text", "accent"];
const MAX_BACKGROUND_BYTES = 4 * 1024 * 1024;

async function send(type, data = {}) {
  return chrome.runtime.sendMessage({ type, data });
}

function labelState(item) {
  if (!item) return "Unknown";
  if (item.action === "allow") return "Allowed";
  if (item.action === "block") return "Blocked";
  return "Needs decision";
}

function setColor(key, value) {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return false;
  document.getElementById(`color${key[0].toUpperCase()}${key.slice(1)}`).value = value;
  document.getElementById(`hex${key[0].toUpperCase()}${key.slice(1)}`).value = value.toUpperCase();
  return true;
}

function getColors() {
  return Object.fromEntries(COLOR_KEYS.map(key => [key, document.getElementById(`color${key[0].toUpperCase()}${key.slice(1)}`).value]));
}

function updateWarningPreview() {
  const colors = getColors();
  const preview = document.getElementById("warningPreview");
  const radius = Number(document.getElementById("alertRadius").value);
  const glow = document.getElementById("alertGlow").checked;
  Object.assign(preview.style, {
    background: `linear-gradient(135deg, ${colors.start}, ${colors.end})`,
    color: colors.text,
    borderColor: colors.accent,
    borderRadius: `${radius}px`,
    boxShadow: glow ? `0 0 28px ${colors.accent}55` : "none"
  });
  document.querySelector(".preview-bar").style.background = `linear-gradient(90deg, ${colors.text}, transparent)`;
  document.getElementById("radiusValue").textContent = `${radius}px`;
  document.getElementById("durationValue").textContent = `${document.getElementById("alertDuration").value}s`;
}

function updatePopupPreview(settings = {}) {
  const image = settings.backgroundImage;
  const enabled = settings.backgroundEnabled && image;
  const overlay = Number(settings.backgroundOverlay ?? 42) / 100;
  const pos = settings.backgroundPosition || "center";
  document.documentElement.style.setProperty("--panel-alpha", Math.max(.04, Number(settings.panelOpacity ?? 9) / 100));
  if (enabled) {
    document.body.style.backgroundImage = `linear-gradient(rgba(5,7,18,${overlay}), rgba(5,7,18,${overlay})), url("${image}")`;
    document.body.style.backgroundSize = "cover, cover";
    document.body.style.backgroundPosition = `${pos}, ${pos}`;
  } else {
    document.body.style.backgroundImage = "radial-gradient(circle at 12% 0%, rgba(127,91,255,.24), transparent 34%), radial-gradient(circle at 90% 18%, rgba(240,44,232,.16), transparent 30%), linear-gradient(145deg, var(--bg1), var(--bg2) 55%, var(--bg3))";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
  }
}

function refreshBackgroundPreview() {
  const image = window.__settingsDraft?.backgroundImage;
  const info = document.getElementById("backgroundInfo");
  const thumb = document.getElementById("backgroundThumb");
  if (!image) {
    info.classList.add("hidden");
    thumb.style.backgroundImage = "none";
    return;
  }
  info.classList.remove("hidden");
  thumb.style.backgroundImage = `url("${image}")`;
  document.getElementById("backgroundName").textContent = window.__settingsDraft.backgroundName || "Custom background";
  document.getElementById("backgroundSize").textContent = window.__settingsDraft.backgroundSize || "Stored locally";
}

async function load() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:/.test(tab.url)) {
    document.getElementById("website").textContent = "Protected pages only";
    return;
  }
  document.getElementById("website").textContent = new URL(tab.url).origin;

  const origin = new URL(tab.url).origin;
  const [status, settings] = await Promise.all([
    send("GET_STATUS", { origin }),
    send("GET_SETTINGS")
  ]);
  window.__settingsDraft = { ...settings };

  if (status?.permissions) {
    for (const item of status.permissions) {
      const node = document.getElementById(item.permission);
      if (node) node.textContent = labelState(item);
    }
    const blocked = status.permissions.filter(x => x.action === "block");
    document.getElementById("warning").textContent = blocked.length
      ? `${blocked.length} protected permission${blocked.length > 1 ? "s are" : " is"} blocked.`
      : "No warnings.";
  }

  document.querySelectorAll('input[name="mode"]').forEach(input => { input.checked = input.value === settings.enforcementMode; });
  document.getElementById("alertsEnabled").checked = settings.alertsEnabled;
  document.getElementById("alertStyle").value = settings.alertStyle;
  for (const key of COLOR_KEYS) setColor(key, settings.alertColors?.[key] || DEFAULT_COLORS[key]);
  document.getElementById("alertRadius").value = settings.alertRadius ?? 12;
  document.getElementById("alertGlow").checked = settings.alertGlow ?? true;
  document.getElementById("alertDuration").value = settings.alertDuration ?? 5;
  document.getElementById("backgroundEnabled").checked = Boolean(settings.backgroundEnabled && settings.backgroundImage);
  document.getElementById("backgroundPosition").value = settings.backgroundPosition || "center";
  document.getElementById("backgroundOverlay").value = settings.backgroundOverlay ?? 42;
  document.getElementById("panelOpacity").value = settings.panelOpacity ?? 9;
  document.getElementById("overlayValue").textContent = `${document.getElementById("backgroundOverlay").value}%`;
  document.getElementById("panelValue").textContent = `${document.getElementById("panelOpacity").value}%`;
  updateWarningPreview();
  refreshBackgroundPreview();
  updatePopupPreview(settings);
}

function readDraftFromControls() {
  return {
    enforcementMode: document.querySelector('input[name="mode"]:checked')?.value || "extension",
    alertsEnabled: document.getElementById("alertsEnabled").checked,
    alertStyle: document.getElementById("alertStyle").value,
    alertColors: getColors(),
    alertRadius: Number(document.getElementById("alertRadius").value),
    alertGlow: document.getElementById("alertGlow").checked,
    alertDuration: Number(document.getElementById("alertDuration").value),
    backgroundEnabled: document.getElementById("backgroundEnabled").checked && Boolean(window.__settingsDraft?.backgroundImage),
    backgroundImage: window.__settingsDraft?.backgroundImage || "",
    backgroundName: window.__settingsDraft?.backgroundName || "",
    backgroundPosition: document.getElementById("backgroundPosition").value,
    backgroundOverlay: Number(document.getElementById("backgroundOverlay").value),
    panelOpacity: Number(document.getElementById("panelOpacity").value)
  };
}

async function saveAll() {
  const settings = readDraftFromControls();
  const saved = await send("SAVE_SETTINGS", settings);
  if (saved?.error) {
    document.getElementById("warning").textContent = `Could not save: ${saved.error}`;
    return;
  }
  window.__settingsDraft = { ...saved };
  updatePopupPreview(saved);
  document.getElementById("warning").textContent = "✓ Settings saved locally.";
}

document.getElementById("saveSettings").addEventListener("click", () => saveAll().catch(error => {
  document.getElementById("warning").textContent = `Error: ${error.message}`;
}));

document.querySelectorAll("[data-permission]").forEach(button => {
  button.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !/^https?:/.test(tab.url)) return;
    const result = await send("PERMISSION_DECISION", {
      origin: new URL(tab.url).origin,
      permission: button.dataset.permission,
      decision: button.dataset.decision
    });
    if (!result?.error) {
      try { await chrome.tabs.sendMessage(tab.id, { type: "PERMISSION_POLICY_UPDATE", result: { ...result, action: result.decision } }); } catch {}
    }
    document.getElementById("warning").textContent = result?.error || `${button.dataset.permission}: ${button.dataset.decision} saved.`;

    // Do not call load() here. Re-reading the entire popup settings after a
    // permission change could replace the live appearance draft and reset a
    // custom wallpaper/GIF while the popup is still open. Permission changes
    // only affect the protected-data status, so refresh that small section.
    if (!result?.error) {
      const refreshed = await send("GET_STATUS", { origin: new URL(tab.url).origin });
      if (refreshed?.permissions) {
        for (const item of refreshed.permissions) {
          const node = document.getElementById(item.permission);
          if (node) node.textContent = labelState(item);
        }
        const blocked = refreshed.permissions.filter(x => x.action === "block");
        document.getElementById("warning").textContent = blocked.length
          ? `${blocked.length} protected permission${blocked.length > 1 ? "s are" : " is"} blocked.`
          : `${button.dataset.permission}: ${button.dataset.decision} saved.`;
      }
    }
  });
});

COLOR_KEYS.forEach(key => {
  const cap = key[0].toUpperCase() + key.slice(1);
  document.getElementById(`color${cap}`).addEventListener("input", event => {
    setColor(key, event.target.value);
    updateWarningPreview();
  });
  document.getElementById(`hex${cap}`).addEventListener("change", event => {
    const value = event.target.value.trim();
    if (!setColor(key, value)) event.target.value = document.getElementById(`color${cap}`).value.toUpperCase();
    updateWarningPreview();
  });
});

document.getElementById("resetColors").addEventListener("click", () => {
  COLOR_KEYS.forEach(key => setColor(key, DEFAULT_COLORS[key]));
  document.getElementById("alertRadius").value = 12;
  document.getElementById("alertGlow").checked = true;
  document.getElementById("alertDuration").value = 5;
  updateWarningPreview();
});

["alertRadius", "alertDuration", "alertGlow"].forEach(id => document.getElementById(id).addEventListener("input", updateWarningPreview));
document.getElementById("backgroundOverlay").addEventListener("input", event => {
  document.getElementById("overlayValue").textContent = `${event.target.value}%`;
  const draft = { ...window.__settingsDraft, ...readDraftFromControls(), backgroundOverlay: Number(event.target.value) };
  window.__settingsDraft = draft;
  updatePopupPreview(draft);
});
document.getElementById("panelOpacity").addEventListener("input", event => {
  document.getElementById("panelValue").textContent = `${event.target.value}%`;
  const draft = { ...window.__settingsDraft, ...readDraftFromControls(), panelOpacity: Number(event.target.value) };
  window.__settingsDraft = draft;
  updatePopupPreview(draft);
});
document.getElementById("backgroundPosition").addEventListener("change", event => {
  const draft = { ...window.__settingsDraft, ...readDraftFromControls(), backgroundPosition: event.target.value };
  window.__settingsDraft = draft;
  updatePopupPreview(draft);
});
document.getElementById("backgroundEnabled").addEventListener("change", event => {
  const draft = { ...window.__settingsDraft, ...readDraftFromControls(), backgroundEnabled: event.target.checked };
  window.__settingsDraft = draft;
  updatePopupPreview(draft);
});

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("backgroundFile");
dropZone.addEventListener("click", () => fileInput.click());
["dragenter", "dragover"].forEach(type => dropZone.addEventListener(type, event => {
  event.preventDefault();
  dropZone.classList.add("dragging");
}));
["dragleave", "drop"].forEach(type => dropZone.addEventListener(type, event => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
}));
dropZone.addEventListener("drop", event => {
  const file = event.dataTransfer.files?.[0];
  if (file) handleBackgroundFile(file);
});
fileInput.addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (file) handleBackgroundFile(file);
});

function handleBackgroundFile(file) {
  if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
    document.getElementById("warning").textContent = "Use PNG, JPG, WEBP, or GIF only.";
    return;
  }
  if (file.size > MAX_BACKGROUND_BYTES) {
    document.getElementById("warning").textContent = "That file is larger than 4 MB. Pick a smaller image/GIF.";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    window.__settingsDraft = {
      ...window.__settingsDraft,
      backgroundImage: reader.result,
      backgroundName: file.name,
      backgroundSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      backgroundEnabled: true
    };
    document.getElementById("backgroundEnabled").checked = true;
    refreshBackgroundPreview();
    updatePopupPreview(window.__settingsDraft);
    document.getElementById("warning").textContent = `Background ready: ${file.name}. Click Save.`;
  };
  reader.readAsDataURL(file);
}

document.getElementById("removeBackground").addEventListener("click", () => {
  window.__settingsDraft = { ...window.__settingsDraft, backgroundImage: "", backgroundName: "", backgroundSize: "", backgroundEnabled: false };
  document.getElementById("backgroundEnabled").checked = false;
  fileInput.value = "";
  refreshBackgroundPreview();
  updatePopupPreview(window.__settingsDraft);
  document.getElementById("warning").textContent = "Background removed. Click Save to keep the change.";
});

load().catch(error => {
  document.getElementById("warning").textContent = `Error: ${error.message}`;
});
