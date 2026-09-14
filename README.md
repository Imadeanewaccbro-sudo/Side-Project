# 🛡️ Privacy Transmission Monitor

> 🔐 A private Chromium MV3 extension prototype for monitoring and controlling protected browser API access on a per-origin basis.

Privacy Transmission Monitor is a cybersecurity/privacy research project designed to give users more visibility and control over websites requesting access to protected browser resources.

## ✨ Implemented

- 🎥 **Camera monitoring** — detects and controls camera permission requests.
- 🎙️ **Microphone monitoring** — detects and controls microphone permission requests.
- 📍 **Location monitoring** — detects and controls geolocation permission requests.
- 🌐 **Per-origin policies** — decisions are stored separately for each website/origin.
- ⚙️ **Per-permission policies** — camera, microphone, and location can be controlled independently.
- 🔒 **Extension Level enforcement** — uses Chromium `contentSettings` for protected browser permissions.
- 🌐 **Browser Level mode** — follows the browser's normal permission behavior.
- 👁️ **API-attempt observation** — observes protected API attempts through a MAIN-world page bridge.
- ⚠️ **Non-modal warnings** — suspicious or blocked activity is reported through unobtrusive bottom-right notifications.
- 💾 **Local settings persistence** — policy and extension settings are stored locally.
- 🚦 **Popup Allow/Block controls** — save per-site decisions directly from the extension popup.
- 🧪 **Deterministic test suite** — Node-based automated tests are included.
- 🎨 **Custom popup appearance** — popup background customization remains visible when permission decisions are made.

## 🔐 Privacy & Security Design

The extension is designed around a local-first approach.

- 🏠 Policy decisions are stored locally.
- 🚫 Raw camera or microphone data is not collected by the extension.
- 🚫 The extension does not claim to inspect arbitrary decrypted HTTPS request bodies.
- 🧩 Protected browser API access is handled through Chromium's permission/content-settings mechanisms.
- 🔎 Observed API activity is used as local evidence for the extension's warnings and policy decisions.

## ⚠️ Important Limitation

This is a prototype.

The extension **does not inspect decrypted HTTPS payloads**.

For example, the dummy Transmission button on the localhost test page intentionally succeeds because arbitrary `fetch()`/HTTPS payload blocking is **not implemented in this phase**.

The extension therefore does **not** claim:

> "This website sent your protected data to its server."

Instead, it can observe and control protected browser API access and report evidence that may indicate potentially sensitive activity.

## 🧪 Local Test Site

The project includes a small manual verification site under:

```text
test-site/
