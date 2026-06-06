# Architecture

## Overview

The app is a static Vite React TypeScript PWA. All required v1 data and content are bundled or precached so the app works after first load without network access.

## Data Flow

1. Vendored shelter JSON is loaded by the data adapter.
2. The adapter normalizes records into the shared shelter schema.
3. Location comes from GPS, cached location, or manual county/town fallback.
4. Geo utilities calculate distance, bearing, and cardinal direction.
5. Ranking chooses the best primary shelter and nearest list.
6. UI renders the primary recommendation, compass aid, shelter list, and emergency instructions.

## Module Boundaries

- `src/data`: vendored data and data source metadata.
- `src/lib`: pure utilities for geo math, ranking, storage, formatting, and debug helpers.
- `src/hooks`: browser API state for location and compass.
- `src/components`: UI components only.
- `src/content`: Romanian UI copy and emergency instructions.
- `public`: manifest, icons, and service worker assets.

## PWA Lifecycle

- The service worker precaches the shell, static assets, vendored data, manifest, icons, and emergency content.
- Navigation requests fall back to the cached app shell.
- New app versions should update cache names so stale assets can be replaced predictably.

## Privacy Constraints

- No backend calls for location.
- No analytics.
- No remote telemetry.
- Never log precise coordinates by default.
- Store only the last known location locally, with an expiry policy documented in code.

## Location State

- `useLocation` watches browser geolocation when available and permission is not already denied.
- Effective location priority is fresh GPS, fresh cache, then manual fallback input.
- Last known GPS location is cached under `adapost-urgenta-romania:last-known-location:v1`.
- Cached location is considered fresh for 15 minutes by default; expired cached coordinates are surfaced as stale but are not treated as the current effective location.
- Storage access must use safe helpers because private browsing, quota limits, or disabled storage can throw.

## Sensor Constraints

- GPS may be unavailable, denied, stale, or inaccurate.
- Compass APIs vary across iOS and Android.
- Compass must be treated as secondary to text direction and shelter details.
- `useCompass` listens to `deviceorientation` when available and exposes a separate explicit permission request action for iOS-style `DeviceOrientationEvent.requestPermission`.
- Compass readings prefer `webkitCompassHeading` when present, fall back to normalized `alpha` heading, smooth wraparound changes, and surface browser-provided accuracy as a calibration signal.
- If orientation APIs are missing, denied, or do not include usable heading values, the app must keep working with text directions and shelter details.

## Emergency Content

- Emergency numbers and concise Romanian instructions live in `src/content/emergencyContent.ts`.
- Content is bundled with the app so it remains available offline after the first load.
- Emergency guidance is orientation-only: the UI must tell users to follow 112, RO-Alert, DSU, IGSU, local authorities, and intervention teams when official instructions differ from bundled content.
- Source links point users to FiiPregatit.ro and STS 112 information for review when network access is available.

## UI Shell

- The first screen is a mobile-first app shell, not a marketing landing page.
- UI copy lives in `src/content/appCopy.ts`; emergency guidance remains in `src/content/emergencyContent.ts`.
- The shell keeps GPS behind an explicit action, reads cached/manual effective locations through `useLocation`, and ranks shelter candidates locally with the shared ranking helper.
- The shell includes a visible install/offline preparation section so users can verify first-load caching and home-screen install before an emergency.
- Manual fallback derives county and town options from bundled shelter data and uses the center of matching town shelters as the manual coordinate.
- The shell must keep source/disclaimer text visible so users understand shelter data can be stale and official instructions take priority.
- Styling favors AMOLED-friendly dark surfaces, safe-area padding, large tap targets, and accessible landmarks for header, main content, and primary navigation.
