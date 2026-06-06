# Context Packet - Session 017

## Module

Physical-device GitHub Pages QA.

## Goal

Verify the GitHub Pages deployment on real devices after the repository is published.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/OFFLINE_PWA.md`
- `docs/v1-release-candidate-handoff.md`
- `docs/context-packets/session-017.md`

## Allowed Scope

- Verify the deployed GitHub Pages URL, expected to be `https://<user>.github.io/Shelter/` unless the repository name changes.
- Run the manual QA checklist from `docs/OFFLINE_PWA.md`.
- Fix only deployment, installability, offline-cache, or device-permission issues found during QA.
- Update docs/tests/runtime behavior when tied to a concrete deployment or device finding.

Do not expand v1 scope or add new features during this session.

## Expected Outputs

- Real deployed URL recorded.
- Physical-device QA findings recorded with browser/device details.
- Fixes, if any, verified with relevant build/test/manual checks.
- Ledger update and required session commit.

## Verification

For deployment fixes, run:

```powershell
npm run build
npm test
git diff --check
```

Then repeat the relevant manual checks from `docs/OFFLINE_PWA.md` against the deployed HTTPS URL.

## Next Session Goal

Use GitHub Pages QA results to choose either v1 release publication follow-up or a focused v1.1 planning session.
