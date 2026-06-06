# Offline PWA

## Requirements

- Static HTTPS hosting.
- Valid `manifest.webmanifest`.
- Service worker registered from the app.
- App shell and data available after first load.
- Installable to home screen on modern iOS and Android browsers.

## Precache Contents

- HTML app shell.
- Built JavaScript and CSS assets.
- Vendored shelter data.
- Romanian emergency content.
- Manifest.
- Icons.
- Any local fonts or static images used by v1.

The service worker lives at `public/sw.js`. It precaches the fixed core assets and parses the built `index.html`
during install to discover Vite-generated `/assets/...` files. Vendored shelter data and emergency content are
bundled into those generated JavaScript assets, so they are cached through the discovered build asset list.

## Runtime Strategy

- Navigation requests should fall back to cached app shell.
- Static assets should be cache-first after install.
- Network is not required for core app behavior after first load.
- Cache names should include an app version.
- Current cache names use `adapost-urgenta-romania-app-shell-v1` and
  `adapost-urgenta-romania-runtime-v1`; bump `CACHE_VERSION` in `public/sw.js` when changing cached asset
  contracts.
- Navigation requests are network-first while online and fall back to the cached app shell offline.
- Same-origin static assets are cache-first and are written into the runtime cache after a successful network fetch.
- If a same-origin asset is neither cached nor reachable, the service worker returns a plain-text `504` response.

## Offline Acceptance Checks

- Load app online once.
- Confirm service worker is active.
- Switch browser DevTools to offline mode.
- Refresh app.
- Confirm primary UI, shelter data, manual fallback, and emergency instructions still render.

## Manual QA Checklist

Use a production build preview or deployed HTTPS URL for these checks. Localhost is acceptable for service worker
debugging, but real phone install prompts should be checked over HTTPS.

### 1. Installability

- Open the app online in Chrome/Edge on Android or Safari on iOS.
- Confirm the manifest is detected in DevTools Application > Manifest.
- Confirm the app name is `Adapost Urgenta Romania`, the short name is `Adaposturi`, and display mode is standalone.
- Install from the browser menu:
  - Android: Install app or Add to Home screen.
  - iOS: Share > Add to Home Screen.
- Launch from the installed icon and confirm it opens to the app shell without browser chrome where supported.

### 2. First-Load Caching

- Clear site data for the app origin.
- Load the app online once.
- Confirm DevTools Application > Service Workers shows an activated worker.
- Confirm Cache Storage includes the current `adapost-urgenta-romania-app-shell-v1` cache.
- Confirm the app shell, manifest, icon, and generated `/assets/...` files are present in cache storage.

### 3. Offline Reload

- After the first online load, switch DevTools Network to Offline.
- Reload the page.
- Confirm the header, status cards, install/offline section, location controls, emergency guide, and source panel render.
- Confirm no online map, telemetry, account, or backend request is required for the primary UI.
- Confirm an uncached same-origin asset miss returns the service worker's plain-text 504 response rather than a broken app shell.

### 4. Manual Shelter Fallback

- Keep the browser offline.
- Select `Bucuresti` and `Sector 1` from the manual location controls.
- Confirm the location source changes to manual selection.
- Confirm a primary shelter recommendation and nearby shelter list render from bundled data.
- Confirm the official source and stale-data disclaimer remain visible.

### 5. GPS Fallback

- Online or localhost: simulate a granted geolocation in DevTools Sensors and activate GPS.
- Confirm the app uses GPS when available and shows an estimated accuracy when the browser provides one.
- Deny geolocation permission or simulate unavailable geolocation.
- Confirm manual county/town fallback remains usable and the app does not block shelter recommendations behind GPS.

### 6. Compass Fallback

- On a device/browser with orientation support, grant orientation permission when prompted and confirm heading status can become ready.
- Deny orientation permission or test in a browser without `DeviceOrientationEvent`.
- Confirm the text direction cue, shelter address, distance, and manual recommendation remain visible.
- If calibration is poor, confirm the UI surfaces calibration status without replacing official directions or shelter details.

### 7. Emergency And Source Visibility

- Offline, open the emergency section and confirm 112 and bundled Romanian instructions remain visible.
- Confirm the disclaimer tells users to follow 112, RO-Alert, DSU, IGSU, local authorities, and intervention teams when guidance differs.
- Confirm source links are visible for review when network access is available.

## Deployment Notes

Any static host is acceptable if it serves over HTTPS and supports service workers. GitHub Pages, Netlify, and Cloudflare Pages are all valid targets.
