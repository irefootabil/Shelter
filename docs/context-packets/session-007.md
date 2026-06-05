# Context Packet - Session 007

## Module

Compass hook.

## Goal

Implement compass hook.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA.md`
- `docs/context-packets/session-007.md`

## Allowed Scope

- `src/hooks` compass hook code.
- Imports from `src/lib` geo helpers only if needed for heading normalization or direction mapping.
- Focused hook or helper tests for unsupported orientation APIs, permission states, iOS permission request behavior, heading smoothing, and calibration state.
- Documentation updates for compass permissions, browser API assumptions, or fallback behavior.
- Ledger and next context packet updates.

Do not implement ranking UI, map UI, PWA changes, location hook changes beyond dependency fixes, or emergency content workflows in this session.

## Expected Outputs

- Compass hook that reads browser orientation or compass heading when supported.
- State model for idle/listening/ready/permission-required/denied/unavailable/error behavior.
- iOS `DeviceOrientationEvent.requestPermission` flow exposed as an explicit request action.
- Smoothed heading in degrees, optional cardinal direction code, and a calibration/accuracy signal when the browser provides one.
- Focused tests covering unsupported APIs, permission request success/denial, orientation updates, smoothing, and cleanup.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
feat: add compass hook
```

## Next Session Goal

Implement emergency content.
