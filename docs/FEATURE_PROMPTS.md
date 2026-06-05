# Feature Prompts

Use these prompts to start focused implementation sessions. Each session should load `PROJECT_CONTEXT.md`, `SESSION_LEDGER.md`, this file if needed, and the current context packet.

## Session 002 - Scaffold

Goal: scaffold Vite React TypeScript PWA structure.

Scope:
- Create package scripts.
- Add Vite, React, TypeScript, and test tooling.
- Add base app entry files.
- Add initial manifest/service worker placeholders if useful.
- Keep UI minimal.

Verify:
- `npm install`
- `npm run build`
- `git diff --check`
- `git status --short`

Commit:
- `chore: scaffold vite react pwa`

## Data Adapter

Goal: vendor and normalize shelter data.

Scope:
- Add vendored JSON.
- Add source metadata.
- Add normalized schema and adapter.
- Add tests for status/type/capacity/coordinate normalization.

Verify:
- Data tests.
- Production build.

Commit:
- `feat: add shelter data adapter`

## Geo Ranking

Goal: calculate distance, bearing, cardinal direction, and shelter ranking.

Scope:
- Add pure geo utilities.
- Add ranking policy from `docs/DATA.md`.
- Add tests for known coordinates and status priority.

Commit:
- `feat: add shelter ranking`

## Location Hook

Goal: implement GPS, cached location, smoothing, and manual fallback state.

Scope:
- Use `watchPosition`.
- Cache last known location locally with expiry.
- Expose permission/error/source state.
- Never send location data over network.

Commit:
- `feat: add location tracking`

## Compass Hook

Goal: implement heading support as a secondary navigation aid.

Scope:
- Support iOS permission request.
- Support Android/iOS heading variants.
- Smooth heading and handle 0/360 wrap.
- Expose calibration/accuracy state.

Commit:
- `feat: add compass heading`

## UI Shell

Goal: build mobile-first Romanian UI.

Scope:
- AMOLED true black theme.
- Primary shelter panel.
- Compass display.
- Nearest shelter list.
- Manual fallback controls.
- Emergency call buttons.

Commit:
- `feat: build emergency shelter ui`

## Emergency Content

Goal: add Romanian emergency instructions.

Scope:
- Immediate actions.
- Moving to shelter.
- Behavior inside shelter.
- After-alert behavior.
- Source/disclaimer copy.

Commit:
- `feat: add emergency instructions`

## PWA Offline

Goal: complete manifest, icons, service worker, and offline checks.

Scope:
- Precache app shell and data.
- Navigation fallback.
- Installability.
- Offline-ready UI indicator if practical.

Commit:
- `feat: add offline pwa support`

## Testing Pass

Goal: strengthen automated and manual verification.

Scope:
- Unit tests for core utilities.
- Component/hook tests where practical.
- Manual checklist update.

Commit:
- `test: add pwa verification coverage`
