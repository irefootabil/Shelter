# Context Packet - Session 008

## Module

Emergency content.

## Goal

Implement emergency content.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA.md`
- `docs/context-packets/session-008.md`

## Allowed Scope

- Romanian emergency content files under `src/content`.
- Small pure helpers for structuring emergency numbers or instruction lists if needed.
- Focused tests for exported emergency content shape and required Romanian copy.
- Documentation updates for emergency content assumptions, official-source caveats, or offline content behavior.
- Ledger and next context packet updates.

Do not implement ranking UI, map UI, PWA changes, location hook changes, compass hook changes beyond dependency fixes, or shelter data changes in this session.

## Expected Outputs

- Romanian emergency numbers and concise emergency instructions available from content exports.
- Content suitable for offline rendering after first load.
- Clear source/disclaimer text telling users to follow official authority instructions.
- Tests that guard required numbers, key instruction groups, and export shape.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
feat: add emergency content
```

## Next Session Goal

Implement UI shell.
