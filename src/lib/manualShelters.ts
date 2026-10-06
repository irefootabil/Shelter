import type { Shelter } from "../data";
import { getDistanceMeters, isCoordinate, type Coordinate } from "./geo";

const COORDINATE_OUTLIER_METERS = 10_000;

export function estimateTownLocation(shelters: readonly Shelter[]) {
  const valid = shelters.filter(isCoordinate);
  if (valid.length === 0) return null;
  const coordinate: Coordinate = {
    latitude: median(valid.map((shelter) => shelter.latitude)),
    longitude: median(valid.map((shelter) => shelter.longitude)),
  };
  // This is a consistency heuristic, not a verified town boundary or geocoder.
  const suspectIds = new Set(valid.length < 3 ? [] : valid
    .filter((shelter) => getDistanceMeters(coordinate, shelter) > COORDINATE_OUTLIER_METERS)
    .map((shelter) => shelter.id));
  return { coordinate, suspectIds };
}

export function listManualShelters(
  shelters: readonly Shelter[],
  county: string,
  town: string,
) {
  const local = shelters.filter((shelter) => shelter.county === county && shelter.town === town);
  return local.sort((left, right) => left.address.localeCompare(right.address, "ro") || left.id.localeCompare(right.id));
}

function median(values: number[]): number {
  values.sort((left, right) => left - right);
  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[middle - 1] + values[middle]) / 2 : values[middle];
}
