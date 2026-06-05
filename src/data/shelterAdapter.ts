import rawShelterGroups from "./allShelters.raw.json";
import type { CountyShelterGroup, Shelter, ShelterStatus, ShelterType } from "./shelterTypes";

type RawShelterGroup = {
  id?: unknown;
  name?: unknown;
  center?: {
    lat?: unknown;
    lon?: unknown;
  };
  items?: RawShelterRecord[];
};

type RawShelterRecord = {
  id?: unknown;
  county?: unknown;
  town?: unknown;
  address?: unknown;
  type?: unknown;
  lat?: unknown;
  lon?: unknown;
  capacity?: unknown;
  status?: unknown;
};

const MIN_ROMANIA_LATITUDE = 43;
const MAX_ROMANIA_LATITUDE = 49;
const MIN_ROMANIA_LONGITUDE = 20;
const MAX_ROMANIA_LONGITUDE = 30;

export const shelterStatusByRawLabel: Record<string, ShelterStatus> = {
  green: "functional",
  orange: "partial",
  red: "nonfunctional",
  "0": "unknown",
};

export const shelterTypeByRawLabel: Record<string, ShelterType> = {
  public: "public",
  privat: "private",
};

export function normalizeShelterGroups(rawGroups: unknown): CountyShelterGroup[] {
  if (!Array.isArray(rawGroups)) {
    return [];
  }

  return rawGroups.flatMap((rawGroup) => normalizeShelterGroup(rawGroup));
}

export function normalizeShelters(rawGroups: unknown): Shelter[] {
  return normalizeShelterGroups(rawGroups).flatMap((group) => group.shelters);
}

function normalizeShelterGroup(rawGroup: unknown): CountyShelterGroup[] {
  if (!isRawGroup(rawGroup)) {
    return [];
  }

  const countyCode = normalizeText(rawGroup.id);
  const countyName = normalizeText(rawGroup.name);
  const centerLatitude = toNumber(rawGroup.center?.lat);
  const centerLongitude = toNumber(rawGroup.center?.lon);

  if (!countyCode || !countyName || !isRomaniaCoordinate(centerLatitude, centerLongitude)) {
    return [];
  }

  const shelters = rawGroup.items
    .map((rawShelter) => normalizeShelter(rawShelter, countyCode))
    .filter((shelter): shelter is Shelter => shelter !== null);

  return [
    {
      id: countyCode,
      name: countyName,
      center: {
        latitude: centerLatitude,
        longitude: centerLongitude,
      },
      shelters,
    },
  ];
}

function normalizeShelter(rawShelter: RawShelterRecord, fallbackCounty: string): Shelter | null {
  const rawId = normalizeText(rawShelter.id);
  const county = normalizeText(rawShelter.county) || fallbackCounty;
  const town = normalizeText(rawShelter.town);
  const address = normalizeText(rawShelter.address);
  const latitude = toNumber(rawShelter.lat);
  const longitude = toNumber(rawShelter.lon);

  if (!rawId || !county || !town || !address || !isRomaniaCoordinate(latitude, longitude)) {
    return null;
  }

  return {
    id: `${county}-${rawId}`,
    county,
    town,
    address,
    type: normalizeShelterType(rawShelter.type),
    latitude,
    longitude,
    capacity: normalizeCapacity(rawShelter.capacity),
    status: normalizeShelterStatus(rawShelter.status),
  };
}

function isRawGroup(value: unknown): value is RawShelterGroup & { items: RawShelterRecord[] } {
  return typeof value === "object" && value !== null && Array.isArray((value as RawShelterGroup).items);
}

function normalizeShelterStatus(value: unknown): ShelterStatus {
  const label = normalizeText(value).toLowerCase();

  return shelterStatusByRawLabel[label] ?? "unknown";
}

function normalizeShelterType(value: unknown): ShelterType {
  const label = normalizeText(value).toLowerCase();

  return shelterTypeByRawLabel[label] ?? "unknown";
}

function normalizeCapacity(value: unknown): number | null {
  const capacity = toNumber(value);

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return null;
  }

  return capacity;
}

function normalizeText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  return "";
}

function toNumber(value: unknown): number {
  if (typeof value === "number" || typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  return Number.NaN;
}

function isRomaniaCoordinate(latitude: number, longitude: number): boolean {
  return (
    latitude >= MIN_ROMANIA_LATITUDE &&
    latitude <= MAX_ROMANIA_LATITUDE &&
    longitude >= MIN_ROMANIA_LONGITUDE &&
    longitude <= MAX_ROMANIA_LONGITUDE
  );
}

export const shelterCountyGroups = normalizeShelterGroups(rawShelterGroups);
export const shelters = shelterCountyGroups.flatMap((group) => group.shelters);
