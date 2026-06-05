# Shelter Data

## Sources

- Official IGSU PDF: https://igsu.ro/resources/528ae255-7b59-4c84-bbed-252a49e871af.pdf
- Reference JSON repository: https://github.com/mhlnu/adaposturi

V1 vendors the reference JSON and cites the official IGSU PDF. V1 does not implement a PDF parser.

## Vendored Dataset

- Local file: `src/data/allShelters.raw.json`
- Upstream file: `mhlnu/adaposturi/data/allShelters.json`
- Upstream commit: `62b69f2af42e9df1f057581f50b14edf8a601c4d`
- Upstream blob SHA: `6be338513a35af3501ac9963fdb234780d09d507`
- Vendored on: 2026-06-05

The adapter loads the county-grouped upstream JSON and exposes both normalized county groups and a flat shelter list. Raw status labels are mapped as follows:

- `green` -> `functional`
- `orange` -> `partial`
- `red` -> `nonfunctional`
- `0` or unknown labels -> `unknown`

Raw type labels are mapped as follows:

- `public` -> `public`
- `privat` -> `private`
- unknown labels -> `unknown`

Records missing id, county, town, address, or valid Romania-bounded coordinates are skipped. Non-positive or non-integer capacities normalize to `null`.

## Normalized Shelter Schema

Use a compact TypeScript schema:

```ts
type ShelterStatus = "functional" | "partial" | "nonfunctional" | "unknown";
type ShelterType = "public" | "private" | "unknown";

type Shelter = {
  id: string;
  county: string;
  town: string;
  address: string;
  type: ShelterType;
  latitude: number;
  longitude: number;
  capacity: number | null;
  status: ShelterStatus;
};
```

Keep raw Romanian status/type labels available only if needed for display or diagnostics.

## Ranking Policy

- Primary recommendation prefers the nearest `functional` shelter.
- If no functional shelter is available in the considered set, use nearest `partial`.
- If no functional or partial shelter is available, use nearest `unknown`.
- Use `nonfunctional` as primary only when no better status is available.
- The nearest list may include all statuses but must visibly mark nonfunctional shelters.
- Distance sorting uses Haversine distance from the current effective location.
- Ranking helpers return distance values in meters for later Romanian UI formatting.

## Coordinate Contracts

Geo helpers use decimal-degree coordinates with `{ latitude, longitude }` keys.

- Latitude must be a finite number from `-90` to `90`.
- Longitude must be a finite number from `-180` to `180`.
- Romania-bounded shelter coordinates use the conservative bounding box `43..49` latitude and `20..30` longitude.
- Distance helpers return meters using Haversine distance and an Earth radius of `6,371,000` meters.
- Bearing helpers return normalized degrees from north in the range `0 <= bearing < 360`.
- Cardinal direction helpers return code identifiers (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`); Romanian UI labels should be mapped later from content/i18n files.

## Manual Fallback

Manual fallback must allow selecting or searching county and town from bundled data. The fallback location can be the center of matching shelter coordinates for that town/county.

## Known Risks

- Source data may be stale.
- Parsed coordinates may be wrong.
- Shelter status can change.
- Private shelters may not be accessible to the general public.

The app must display source/date/disclaimer text and tell users to follow official authority instructions.
