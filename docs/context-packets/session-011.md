# Context Packet - Session 011

## Module

Location and shelter recommendation UI.

## Goal

Integrate location and shelter recommendation UI.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA.md`
- `docs/context-packets/session-011.md`

## Allowed Scope

- Wire `useLocation` into the existing mobile shell.
- Use shelter ranking helpers to show nearest shelter recommendations from GPS or cached location.
- Add manual county/town fallback controls if needed for the recommendation path.
- Keep Romanian UI copy in `src/content/appCopy.ts` or other content files.
- Add or update focused component tests for the new UI behavior.
- Documentation updates for UI/location workflow assumptions if contracts change.
- Ledger and next context packet updates.

Do not change PWA cache behavior, compass behavior, data normalization, or emergency content beyond dependency fixes.

## Expected Outputs

- The shell surfaces the effective location state instead of static placeholders.
- Users can see ranked shelter candidates when a usable location source exists.
- Users have a manual fallback path when GPS is unavailable or denied.
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
feat: integrate shelter recommendations
```

## Next Session Goal

Integrate compass guidance and direction display.
