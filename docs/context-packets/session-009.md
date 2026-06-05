# Context Packet - Session 009

## Module

UI shell.

## Goal

Implement UI shell.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA.md`
- `docs/context-packets/session-009.md`

## Allowed Scope

- React UI shell components and styling under `src`.
- Romanian UI copy under `src/content`.
- Small formatting helpers needed by the shell.
- Focused component tests for visible shell behavior.
- Documentation updates for UI assumptions or workflows.
- Ledger and next context packet updates.

Do not implement PWA cache changes, data adapter changes, ranking policy changes, location hook changes, or compass hook changes beyond dependency fixes.

## Expected Outputs

- Mobile-first app shell that can display app status, emergency content entry points, and placeholders for later shelter/location flows.
- AMOLED-friendly styling with safe-area support and accessible headings/controls.
- Romanian UI copy kept in content files.
- Tests that guard the main shell landmarks and key Romanian copy.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
feat: add ui shell
```

## Next Session Goal

Implement PWA offline cache.
