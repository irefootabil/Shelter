# Context Packet - Session 012

## Module

Compass guidance and direction display.

## Goal

Integrate compass guidance and direction display.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA.md`
- `docs/context-packets/session-012.md`

## Allowed Scope

- Wire `useCompass` into the existing mobile shell.
- Use geo bearing and cardinal direction helpers to show direction from the effective location to the primary shelter.
- Add Romanian direction and compass UI copy in `src/content/appCopy.ts` or another content file.
- Keep compass as a secondary aid; text shelter details must remain usable without orientation permission.
- Add or update focused component tests for direction and unavailable-compass behavior.
- Documentation updates for UI/compass workflow assumptions if contracts change.
- Ledger and next context packet updates.

Do not change PWA cache behavior, data normalization, shelter ranking policy, or emergency content beyond dependency fixes.

## Expected Outputs

- The primary shelter recommendation includes a direction/cardinal cue when a location and primary shelter exist.
- Compass permission/status is surfaced without blocking shelter recommendations.
- The UI remains useful when orientation APIs are unavailable or denied.
- Source and official-instruction caveats remain visible.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
feat: add compass guidance UI
```

## Next Session Goal

Polish offline-first PWA install and manual QA checklist.
