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

  const rankedShelters = shelters
    .filter(hasValidShelterCoordinate)
    .map((shelter) => ({
      shelter,
      distanceMeters: getDistanceMeters(userCoordinate, shelter),
    }));

  const nearest = [...rankedShelters].sort(compareByDistance);
  const primary = [...rankedShelters].sort(compareByStatusPriority)[0] ?? null;
  const limit = normalizeLimit(options.limit);

  return {
    primary,
    nearest: limit === null ? nearest : nearest.slice(0, limit),
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
