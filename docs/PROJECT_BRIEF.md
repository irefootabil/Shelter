# Project Brief

## Goal

Create a Romanian emergency shelter finder PWA that works offline after first load and points users toward nearby civil protection shelters.

## Users

- People in Romania using smartphones during emergencies.
- Users may be outdoors, indoors, stressed, low on battery, or without mobile data.
- Users may not have installed a native app, so the PWA must be installable from the browser.

## Success Criteria

- The app loads after first visit while offline.
- Shelter data is available locally.
- The app finds nearby usable shelters from GPS, cached location, or manual county/town fallback.
- The nearest recommendation favors `Functional`, then `Partial functional`, and clearly marks `Nonfunctional`.
- The UI shows distance, direction text, address, status, capacity, and emergency guidance in Romanian.
- The compass is helpful when available but never the only navigation cue.
- No location data leaves the device.

## Non-Goals For V1

- Online or offline maps.
- Turn-by-turn routes.
- Backend services.
- User accounts.
- Analytics or telemetry.
- PDF parsing pipeline.
- Real-time official status updates.

## Safety Position

The app is an aid, not an authority. It must state that shelter data can be stale or inaccurate and users should follow official instructions from authorities when available.

Emergency content should be concise, Romanian, and grounded in official Romanian emergency guidance where possible.
