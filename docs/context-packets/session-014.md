# Context Packet - Session 014

## Module

Final v1 accessibility, copy, and release readiness.

## Goal

Final v1 pass on accessibility, copy, and release readiness.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/OFFLINE_PWA.md`
- `docs/TESTING_DEBUGGING.md`
- `docs/context-packets/session-014.md`

## Allowed Scope

- Review the finished v1 shell for accessibility, responsive layout, copy consistency, and emergency/source visibility.
- Polish Romanian UI copy only in content files.
- Fix release-readiness issues in PWA metadata, docs, tests, or static app behavior when directly related to v1 readiness.
- Add or update focused tests for changed behavior.
- Update docs when accessibility, release, or verification assumptions change.
- Ledger and next context packet updates.

Do not change shelter data normalization, ranking policy, emergency content semantics, or sensor hook internals beyond dependency fixes.

## Expected Outputs

- The app is ready for a v1 release candidate review.
- Romanian UI copy is consistent and readable.
- Accessibility landmarks, labels, focus states, and small-screen layout are checked.
- Offline/PWA, emergency, source, GPS fallback, manual fallback, and compass fallback caveats remain visible.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
chore: prepare v1 release readiness pass
```

## Next Session Goal

Cut or hand off the v1 release candidate.
