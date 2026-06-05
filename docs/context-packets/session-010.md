# Context Packet - Session 010

## Module

PWA offline cache.

## Goal

Implement PWA offline cache.

## Read

- `PROJECT_CONTEXT.md`
- `SESSION_LEDGER.md`
- `docs/ARCHITECTURE.md`
- `docs/OFFLINE_PWA.md`
- `docs/context-packets/session-010.md`

## Allowed Scope

- Service worker cache strategy and app-shell fallback under `public/sw.js`.
- Registration flow fixes in `src/registerServiceWorker.ts` if needed.
- Manifest/icon references only if required by cache correctness.
- Focused tests or static checks for cache asset lists if practical.
- Documentation updates for PWA lifecycle, cache names, and offline assumptions.
- Ledger and next context packet updates.

Do not implement UI feature work, shelter ranking changes, data adapter changes, or sensor hook changes beyond dependency fixes.

## Expected Outputs

- Versioned cache name for app shell and static assets.
- Navigation fallback to the cached app shell.
- Cache entries for core Vite shell files, manifest, icon, vendored shelter data, and bundled emergency content where applicable to the static build.
- Clear behavior when a request is not cached and the network is unavailable.

## Verification

```powershell
npm run build
npm test
git diff --check
git status --short
```

## Required Commit

```text
feat: add pwa offline cache
```

## Next Session Goal

Integrate location and shelter recommendation UI.
