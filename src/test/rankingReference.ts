import type { Shelter, ShelterStatus } from "../data";
import { getDistanceMeters, isCoordinate, type Coordinate } from "../lib/geo";
import type { RankedShelter, ShelterRankingOptions } from "../lib/ranking";

// Frozen pre-optimization policy oracle, used only by tests and benchmarks.
export function referenceRanking(coordinate: Coordinate, shelters: readonly Shelter[], options: ShelterRankingOptions = {}) {
  if (!isCoordinate(coordinate)) return { primary: null, nearest: [] };
  const priorities: Record<ShelterStatus, number> = { functional: 0, partial: 1, unknown: 2, nonfunctional: 3 };
  function compareFields(a: Shelter, b: Shelter) {
    return a.county.localeCompare(b.county, "ro") || a.town.localeCompare(b.town, "ro") ||
      a.address.localeCompare(b.address, "ro") || a.id.localeCompare(b.id, "ro");
  }
  function compareDistance(a: RankedShelter, b: RankedShelter) {
    return a.distanceMeters - b.distanceMeters || compareFields(a.shelter, b.shelter);
  }
  const ranked = shelters.filter(isCoordinate).map((shelter) => ({
    shelter, distanceMeters: getDistanceMeters(coordinate, shelter),
  }));
  const nearest = [...ranked].sort(compareDistance);
  const primary = [...ranked].sort((a, b) => priorities[a.shelter.status] - priorities[b.shelter.status] || compareDistance(a, b))[0] ?? null;
  const limit = options.limit === undefined ? null :
    !Number.isFinite(options.limit) || options.limit <= 0 ? 0 : Math.floor(options.limit);
  return { primary, nearest: limit === null ? nearest : nearest.slice(0, limit) };
}
