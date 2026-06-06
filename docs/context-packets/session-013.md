# Context Packet - Session 013

## Module

Offline-first PWA install and manual QA checklist.

## Goal

Polish offline-first PWA install and manual QA checklist.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/OFFLINE_PWA.md`
- `docs/TESTING_DEBUGGING.md`
- `docs/context-packets/session-013.md`

## Allowed Scope

- Review and polish install/offline affordances in the app shell and PWA metadata.
- Add or update a manual QA checklist for installability, first-load caching, offline reload, manual shelter fallback, GPS fallback, compass fallback, and emergency/source visibility.
- Keep UI copy in Romanian content files and technical/manual QA docs in English.
- Add or update focused tests only for changed behavior.
- Documentation updates for PWA install/offline workflow assumptions if contracts change.
- Ledger and next context packet updates.

Do not change shelter data normalization, ranking policy, emergency content semantics, or sensor hooks beyond dependency fixes.

## Expected Outputs

- Install/offline behavior and caveats are easier to verify manually.
- A clear manual QA checklist exists for offline-first PWA behavior.
- Existing source and official-instruction caveats remain visible.
- The app continues to work without network after first load when cached assets are available.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
docs: add offline pwa qa checklist
```

## Next Session Goal

Final v1 pass on accessibility, copy, and release readiness.
