# Shelter Data

## Sources

- Official IGSU PDF: https://igsu.ro/resources/528ae255-7b59-4c84-bbed-252a49e871af.pdf
- Reference JSON repository: https://github.com/mhlnu/adaposturi

V1 vendors the reference JSON and cites the official IGSU PDF. V1 does not implement a PDF parser.

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
- Use `nonfunctional` as primary only when no better shelter is available.
- The nearest list may include all statuses but must visibly mark nonfunctional shelters.
- Distance sorting uses Haversine distance from the current effective location.

## Manual Fallback

Manual fallback must allow selecting or searching county and town from bundled data. The fallback location can be the center of matching shelter coordinates for that town/county.

## Known Risks

- Source data may be stale.
- Parsed coordinates may be wrong.
- Shelter status can change.
- Private shelters may not be accessible to the general public.

The app must display source/date/disclaimer text and tell users to follow official authority instructions.
