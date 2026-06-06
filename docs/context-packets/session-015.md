# Context Packet - Session 015

## Module

v1 Release Candidate Handoff.

## Goal

Cut or hand off the v1 release candidate.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/OFFLINE_PWA.md`
- `docs/TESTING_DEBUGGING.md`
- `docs/context-packets/session-015.md`

## Allowed Scope

- Prepare the v1 release candidate handoff from the current app state.
- Review release notes, manual QA status, known skipped checks, and deployment assumptions.
- Update docs only when release handoff details, verification status, or next-owner instructions need clarification.
- Run release verification commands and record results.
- Ledger and next context packet updates.

Do not change v1 runtime behavior unless release verification finds a blocking defect.

## Expected Outputs

- A clear v1 release-candidate handoff.
- Verification status for build, tests, diff checks, and any manual/browser checks run in the session.
- Known skipped physical-device checks remain explicit.
- Deployment and rollback assumptions are easy for the next owner to follow.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
docs: hand off v1 release candidate
```

## Next Session Goal

Post-release follow-up or v1.1 planning.
