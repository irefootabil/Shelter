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

## Sensor Constraints

- GPS may be unavailable, denied, stale, or inaccurate.
- Compass APIs vary across iOS and Android.
- Compass must be treated as secondary to text direction and shelter details.
