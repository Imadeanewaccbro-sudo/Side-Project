import { createBrowserPermissionAdapter } from "./browser-permissions.js";
import { createPermissionCoordinator } from "./coordinator.js";
import { MESSAGE_TYPES, isPermissionAttempt } from "../shared/messages.js";
import {
  createChromeStorageAdapter,
  loadSettings,
  saveSettings
} from "../shared/storage.js";

const store = createChromeStorageAdapter(chrome);
const browser = createBrowserPermissionAdapter(chrome);
const coordinator = createPermissionCoordinator({ store, browser });

chrome.runtime.onInstalled.addListener(async () => {
  await loadSettings(store);
  console.log("Privacy Transmission Monitor installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (isPermissionAttempt(message)) {
    coordinator.handleAttempt(message.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ action: "block", source: "extension", reason: error.message }));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.PERMISSION_DECISION) {
    coordinator.handleDecision(message.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.GET_STATUS) {
    const origin = message.data?.origin || sender.tab?.url;
    if (!origin) {
      sendResponse({ error: "No active origin." });
      return;
    }
    Promise.all([
      coordinator.handleAttempt({ permission: "camera", origin }),
      coordinator.handleAttempt({ permission: "microphone", origin }),
      coordinator.handleAttempt({ permission: "location", origin })
    ]).then(results => sendResponse({ origin: new URL(origin).origin, permissions: results }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.GET_SETTINGS) {
    loadSettings(store).then(settings => sendResponse(settings));
    return true;
  }

  if (message?.type === MESSAGE_TYPES.SAVE_SETTINGS) {
    saveSettings(store, message.data || {})
      .then(settings => sendResponse(settings))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
});
