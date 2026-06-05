# Git Workflow

## Rules

- Initialize Git in Session 001 if no repository exists.
- Every session must end with a commit.
- Commit only intentional, coherent work from that session.
- If blocked, commit the ledger/context packet update documenting the blocker.
- Do not commit generated build output, caches, logs, secrets, or local environment files.
- Do not rewrite history, reset, discard changes, amend commits, or force-push unless explicitly instructed.

## Required Checks Before Commit

```powershell
git status --short
git diff --check
```

Run module-specific verification from the current context packet before committing.

## Commit Style

Use small module-focused commits:

```text
docs: add project documentation workflow
feat: add shelter data adapter
feat: add compass hook
test: cover shelter ranking
chore: record blocked compass session
```

## Staging

- Stage only files from the current session scope.
- Inspect `git status --short` before staging.
- If unrelated files appear, leave them unstaged and mention them in the handoff.

## End Of Session

- Update `SESSION_LEDGER.md`.
- Create or update the next context packet.
- Run required checks.
- Commit the session.
- Capture the commit hash with `git rev-parse --short HEAD`.
- Run `git status --short` after commit and report whether the tree is clean.
