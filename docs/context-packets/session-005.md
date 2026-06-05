# Context Packet - Session 005

## Module

Shelter ranking.

## Goal

Implement shelter ranking.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA.md`
- `docs/context-packets/session-005.md`

## Allowed Scope

- `src/lib` shelter ranking helper code.
- Imports from `src/data` shelter types and from `src/lib` geo helpers.
- Unit tests for ranking by distance and shelter status priority.
- Documentation updates for ranking contracts or fallback assumptions.
- Ledger and next context packet updates.

Do not implement location hooks, compass hooks, map UI, PWA changes, or emergency content workflows in this session.

## Expected Outputs

- Ranking helper that accepts an effective user coordinate and a shelter list.
- Primary recommendation policy: nearest `functional`, then nearest `partial`, then nearest `unknown`, then nearest `nonfunctional` only when no better status exists.
- Nearest list sorted by Haversine distance and stable tie-breakers.
- Distance values returned in meters for UI formatting in later sessions.
- Focused tests covering status priority, distance sorting, invalid coordinates, and empty input.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
feat: add shelter ranking helpers
```

## Next Session Goal

Implement location hook.
