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

## Runtime Strategy

- Navigation requests should fall back to cached app shell.
- Static assets should be cache-first after install.
- Network is not required for core app behavior after first load.
- Cache names should include an app version.

## Offline Acceptance Checks

- Load app online once.
- Confirm service worker is active.
- Switch browser DevTools to offline mode.
- Refresh app.
- Confirm primary UI, shelter data, manual fallback, and emergency instructions still render.

## Deployment Notes

Any static host is acceptable if it serves over HTTPS and supports service workers. GitHub Pages, Netlify, and Cloudflare Pages are all valid targets.
