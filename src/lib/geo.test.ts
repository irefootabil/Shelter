import { describe, expect, it } from "vitest";
import {
  getBearingDegrees,
  getCardinalDirection,
  getDistanceMeters,
  isCoordinate,
  isCoordinateInBounds,
  isFiniteLatitude,
  isFiniteLongitude,
  isRomaniaCoordinate,
  ROMANIA_COORDINATE_BOUNDS,
  type Coordinate,
} from "./geo";

const bucharest: Coordinate = { latitude: 44.4268, longitude: 26.1025 };
const clujNapoca: Coordinate = { latitude: 46.7712, longitude: 23.6236 };
const constanta: Coordinate = { latitude: 44.1598, longitude: 28.6348 };

describe("geo", () => {
  it("calculates Haversine distance in meters for representative Romania coordinates", () => {
    expect(getDistanceMeters(bucharest, clujNapoca)).toBeCloseTo(324_200, -2);
    expect(getDistanceMeters(bucharest, constanta)).toBeCloseTo(203_700, -2);
    expect(getDistanceMeters(bucharest, bucharest)).toBe(0);
  });

  it("calculates initial bearing in degrees from north", () => {
    expect(getBearingDegrees(bucharest, clujNapoca)).toBeCloseTo(324, 0);
    expect(getBearingDegrees(bucharest, constanta)).toBeCloseTo(97, 0);
    expect(getBearingDegrees(bucharest, bucharest)).toBe(0);
  });

  it("maps bearings to stable eight-way cardinal direction codes", () => {
    expect(getCardinalDirection(0)).toBe("N");
    expect(getCardinalDirection(22.4)).toBe("N");
    expect(getCardinalDirection(22.5)).toBe("NE");
    expect(getCardinalDirection(90)).toBe("E");
    expect(getCardinalDirection(181)).toBe("S");
    expect(getCardinalDirection(315)).toBe("NW");
    expect(getCardinalDirection(359.9)).toBe("N");
    expect(getCardinalDirection(-45)).toBe("NW");
  });

  it("validates finite latitude and longitude ranges", () => {
    expect(isFiniteLatitude(44.4268)).toBe(true);
    expect(isFiniteLatitude(-90)).toBe(true);
    expect(isFiniteLatitude(90)).toBe(true);
    expect(isFiniteLatitude(90.1)).toBe(false);
    expect(isFiniteLatitude(Number.NaN)).toBe(false);
    expect(isFiniteLatitude("44.4268")).toBe(false);

    expect(isFiniteLongitude(26.1025)).toBe(true);
    expect(isFiniteLongitude(-180)).toBe(true);
    expect(isFiniteLongitude(180)).toBe(true);
    expect(isFiniteLongitude(180.1)).toBe(false);
    expect(isFiniteLongitude(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFiniteLongitude("26.1025")).toBe(false);
  });

  it("validates coordinate objects and Romania bounds", () => {
    expect(isCoordinate(bucharest)).toBe(true);
    expect(isCoordinate({ latitude: 91, longitude: 26.1025 })).toBe(false);
    expect(isCoordinate(null)).toBe(false);

    expect(isCoordinateInBounds(bucharest, ROMANIA_COORDINATE_BOUNDS)).toBe(true);
    expect(isRomaniaCoordinate(bucharest)).toBe(true);
    expect(isRomaniaCoordinate({ latitude: 51.5, longitude: -0.12 })).toBe(false);
    expect(isRomaniaCoordinate({ latitude: 44.4268, longitude: Number.NaN })).toBe(false);
  });

  it("throws for invalid inputs to math helpers", () => {
    expect(() => getDistanceMeters({ latitude: 91, longitude: 26.1025 }, bucharest)).toThrow(RangeError);
    expect(() => getBearingDegrees(bucharest, { latitude: 44.4268, longitude: 181 })).toThrow(RangeError);
    expect(() => getCardinalDirection(Number.NaN)).toThrow(RangeError);
  });
});
