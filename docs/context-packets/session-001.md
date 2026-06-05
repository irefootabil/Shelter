# Context Packet - Session 001

## Module

Documentation foundation.

## Goal

Create the documentation files listed in the documentation-first plan and initialize Git if needed.

## Read

- `PROJECT_CONTEXT.md` after it is created.
- `SESSION_LEDGER.md` after it is created.
- `docs/GIT_WORKFLOW.md` after it is created.

## Allowed Scope

- Documentation files.
- `.gitignore`.
- Git initialization.

Do not scaffold app implementation in this session.

## Expected Outputs

- `README.md`
- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/PROJECT_BRIEF.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA.md`
- `docs/OFFLINE_PWA.md`
- `docs/TESTING_DEBUGGING.md`
- `docs/GIT_WORKFLOW.md`
- `docs/FEATURE_PROMPTS.md`
- `docs/context-packets/session-001.md`

## Verification

```powershell
rg "TODO|TBD"
git diff --check
git status --short
```

## Required Commit

```text
docs: add project documentation workflow
```

## Next Session Goal

Scaffold Vite React TypeScript PWA structure.
