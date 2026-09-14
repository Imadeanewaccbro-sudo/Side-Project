# Privacy Transmission Monitor — Architecture Design

**Date:** 2026-09-14  
**Status:** Awaiting written-spec approval  
**Project:** Privacy Transmission Monitor browser extension

## 1. Goal

Build a browser extension that monitors potentially privacy-sensitive website behavior, enforces user-defined protection policies for camera, microphone, and location, records evidence of relevant events, and presents concise warnings without disrupting normal browsing or browser games.

The extension is intended as a practical privacy/security tool. It must distinguish observed evidence from conclusions it cannot technically prove, especially for encrypted network traffic.

## 2. Product Decisions

### Monitoring and blocking

The extension will support both monitoring and blocking. Protection is the primary function; monitoring supplies evidence and visibility.

### Two enforcement modes

The user can select one of two policy modes:

- **Browser Level:** rely on and interact with the browser's permission state where the browser exposes an appropriate control. The extension must not pretend it has lower-level browser privileges than the current browser APIs provide.
- **Extension Level:** maintain a separate extension policy that can be stricter than the browser's permission state. For example, Chrome may allow Camera while the extension policy blocks Camera for a particular origin.

The implementation must clearly label which layer made a decision.

### Protected resources for the first implementation

- Camera
- Microphone
- Location

Other browser permissions may be added later, but are outside the first protection milestone.

### Permission decision persistence

Decisions are remembered by **website/origin + permission type**.

Examples:

- `https://example.com` + Camera → Allow
- `https://example.com` + Camera → Block
- `https://example.com` + Microphone → independent decision
- another origin + Camera → independent decision

A later settings/activity interface must provide a way to change or reset stored decisions. These stored decisions are not global allow/block rules.

## 3. Permission Request Flow

When a protected resource is requested:

1. Detect the request through the strongest browser/API signal available.
2. Resolve the origin and permission type.
3. Check the extension's stored decision for that origin + permission type.
4. If a stored decision exists, apply it according to the active enforcement mode.
5. If no stored decision exists and alerts are enabled, show a small in-page warning.
6. The warning offers **Allow** and **Block**.
7. Store the user's choice for that origin + permission type.
8. Record the event and resulting decision in the evidence store.

The warning is a lightweight bottom-right or bottom-left notification. It must not steal focus, pause the page, modify page layout, or cover the screen.

If alerts are disabled, there is no in-page interruption. Protection policy still applies and the event is logged.

## 4. Detection Architecture

The extension uses two complementary layers:

### Browser-level layer

Use browser extension APIs for enforcement and request/network observation wherever supported. Browser-level controls are the authoritative protection mechanism when the browser exposes the required capability.

### JavaScript/API evidence layer

Use page/content-script instrumentation to observe relevant API attempts and produce evidence. For camera/microphone this may include observing `navigator.mediaDevices.getUserMedia`; for location it may include geolocation API calls. Where page-world instrumentation is required, use a controlled page-world bridge rather than assuming a content script shares the page's JavaScript execution world.

The evidence layer is not itself proof that data was successfully obtained or transmitted. It reports observed attempts/events.

## 5. Network Correlation

The background service worker will observe available network metadata and correlate recent privacy-sensitive events with nearby requests.

Relevant metadata may include:

- destination
- HTTP method
- resource type
- initiator
- timestamp
- available request/response metadata

The extension must **not** claim arbitrary visibility into decrypted HTTPS request bodies. It should not collect raw network payloads as part of the default architecture.

The UI will use evidence-oriented language such as **“Potential unauthorized data transmission”** rather than asserting that a particular recording, image, or file was uploaded when that fact cannot be directly established.

A confidence/risk model will classify evidence approximately as:

- **Green:** allowed/expected behavior
- **Orange:** suspicious or potentially policy-inconsistent behavior
- **Red:** strong evidence of a policy/consent mismatch

The exact scoring formula is an implementation detail and must remain explainable and evidence-based.

## 6. File Monitoring — Later Phase

The extension will not continuously scan the Windows filesystem.

The later file-protection phase will instead observe browser-mediated exposure of user-selected files, such as:

- `<input type="file">`
- drag/drop file exposure
- relevant `File` objects
- use of exposed files in upload-related APIs where observable

It may correlate file exposure with network activity. Page-world hooks can be bypassed, workers may have visibility limitations, and browser internals may hide some upload details. The UI must communicate these limitations.

The exact file policy modes (**Ask**, **Block**, **Monitor only**) remain a design item for the file phase and are intentionally not hard-coded by this specification.

## 7. Evidence/Event Model

Events are persisted so that the popup can show activity after the original page event has occurred.

A logical event contains:

- timestamp
- website/origin
- data/permission type
- browser permission state when available
- API attempt/observation
- network metadata when correlated
- user decision
- enforcement layer
- risk/confidence
- human-readable reason

Example presentation:

```text
14:32:01 Camera permission: DENIED
14:32:03 Camera API attempt: DETECTED
14:32:04 Network request: DETECTED
14:32:04 Potential transmission: MEDIUM
```

The storage model should be compact enough for local browser storage and should avoid retaining unnecessary sensitive content.

## 8. Popup and Warning UI

The eventual popup will expose the current origin, protection state, event count, activity history, privacy-summary access, and settings.

Target structure:

```text
Privacy Monitor
example.com

Protection Active

Camera       Protected
Microphone   Protected
Location     Protected
Files        Protected

2 Events

[View Activity]
[Privacy Summary]
[Settings]
```

The first milestone may keep the existing scaffold's simpler UI while the protection engine is implemented.

## 9. Visual Customization

The popup and in-page warning will share one theme system.

Supported concepts:

- Light / Dark / System / Custom
- solid, linear-gradient, or radial-gradient backgrounds
- custom accent color or accent gradient
- primary/secondary text colors
- border radius
- transparency
- border visibility
- shadow intensity
- preset themes such as Midnight, Aurora, Frost, Sunset, Matrix, Purple, and Custom

Theme preferences are stored with extension storage. Customization must not alter the underlying security decisions.

## 10. Privacy Terms Analyzer — Separate Subsystem

A later subsystem will provide a **“Summarize Terms & Agreements”** feature. It will analyze accessible policy/terms text for topics such as:

- data collected
- files uploaded
- file usage
- retention
- third-party sharing
- AI/model training
- advertising/tracking
- deletion rights
- policy changes
- consent
- selling/sharing data

This subsystem is separate from real-time permission protection and must not be presented as proof of what the site actually transmitted.

## 11. Testing Strategy

A deliberately vulnerable local test site will be created for development. It will provide controls that:

- request Camera
- request Microphone
- request Location
- select a File
- upload a File

Tests will verify detection, blocking, allowing, alerts, persistent decisions, event logging, and network correlation before testing against real sites.

The project should favor deterministic local tests for security behavior. Browser APIs that depend on browser UI or permissions must have explicit manual verification steps in addition to automated tests where automation cannot faithfully reproduce the browser behavior.

## 12. Implementation Phases

1. Permission detection + enforcement for camera/microphone/location
2. In-page warning system with Allow/Block and alert toggle
3. Persistent evidence/event engine
4. Network correlation
5. File monitoring
6. Terms/privacy analyzer
7. Dashboard/settings and visual customization
8. Vulnerable local test website and end-to-end verification

Phase 1 is the first implementation target.

## 13. Technical Constraints and Honesty Rules

- Use Manifest V3.
- Prefer browser-supported enforcement APIs over simulated UI-only blocking.
- Never claim an API provides capabilities it does not expose.
- Do not claim visibility into arbitrary decrypted HTTPS bodies.
- Do not continuously scan the user's filesystem.
- Keep stored evidence local to the extension unless a future design explicitly adds another destination.
- Minimize collection of sensitive data; store metadata and decisions rather than raw media or payloads.
- Clearly distinguish **attempt detected**, **permission granted/denied**, **request observed**, and **transmission inferred**.
- Browser games and normal browsing should remain usable when alerts are enabled; the warning must be non-modal and non-focus-stealing.

## 14. Proposed Component Boundaries

The initial scaffold will evolve toward these responsibilities:

- `background/service-worker.js` — extension lifecycle, permission-policy coordination, persistent event coordination, and network observation.
- `content/monitor.js` — page/content-side detection and event bridge.
- `popup/popup.js` — popup state and user-facing controls.
- `popup/popup.html` / `popup/popup.css` — popup presentation.
- `shared/` (to be introduced when needed) — shared event/policy definitions rather than duplicating protocol strings across layers.
- `tests/` — unit/integration-oriented test coverage and test fixtures.
- `test-site/` — deliberately vulnerable local website for end-to-end verification.

Exact file decomposition may be refined in the implementation plan, but interfaces between policy, evidence, and UI should remain explicit.

## 15. Out of Scope for the First Milestone

- Continuous filesystem surveillance
- Arbitrary HTTPS payload decryption
- Claiming certainty about uploaded media when only metadata is observable
- Cloud telemetry or remote storage
- Full terms-analysis implementation
- Full dashboard/theme editor before the protection core works
- Support for every possible browser permission

## 16. Success Criteria for the First Implementation Milestone

The first milestone is successful when, on the local vulnerable test site:

1. Camera, microphone, and location attempts can be detected where the browser/API permits observation.
2. The selected enforcement mode is respected.
3. Extension-level policy can be stricter than browser permission state where the chosen API path supports it.
4. An unknown origin + permission combination produces a non-disruptive Allow/Block prompt when alerts are enabled.
5. The user's decision persists for that origin + permission type.
6. Alerts can be disabled without disabling the underlying protection policy.
7. Decisions and observed events are persisted locally.
8. The UI distinguishes observed evidence from inferred transmission.
9. The implementation includes explicit handling/documentation for browser API limitations.
10. Automated tests and manual browser verification cover the core flow.

## 17. Open Implementation Questions

These are intentionally deferred to implementation research rather than silently assumed:

- Exact current Chrome API mechanism for browser-level camera/microphone/location enforcement and its permissions/limitations.
- The most reliable page-world bridge mechanism for the selected API hooks.
- Storage schema/versioning strategy as events and policies evolve.
- Exact network-correlation window and scoring thresholds.
- Browser compatibility beyond Chromium-based Manifest V3 implementations.

These questions must be resolved with current browser documentation and tests before code relies on a specific API behavior.
