import { describe, expect, it } from "vitest";
import type { Shelter } from "../data";
import type { Coordinate } from "./geo";
import { rankShelters } from "./ranking";

const userCoordinate: Coordinate = { latitude: 44.4268, longitude: 26.1025 };

function makeShelter(overrides: Partial<Shelter>): Shelter {
  return {
    id: "shelter-1",
    county: "Bucuresti",
    town: "Bucuresti",
    address: "Adresa 1",
    type: "public",
    latitude: 44.4268,
    longitude: 26.1025,
    capacity: 100,
    status: "functional",
    ...overrides,
  };
}

describe("rankShelters", () => {
  it("chooses the nearest functional shelter before closer lower-priority statuses", () => {
    const shelters = [
      makeShelter({ id: "partial-near", address: "Adresa 1", latitude: 44.427, status: "partial" }),
      makeShelter({ id: "unknown-near", address: "Adresa 2", latitude: 44.4271, status: "unknown" }),
      makeShelter({ id: "functional-far", address: "Adresa 3", latitude: 44.44, status: "functional" }),
    ];

    const ranking = rankShelters(userCoordinate, shelters);

    expect(ranking.primary?.shelter.id).toBe("functional-far");
    expect(ranking.nearest.map(({ shelter }) => shelter.id)).toEqual(["partial-near", "unknown-near", "functional-far"]);
  });

  it("falls back by status priority through partial, unknown, then nonfunctional", () => {
    const ranking = rankShelters(userCoordinate, [
      makeShelter({ id: "nonfunctional-near", address: "Adresa 1", latitude: 44.427, status: "nonfunctional" }),
      makeShelter({ id: "unknown-middle", address: "Adresa 2", latitude: 44.428, status: "unknown" }),
      makeShelter({ id: "partial-far", address: "Adresa 3", latitude: 44.44, status: "partial" }),
    ]);

    expect(ranking.primary?.shelter.id).toBe("partial-far");

    const unknownOnlyRanking = rankShelters(userCoordinate, [
      makeShelter({ id: "nonfunctional-near", address: "Adresa 1", latitude: 44.427, status: "nonfunctional" }),
      makeShelter({ id: "unknown-far", address: "Adresa 2", latitude: 44.44, status: "unknown" }),
    ]);

    expect(unknownOnlyRanking.primary?.shelter.id).toBe("unknown-far");

    const nonfunctionalOnlyRanking = rankShelters(userCoordinate, [
      makeShelter({ id: "nonfunctional-only", address: "Adresa 1", latitude: 44.427, status: "nonfunctional" }),
    ]);

    expect(nonfunctionalOnlyRanking.primary?.shelter.id).toBe("nonfunctional-only");
  });

  it("sorts the nearest list by Haversine distance and then stable shelter fields", () => {
    const ranking = rankShelters(userCoordinate, [
      makeShelter({ id: "far", address: "Adresa C", latitude: 44.44 }),
      makeShelter({ id: "tie-b", address: "Adresa B", latitude: 44.43 }),
      makeShelter({ id: "near", address: "Adresa A", latitude: 44.427 }),
      makeShelter({ id: "tie-a", address: "Adresa B", latitude: 44.43 }),
    ]);

    expect(ranking.nearest.map(({ shelter }) => shelter.id)).toEqual(["near", "tie-a", "tie-b", "far"]);
    expect(ranking.nearest[0].distanceMeters).toBeGreaterThan(0);
    expect(ranking.nearest[0].distanceMeters).toBeLessThan(ranking.nearest.at(-1)?.distanceMeters ?? 0);
  });

  it("supports limiting nearest candidates without changing the primary recommendation", () => {
    const ranking = rankShelters(
      userCoordinate,
      [
        makeShelter({ id: "partial-near", latitude: 44.427, status: "partial" }),
        makeShelter({ id: "functional-far", latitude: 44.44, status: "functional" }),
      ],
      { limit: 1 },
    );

    expect(ranking.primary?.shelter.id).toBe("functional-far");
    expect(ranking.nearest.map(({ shelter }) => shelter.id)).toEqual(["partial-near"]);
  });

  it("returns an empty ranking for invalid user coordinates, invalid shelter coordinates, or empty input", () => {
    expect(rankShelters({ latitude: Number.NaN, longitude: 26.1025 }, [makeShelter({})])).toEqual({
      primary: null,
      nearest: [],
    });

    expect(
      rankShelters(userCoordinate, [
        makeShelter({ id: "invalid-latitude", latitude: 91 }),
        makeShelter({ id: "invalid-longitude", longitude: 181 }),
      ]),
    ).toEqual({ primary: null, nearest: [] });

    expect(rankShelters(userCoordinate, [])).toEqual({ primary: null, nearest: [] });
  });
});
