# Privacy Transmission Monitor

Private Chromium MV3 extension prototype.

## Implemented
- Per-origin + per-permission policy for camera, microphone, and location.
- Extension Level vs Browser Level enforcement setting.
- Browser permission adapter using Chrome `contentSettings`.
- API-attempt observation through a MAIN-world page bridge.
- Non-modal bottom-right warnings.
- Local policy/settings persistence.
- Popup Allow/Block controls for saving per-site decisions.
- Deterministic Node test suite.
- Explicit limitation: this prototype does not inspect decrypted HTTPS payloads.

## Load locally
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked**.
4. Select this `privacy-monitor` directory.

## Test
Run `npm test` from the project directory.

The `test-site/` directory is a simple manual verification page. File-manager monitoring and agreement summarization remain planned follow-up work.


## Interpreting the localhost test

The test page distinguishes real protected-API success from failure:
- Camera/microphone success means the browser returned a real `MediaStream`.
- Location success means the browser returned real coordinates.
- A blocked request is reported as `BLOCKED/FAILED`.
- The dummy Transmission button intentionally succeeds because arbitrary `fetch()`/HTTPS payload blocking is not implemented in this phase. The extension does not claim to inspect decrypted HTTPS bodies.

### UI fix
Permission Allow/Block buttons now refresh only the protected-permission status. They no longer reload the complete popup settings, so a custom image or animated GIF remains visible while the popup is open.
