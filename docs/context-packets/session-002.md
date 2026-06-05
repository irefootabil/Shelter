# Context Packet - Session 002

## Module

App scaffold.

## Goal

Scaffold the Vite React TypeScript PWA structure and basic verification scripts.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/OFFLINE_PWA.md`
- `docs/GIT_WORKFLOW.md`

## Allowed Scope

- Root package/config files.
- Initial `src` app entry files.
- Initial `public` PWA files if useful.
- Test/build configuration.
- Ledger and next context packet updates.

Do not vendor shelter data in this session unless scaffold tooling requires a tiny placeholder.

## Expected Outputs

- Vite React TypeScript app scaffold.
- Package scripts for dev, build, preview, and tests.
- Minimal app shell that can build.
- Updated documentation if scripts or assumptions change.
- `docs/context-packets/session-003.md` for the data adapter session.

## Verification

```powershell
npm install
npm run build
npm test
git diff --check
git status --short
```

If `npm test` is not available yet, add a minimal test setup or record why it is skipped.

## Required Commit

```text
chore: scaffold vite react pwa
```

## Next Session Goal

Vendor and normalize shelter data.
