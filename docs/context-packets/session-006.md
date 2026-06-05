# Context Packet - Session 006

## Module

Location hook.

## Goal

Implement location hook.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA.md`
- `docs/context-packets/session-006.md`

## Allowed Scope

- `src/hooks` location hook code.
- `src/lib` storage helper code only if required by the location hook.
- Imports from `src/lib` coordinate validation helpers.
- Focused hook or helper tests for permission states, cached last known location, stale data, and geolocation fallback behavior.
- Documentation updates for location permissions, storage keys, or fallback assumptions.
- Ledger and next context packet updates.

Do not implement compass hooks, ranking UI, map UI, PWA changes, or emergency content workflows in this session.

## Expected Outputs

- Location hook that watches browser geolocation when available and permitted.
- State model for idle/loading/ready/denied/unavailable/error/stale behavior.
- Cached last known coordinate with an expiry policy and safe localStorage fallbacks.
- Effective location selection that can use fresh GPS, cached location, or later manual fallback input.
- Focused tests covering unavailable geolocation, denied/error callbacks, cache read/write, and invalid cached coordinates.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
feat: add location hook
```

## Next Session Goal

Implement compass hook.
