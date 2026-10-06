import { describe, expect, it } from "vitest";
import { shelters } from "../data";
import { estimateTownLocation, rankManualShelters } from "./manualShelters";

function selectTown(county: string, town: string) {
  const local = shelters.filter((shelter) => shelter.county === county && shelter.town === town);
  const estimate = estimateTownLocation(local)!;
  return { local, estimate, results: rankManualShelters(estimate.coordinate, shelters, county, town, estimate.suspectIds) };
}

describe("manual shelter search", () => {
  it("keeps Turnu Magurele records local without promoting Giurgiu over local partial records", () => {
    const { local, results } = selectTown("TR", "Turnu Măgurele");
    expect(results.primary).toBeNull();
    expect(results.nearest).toHaveLength(local.length);
    expect(results.nearest.every(({ shelter }) => shelter.county === "TR" && shelter.town === "Turnu Măgurele")).toBe(true);
    expect(results.nearest.some(({ shelter }) => shelter.status === "partial")).toBe(true);
    expect(results.alternative?.shelter.town).toBe("Giurgiu");
    expect(results.alternative?.distanceMeters).toBeGreaterThan(80_000);
  });

  it("flags the Huedin outlier without hiding its address or letting it shift the origin", () => {
    const { local, estimate, results } = selectTown("CJ", "Huedin");
    expect(estimate.coordinate.longitude).toBeLessThan(23.04);
    const suspect = local.find((shelter) => shelter.address === "Str. Republicii nr. 39-42")!;
    expect(estimate.suspectIds.has(suspect.id)).toBe(true);
    expect(estimate.suspectIds.size).toBe(1);
    expect(results.primary).toBeNull();
    expect(results.nearest.map(({ shelter }) => shelter.id)).toContain(suspect.id);
    expect(results.nearest).toHaveLength(4);
    expect(results.alternative?.shelter.town).not.toBe("Huedin");
  });

  it("chooses a functional local primary and keeps same-named towns in other counties separate", () => {
    const base = shelters[0];
    const local = { ...base, id: "local", county: "CJ", town: "Example", status: "functional" as const };
    const foreign = { ...local, id: "foreign", county: "TR" };
    const result = rankManualShelters(local, [foreign, local], "CJ", "Example", new Set());
    expect(result.primary?.shelter.id).toBe("local");
    expect(result.nearest.map(({ shelter }) => shelter.id)).toEqual(["local"]);
    expect(result.alternative?.shelter.id).toBe("foreign");
  });

  it("handles sparse/invalid data and does not mutate inputs or invent a usable alternative", () => {
    expect(estimateTownLocation([])).toBeNull();
    expect(estimateTownLocation([{ ...shelters[0], latitude: NaN }])).toBeNull();
    const local = [{ ...shelters[0], status: "nonfunctional" as const }];
    const original = structuredClone(local);
    const estimate = estimateTownLocation(local)!;
    expect(estimate.coordinate).toEqual({ latitude: local[0].latitude, longitude: local[0].longitude });
    expect(estimate.suspectIds.size).toBe(0);
    const result = rankManualShelters(estimate.coordinate, local, local[0].county, local[0].town, estimate.suspectIds);
    expect(result.primary).toBeNull();
    expect(result.alternative).toBeNull();
    expect(local).toEqual(original);
  });
});
