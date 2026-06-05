# Context Packet - Session 003

## Module

Data adapter.

## Goal

Vendor and normalize shelter data.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA.md`
- `docs/context-packets/session-003.md`

## Allowed Scope

- `src/data` data files and adapter code.
- Shared type definitions needed by the adapter.
- Unit tests for normalization behavior.
- Documentation updates for data source, schema, or assumptions.
- Ledger and next context packet updates.

Do not implement location, ranking, map UI, compass behavior, or emergency content workflows in this session.

## Expected Outputs

- Vendored shelter JSON from `mhlnu/adaposturi` or a clearly documented blocked status if the source cannot be accessed.
- Adapter that normalizes raw shelter records into a stable app schema.
- Data source metadata citing the official IGSU PDF.
- Focused tests for normalization and invalid or incomplete records.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
feat: add shelter data adapter
```

## Next Session Goal

Implement geo math helpers.
