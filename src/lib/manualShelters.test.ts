import { describe, expect, it } from "vitest";
import { shelters } from "../data";
import { estimateTownLocation, listManualShelters } from "./manualShelters";

describe("manual shelter browsing", () => {
  it("keeps every Turnu record local without distances or recommendations", () => {
    const records = listManualShelters(shelters, "TR", "Turnu Măgurele");
    expect(records).toHaveLength(14);
    expect(records.every(record => record.county === "TR" && record.town === "Turnu Măgurele")).toBe(true);
    expect(records.some(record => record.status === "partial")).toBe(true);
    expect(records.every(record => !("distanceMeters" in record))).toBe(true);
    expect(records.map(record => record.address)).toEqual(records.map(record => record.address).sort((a, b) => a.localeCompare(b, "ro")));
  });

  it("retains Huedin addresses and flags its coordinate outlier", () => {
    const records = listManualShelters(shelters, "CJ", "Huedin");
    const estimate = estimateTownLocation(records)!;
    const suspect = records.find(record => record.address === "Str. Republicii nr. 39-42")!;
    expect(records).toHaveLength(4);
    expect(estimate.suspectIds.has(suspect.id)).toBe(true);
    expect(estimate.suspectIds.size).toBe(1);
  });

  it("separates same-named towns across counties even with invalid coordinates", () => {
    const local = { ...shelters[0], id: "local", county: "CJ", town: "Example", latitude: NaN };
    const foreign = { ...local, id: "foreign", county: "TR" };
    expect(listManualShelters([foreign, local], "CJ", "Example")).toEqual([local]);
  });

  it("handles empty and sparse data without mutating source order", () => {
    expect(estimateTownLocation([])).toBeNull();
    expect(estimateTownLocation([{ ...shelters[0], latitude: NaN }])).toBeNull();
    const local = [{ ...shelters[0], address: "Z" }, { ...shelters[0], id: "second", address: "A" }];
    const original = structuredClone(local);
    expect(estimateTownLocation(local)!.suspectIds.size).toBe(0);
    expect(listManualShelters(local, local[0].county, local[0].town).map(record => record.address)).toEqual(["A", "Z"]);
    expect(listManualShelters(local, "missing", "missing")).toEqual([]);
    expect(local).toEqual(original);
  });
});
