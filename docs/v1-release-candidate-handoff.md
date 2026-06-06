# v1 Release Candidate Handoff

## Status

The v1 release candidate is ready to hand off from the current app state.

Core scope remains unchanged:

- Static Vite React TypeScript PWA.
- Romanian UI and emergency content bundled for offline use after first load.
- Vendored shelter data from `mhlnu/adaposturi`, citing the official IGSU source.
- Manual county/town fallback available without GPS.
- No backend, accounts, analytics, telemetry, or online maps in v1.

## Release Verification

Session 015 verification passed on 2026-06-06:

```powershell
npm run build
npm test
git diff --check
git status --short
```

Results:

- `npm run build`: passed. Vite emitted the known large chunk warning because the vendored shelter dataset is bundled.
- `npm test`: passed with 9 test files and 48 tests.
- `git diff --check`: passed.
- `git status --short`: clean before release-handoff documentation updates.

## Manual Checks Still Required On Physical Devices

These checks were not executed in this desktop handoff session and should remain explicit for the release owner:

- Android and iOS install prompts over HTTPS.
- Installed home-screen launch without browser chrome where supported.
- Real offline reload from the installed app after first online load.
- Real GPS permission grant, denial, and unavailable flows.
- Real compass permission grant, denial, unsupported, and poor-calibration flows.

Use the runbook in `docs/OFFLINE_PWA.md` for the exact steps.

## Deployment Assumptions

- Deploy the production build output from `dist/` to a static HTTPS host.
- The host must serve the app over HTTPS so service workers, geolocation, orientation permissions, and PWA installability work outside localhost.
- The host should fall back navigation requests to `index.html`; the service worker also falls back navigations to the cached app shell after first load.
- Do not add analytics, remote telemetry, backend calls, or online map dependencies for v1.

## Rollback Assumptions

- Roll back by redeploying the previous known-good static build.
- If cached asset contracts change in a future release, bump `CACHE_VERSION` in `public/sw.js`.
- If a deployment serves stale assets, clear the host/CDN cache and verify that a fresh first online load installs the expected service worker cache names from `docs/OFFLINE_PWA.md`.

## Next Owner Notes

- Treat remaining physical-device QA as the final release gate.
- Keep official-source and stale-data disclaimers visible.
- If post-release work starts, prefer v1.1 planning around bundle-size strategy, broader device QA results, and any data-refresh process before feature expansion.
