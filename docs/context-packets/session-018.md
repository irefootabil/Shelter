# Context Packet - Session 018

## Module

Physical-device release QA.

## Goal

Run physical-device install, offline, GPS, and compass QA against the deployed GitHub Pages URL.

## Deployed URL

- `https://irefootabil.github.io/Shelter/`

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/OFFLINE_PWA.md`
- `docs/v1-release-candidate-handoff.md`
- `docs/context-packets/session-018.md`

## Allowed Scope

- Execute or record manual QA from `docs/OFFLINE_PWA.md`.
- Fix only issues found against the deployed URL or real-device behavior.
- Update deployment, PWA, service worker, manifest, device-permission, or QA docs if findings require it.

Do not add new product features during this session.

## Expected Outputs

- Device/browser matrix and QA results.
- Any reproduction notes for deployment, installability, offline, GPS, or compass issues.
- Fixes, if needed, verified locally and against the deployed URL.
- Ledger update and required session commit.

## Verification

For any code or deployment fix, run:

```powershell
npm run build
npm test
git diff --check
```

Then push and confirm the GitHub Pages workflow succeeds before repeating the affected manual checks.

## Next Session Goal

Use physical-device QA results to decide whether v1 can be treated as published or whether one focused release-fix session is needed.
