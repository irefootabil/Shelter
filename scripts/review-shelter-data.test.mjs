// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile, unlink, mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import { tmpdir } from "node:os";
import { normalizeShelterGroups, shelters } from "../src/data/shelterAdapter.ts";
import { estimateTownLocation } from "../src/lib/manualShelters.ts";
import raw from "../src/data/allShelters.raw.json";
import { compareDatasets, inspectDataset, gitBlobSha, validateProvenance, writePrivateReport, main } from "./review-shelter-data.mjs";

const helpers = { normalizeShelterGroups, estimateTownLocation };
const record = { id: 1, county: "AB", town: "Town", address: "Address", lat: 46, lon: 24,
  capacity: 100, status: "green", type: "public" };
const group = { id: "AB", name: "Alba", center: { lat: 46, lon: 24 }, items: [record] };
const source = (bytes) => ({ repository: "https://github.com/mhlnu/adaposturi", path: "data/allShelters.json",
  commit: "a".repeat(40), blobSha: gitBlobSha(bytes), downloadedAt: "2026-10-07", sourcePublishedAt: null });

beforeAll(async () => {
  // Private docs are deliberately absent from a clean GitHub/CI checkout.
  await mkdir(resolve("docs/qa"), { recursive: true });
});

describe("shelter data review", () => {
  it("matches the actual bundled adapter and reports no differences against itself", () => {
    const audit = inspectDataset(raw, helpers);
    expect(audit.shelters).toEqual(shelters);
    expect(audit.groups).toHaveLength(42);
    const report = compareDatasets(raw, raw, helpers);
    expect(report.changes).toEqual({ added: [], removed: [], changed: [], counties: [] });
    expect(report.status).toBe("review-required");
  });

  it("reports additions/removals and status/access/capacity/address/coordinate changes", () => {
    const before = [{ ...group, items: [record, { ...record, id: 2 }] }];
    const after = [{ ...group, items: [{ ...record, address: "Updated", status: "red", type: "privat",
      capacity: 0, lat: 47 }, { ...record, id: 3 }] }];
    const report = compareDatasets(before, after, helpers);
    expect(report.changes.added.map((entry) => entry.id)).toEqual(["AB-3"]);
    expect(report.changes.removed.map((entry) => entry.id)).toEqual(["AB-2"]);
    expect(report.changes.changed[0].differences).toEqual([
      { field: "address", before: "Address", after: "Updated" },
      { field: "latitude", before: 46, after: 47 },
      { field: "status", before: "functional", after: "nonfunctional" },
      { field: "type", before: "public", after: "private" },
      { field: "capacity", before: 100, after: null },
    ]);
    expect(report.candidate.warnings).toContainEqual({ id: "AB-1", reason: "invalid-capacity" });
  });

  it("reports discarded malformed/missing/out-of-bounds records without crashing", () => {
    const audit = inspectDataset([{ ...group, items: [null, { ...record, id: 2, address: "" },
      { ...record, id: 3, lat: 90 }] }], helpers);
    expect(audit.shelters).toEqual([]);
    expect(audit.discarded).toHaveLength(3);
    expect(audit.discarded[1].missingFields).toEqual(["address"]);
    expect(audit.discarded[2].rawCoordinate.latitude).toBe(90);
  });

  it("blocks malformed groups and duplicate identities rather than silently diffing", () => {
    for (const candidate of [null, [{}], [{ ...group, center: { lat: 90, lon: 24 } }],
      [group, group], [{ ...group, items: [record, record] }]]) {
      const report = compareDatasets([group], candidate, helpers);
      expect(report.status).toBe("blocked");
      expect(report.changes).toBeNull();
      expect(report.candidate.errors.length).toBeGreaterThan(0);
    }
  });

  it("uses the app coordinate heuristic and flags uncertain labels/county grouping", () => {
    const audit = inspectDataset([{ ...group, items: [record, { ...record, id: 2 },
      { ...record, id: 3, lon: 27, status: "new-status", type: "new-access" },
      { ...record, id: 4, county: "CJ" }] }], helpers);
    expect(audit.warnings).toContainEqual(expect.objectContaining({ id: "AB-3", reason: "coordinate-consistency-outlier" }));
    expect(audit.warnings).toContainEqual({ id: "AB-3", reason: "unknown-status", rawLabel: "new-status" });
    expect(audit.warnings).toContainEqual({ id: "AB-3", reason: "unknown-access", rawLabel: "new-access" });
    expect(audit.warnings).toContainEqual({ id: "CJ-4", reason: "county-group-mismatch" });
  });

  it("blocks labels that resolve to inherited adapter-map properties", () => {
    for (const overrides of [{ status: "constructor" }, { status: "__proto__" }, { type: "constructor" }]) {
      const report = compareDatasets([group], [{ ...group, items: [{ ...record, ...overrides }] }], helpers);
      expect(report.status).toBe("blocked");
      expect(report.changes).toBeNull();
      expect(report.candidate.discarded[0].reason).toBe("invalid-normalized-label");
    }
  });

  it("reports county name/center changes and handles fallback county/string values identically", () => {
    const candidate = [{ ...group, name: "Renamed", center: { lat: 46.1, lon: 24 },
      items: [{ ...record, county: "", id: " 1 ", lat: "46", capacity: "100", status: " GREEN " }] }];
    const report = compareDatasets([group], candidate, helpers);
    expect(report.changes.changed).toEqual([]);
    expect(report.changes.counties).toEqual([expect.objectContaining({ id: "AB", kind: "changed" })]);
  });

  it("verifies pinned bytes but never claims the supplied commit/blob linkage is remotely verified", () => {
    const bytes = Buffer.from("[]");
    const provenance = source(bytes);
    expect(validateProvenance(provenance, bytes)).toEqual(expect.objectContaining({
      sourcePublishedAt: null, verification: "blob-bytes-verified-commit-link-needs-review" }));
    expect(() => validateProvenance(provenance, Buffer.from("[ ]"))).toThrow("blob SHA");
    for (const override of [{ commit: "main" }, { downloadedAt: "2026-02-30" },
      { sourcePublishedAt: undefined }, { repository: "https://example.com" }]) {
      expect(() => validateProvenance({ ...provenance, ...override }, bytes)).toThrow();
    }
  });

  it("rejects CLI typos or unpaired inputs before compiling or reading candidate files", async () => {
    for (const args of [["--candidate", "x"], ["--wat", "x"], ["--output"],
      ["--candidate", "x", "--candidate", "y"]]) await expect(main(args)).rejects.toThrow();
  });

  it("only creates private reports and refuses to overwrite existing files", async () => {
    const path = resolve("docs/qa", `data-review-test-${randomUUID()}.json`);
    const report = { status: "review-required" };
    await expect(writePrivateReport(resolve("package.json"), report)).rejects.toThrow("local-only");
    try {
      await writePrivateReport(path, report);
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual(report);
      await expect(writePrivateReport(path, report)).rejects.toThrow();
    } finally {
      await unlink(path);
    }
  });

  it("runs a pinned synthetic candidate through the compiler-backed CLI without replacing data", async () => {
    const temporaryRoot = resolve(tmpdir());
    const directory = await mkdtemp(resolve(temporaryRoot, "shelter-review-test-"));
    const output = resolve("docs/qa", `data-review-cli-${randomUUID()}.json`);
    const original = await readFile(resolve("src/data/allShelters.raw.json"));
    try {
      const bytes = Buffer.from(JSON.stringify([group]));
      const candidate = resolve(directory, "candidate.json");
      const provenance = resolve(directory, "provenance.json");
      await writeFile(candidate, bytes);
      await writeFile(provenance, JSON.stringify(source(bytes)));
      const report = await main(["--candidate", candidate, "--provenance", provenance, "--output", output]);
      expect(report.mode).toBe("candidate-review");
      expect(report.baseline.accepted).toBe(5747);
      expect(report.candidate.accepted).toBe(1);
      expect(report.candidateSource.sourcePublishedAt).toBeNull();
      expect(report.status).toBe("review-required");
      expect(JSON.parse(await readFile(output, "utf8"))).toEqual(report);
      expect(await readFile(resolve("src/data/allShelters.raw.json"))).toEqual(original);
    } finally {
      await unlink(output).catch((error) => { if (error.code !== "ENOENT") throw error; });
      if (dirname(directory) !== temporaryRoot || !relative(temporaryRoot, directory).startsWith("shelter-review-test-")) {
        throw new Error("Unexpected test directory; cleanup refused");
      }
      await rm(directory, { recursive: true, force: true });
    }
  }, 30000);
});
