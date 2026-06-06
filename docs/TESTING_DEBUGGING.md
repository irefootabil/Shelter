# Testing And Debugging

## Verification Commands

After scaffold, expected commands are:

```powershell
npm install
npm run build
npm test
npm run preview
```

Exact scripts may change during Session 002. Update this document if script names change.

## Test Layers

- Unit tests for geo math, bearing, cardinal directions, data normalization, ranking, and storage helpers.
- Component or hook tests for permission states when practical.
- Manual browser tests for GPS, compass, installability, and offline behavior.
- Production build check before each implementation handoff.

## Logging Rules

- No analytics.
- No remote telemetry.
- No precise coordinate logs by default.
- Development logging must go through a small debug helper.
- Temporary debugging logs must be removed or gated before commit.
- A local `?debug=1` mode may show sensor/cache state in the UI without sending data anywhere.

## Browser Debugging

- Use Chrome DevTools Application tab for service worker, cache storage, manifest, and installability.
- Use DevTools Network offline mode to verify offline refresh.
- Use DevTools Sensors panel to simulate geolocation.
- Use responsive device mode for small Android, iPhone notch/safe area, and desktop fallback.

## Device Debugging

- iOS requires explicit permission for device orientation in many browsers.
- Geolocation, service workers, and PWA install require HTTPS outside localhost.
- Compass readings can be wrong near metal, cars, magnetic cases, or dense buildings.
- If calibration is poor, show Romanian guidance to move the phone in a figure-eight motion.

## Manual Scenarios

Use the step-by-step PWA runbook in `docs/OFFLINE_PWA.md` for installability, first-load caching, offline reload,
manual shelter fallback, GPS fallback, compass fallback, and emergency/source visibility.

- GPS granted and accurate.
- GPS denied.
- GPS unavailable.
- Cached location available.
- Cached location expired.
- Manual county/town fallback.
- Compass unsupported.
- Compass permission denied.
- Compass permission granted.
- Offline after first load.
- Fresh load with no service worker yet.
