# Context Packet - Session 004

## Module

Geo math.

## Goal

Implement geo math helpers.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA.md`
- `docs/context-packets/session-004.md`

## Allowed Scope

- `src/lib` geo math helper code.
- Shared type definitions needed by geo helpers.
- Unit tests for distance, bearing, cardinal direction, and coordinate validation behavior.
- Documentation updates for geo assumptions or coordinate contracts.
- Ledger and next context packet updates.

Do not implement shelter ranking, location hooks, compass hooks, map UI, or emergency content workflows in this session.

## Expected Outputs

- Haversine distance helper using meters.
- Bearing helper using degrees from north.
- Cardinal direction helper suitable for Romanian UI labels in later content files.
- Coordinate validation helpers for finite latitude and longitude values.
- Focused tests covering representative Romania coordinates and edge cases.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
feat: add geo math helpers
```

## Next Session Goal

Implement shelter ranking.
