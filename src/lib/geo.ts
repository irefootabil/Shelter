export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type CoordinateBounds = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

export type CardinalDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export const EARTH_RADIUS_METERS = 6_371_000;

export const ROMANIA_COORDINATE_BOUNDS: CoordinateBounds = {
  minLatitude: 43,
  maxLatitude: 49,
  minLongitude: 20,
  maxLongitude: 30,
};

const CARDINAL_DIRECTIONS: CardinalDirection[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function isFiniteLatitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isFiniteLongitude(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isCoordinate(value: unknown): value is Coordinate {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const coordinate = value as Partial<Coordinate>;

  return isFiniteLatitude(coordinate.latitude) && isFiniteLongitude(coordinate.longitude);
}

export function isCoordinateInBounds(coordinate: Coordinate, bounds: CoordinateBounds): boolean {
  return (
    isCoordinate(coordinate) &&
    coordinate.latitude >= bounds.minLatitude &&
    coordinate.latitude <= bounds.maxLatitude &&
    coordinate.longitude >= bounds.minLongitude &&
    coordinate.longitude <= bounds.maxLongitude
  );
}

export function isRomaniaCoordinate(coordinate: Coordinate): boolean {
  return isCoordinateInBounds(coordinate, ROMANIA_COORDINATE_BOUNDS);
}

export function getDistanceMeters(from: Coordinate, to: Coordinate): number {
  assertCoordinate(from, "from");
  assertCoordinate(to, "to");

  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_METERS * angularDistance;
}

export function getBearingDegrees(from: Coordinate, to: Coordinate): number {
  assertCoordinate(from, "from");
  assertCoordinate(to, "to");

  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);

  const x = Math.sin(longitudeDelta) * Math.cos(toLatitude);
  const y =
    Math.cos(fromLatitude) * Math.sin(toLatitude) -
    Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(longitudeDelta);

  return normalizeDegrees(toDegrees(Math.atan2(x, y)));
}

export function getCardinalDirection(bearingDegrees: number): CardinalDirection {
  if (!Number.isFinite(bearingDegrees)) {
    throw new RangeError("bearingDegrees must be finite.");
  }

  const directionIndex = Math.floor((normalizeDegrees(bearingDegrees) + 22.5) / 45) % CARDINAL_DIRECTIONS.length;

  return CARDINAL_DIRECTIONS[directionIndex];
}

function assertCoordinate(coordinate: Coordinate, label: string): void {
  if (!isCoordinate(coordinate)) {
    throw new RangeError(`${label} must be a valid coordinate.`);
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}
