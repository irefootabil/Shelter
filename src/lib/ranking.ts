import type { Shelter, ShelterStatus } from "../data";
import { getDistanceMeters, isCoordinate, type Coordinate } from "./geo";

export type RankedShelter = {
  shelter: Shelter;
  distanceMeters: number;
};

export type ShelterRanking = {
  primary: RankedShelter | null;
  nearest: RankedShelter[];
};

export type ShelterRankingOptions = {
  limit?: number;
};

const STATUS_PRIORITY: Record<ShelterStatus, number> = {
  functional: 0,
  partial: 1,
  unknown: 2,
  nonfunctional: 3,
};

export function rankShelters(
  userCoordinate: Coordinate,
  shelters: readonly Shelter[],
  options: ShelterRankingOptions = {},
): ShelterRanking {
  if (!isCoordinate(userCoordinate) || shelters.length === 0) {
    return { primary: null, nearest: [] };
  }

  const limit = normalizeLimit(options.limit);
  // The UI needs four candidates; keep a small ordered buffer instead of sorting
  // the nation. Large/unlimited requests retain the O(n log n) full-sort path.
  const boundedLimit = limit !== null && limit <= 16 ? limit : null;
  const nearest: RankedShelter[] = [];
  let primary: RankedShelter | null = null;
  for (const shelter of shelters) {
    if (!hasValidShelterCoordinate(shelter)) continue;
    const candidate = { shelter, distanceMeters: getDistanceMeters(userCoordinate, shelter) };
    if (primary === null || compareByStatusPriority(candidate, primary) < 0) primary = candidate;
    if (boundedLimit === null) {
      nearest.push(candidate);
    } else if (boundedLimit > 0) {
      if (nearest.length === boundedLimit && compareByDistance(candidate, nearest[nearest.length - 1]) >= 0) continue;
      const index = nearest.findIndex((existing) => compareByDistance(candidate, existing) < 0);
      nearest.splice(index === -1 ? nearest.length : index, 0, candidate);
      if (nearest.length > boundedLimit) nearest.pop();
    }
  }
  if (boundedLimit === null) nearest.sort(compareByDistance);

  return {
    primary,
    nearest: boundedLimit !== null || limit === null ? nearest : nearest.slice(0, limit),
  };
}

function hasValidShelterCoordinate(shelter: Shelter): boolean {
  return isCoordinate(shelter);
}

function compareByDistance(left: RankedShelter, right: RankedShelter): number {
  return left.distanceMeters - right.distanceMeters || compareStableShelterFields(left.shelter, right.shelter);
}

function compareByStatusPriority(left: RankedShelter, right: RankedShelter): number {
  return (
    STATUS_PRIORITY[left.shelter.status] - STATUS_PRIORITY[right.shelter.status] ||
    left.distanceMeters - right.distanceMeters ||
    compareStableShelterFields(left.shelter, right.shelter)
  );
}

function compareStableShelterFields(left: Shelter, right: Shelter): number {
  return (
    left.county.localeCompare(right.county, "ro") ||
    left.town.localeCompare(right.town, "ro") ||
    left.address.localeCompare(right.address, "ro") ||
    left.id.localeCompare(right.id, "ro")
  );
}

function normalizeLimit(limit: number | undefined): number | null {
  if (limit === undefined) {
    return null;
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    return 0;
  }

  return Math.floor(limit);
}
