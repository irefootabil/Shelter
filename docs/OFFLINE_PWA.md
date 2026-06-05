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

## Deployment Notes

Any static host is acceptable if it serves over HTTPS and supports service workers. GitHub Pages, Netlify, and Cloudflare Pages are all valid targets.
