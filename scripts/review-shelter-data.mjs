import { createHash } from "node:crypto";
import { readFile, writeFile, mkdtemp, rm, realpath, mkdir, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rawPath = resolve(root, "src/data/allShelters.raw.json");
const fields = ["county", "town", "address", "latitude", "longitude", "status", "type", "capacity"];
const text = (value) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function inspectDataset(raw, { normalizeShelterGroups, estimateTownLocation }) {
  const discarded = [];
  const warnings = [];
  const errors = [];
  const groups = [];
  if (!Array.isArray(raw)) return { groups, shelters: [], discarded, warnings, errors: ["Root must be an array"] };
  raw.forEach((group, groupIndex) => {
    if (!object(group) || !Array.isArray(group.items)) {
      errors.push(`Group ${groupIndex}: expected an object with an items array`);
      return;
    }
    const normalizedGroup = normalizeShelterGroups([{ ...group, items: [] }])[0];
    if (!normalizedGroup) {
      errors.push(`Group ${groupIndex}: invalid county identity/name/center`);
      group.items.forEach((_, itemIndex) => discarded.push({ groupIndex, itemIndex, reason: "invalid-group" }));
      return;
    }
    const shelters = [];
    group.items.forEach((record, itemIndex) => {
      const location = { groupIndex, itemIndex };
      if (!object(record)) {
        discarded.push({ ...location, reason: "invalid-record" });
        return;
      }
      const shelter = normalizeShelterGroups([{ ...group, items: [record] }])[0]?.shelters[0];
      if (!shelter) {
        discarded.push({ ...location, sourceId: text(record.id),
          reason: "missing-identity-address-or-invalid-coordinate",
          missingFields: ["id", "town", "address"].filter((field) => !text(record[field])),
          rawCoordinate: { latitude: record.lat ?? null, longitude: record.lon ?? null } });
        return;
      }
      if (!["functional", "partial", "nonfunctional", "unknown"].includes(shelter.status)
        || !["public", "private", "unknown"].includes(shelter.type)) {
        errors.push(`Record ${groupIndex}/${itemIndex}: normalization produced an invalid status/access label`);
        discarded.push({ ...location, sourceId: text(record.id), reason: "invalid-normalized-label" });
        return;
      }
      shelters.push(shelter);
      if (shelter.county !== normalizedGroup.id) warnings.push({ id: shelter.id, reason: "county-group-mismatch" });
      if (shelter.status === "unknown") warnings.push({ id: shelter.id, reason: "unknown-status", rawLabel: text(record.status) });
      if (shelter.type === "unknown") warnings.push({ id: shelter.id, reason: "unknown-access", rawLabel: text(record.type) });
      if (shelter.capacity === null) warnings.push({ id: shelter.id, reason: "invalid-capacity" });
    });
    groups.push({ ...normalizedGroup, shelters });
  });
  const shelters = groups.flatMap((group) => group.shelters);
  for (const [label, values] of [["county", groups], ["shelter", shelters]]) {
    const seen = new Set();
    for (const value of values) {
      if (seen.has(value.id)) errors.push(`Duplicate ${label} identity: ${value.id}`);
      seen.add(value.id);
    }
  }
  const towns = new Map();
  for (const shelter of shelters) {
    const key = JSON.stringify([shelter.county, shelter.town]);
    if (!towns.has(key)) towns.set(key, []);
    towns.get(key).push(shelter);
  }
  for (const local of towns.values()) {
    for (const id of estimateTownLocation(local)?.suspectIds ?? []) {
      warnings.push({ id, reason: "coordinate-consistency-outlier", heuristic: "over-10km-from-local-median-not-authoritative" });
    }
  }
  return { groups, shelters, discarded, warnings, errors };
}

export function compareDatasets(baseline, candidate, helpers) {
  const before = inspectDataset(baseline, helpers);
  const after = inspectDataset(candidate, helpers);
  const summarize = (result) => ({ counties: result.groups.length, accepted: result.shelters.length,
    discarded: result.discarded, warnings: result.warnings, errors: result.errors });
  // Ambiguous identities must not be silently collapsed into a misleading diff.
  if (before.errors.length || after.errors.length) {
    return { status: "blocked", baseline: summarize(before), candidate: summarize(after), changes: null };
  }
  const oldRecords = new Map(before.shelters.map((record) => [record.id, record]));
  const newRecords = new Map(after.shelters.map((record) => [record.id, record]));
  const added = after.shelters.filter((record) => !oldRecords.has(record.id));
  const removed = before.shelters.filter((record) => !newRecords.has(record.id));
  const changed = after.shelters.flatMap((record) => {
    const previous = oldRecords.get(record.id);
    if (!previous) return [];
    const differences = fields.filter((field) => previous[field] !== record[field])
      .map((field) => ({ field, before: previous[field], after: record[field] }));
    return differences.length ? [{ id: record.id, differences }] : [];
  });
  const oldGroups = new Map(before.groups.map((group) => [group.id, group]));
  const countyChanges = after.groups.flatMap((group) => {
    const previous = oldGroups.get(group.id);
    if (!previous) return [{ id: group.id, kind: "added" }];
    return previous.name !== group.name || JSON.stringify(previous.center) !== JSON.stringify(group.center)
      ? [{ id: group.id, kind: "changed", before: { name: previous.name, center: previous.center },
        after: { name: group.name, center: group.center } }] : [];
  });
  for (const group of before.groups) {
    if (!after.groups.some((entry) => entry.id === group.id)) countyChanges.push({ id: group.id, kind: "removed" });
  }
  const sort = (records) => records.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return { status: "review-required", baseline: summarize(before), candidate: summarize(after),
    changes: { added: sort(added), removed: sort(removed), changed: sort(changed), counties: sort(countyChanges) } };
}

export const gitBlobSha = (bytes) => createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function validateProvenance(provenance, bytes) {
  if (!object(provenance) || provenance.repository !== "https://github.com/mhlnu/adaposturi"
    || provenance.path !== "data/allShelters.json"
    || !/^[a-f0-9]{40}$/.test(provenance.commit ?? "")
    || !/^[a-f0-9]{40}$/.test(provenance.blobSha ?? "")) {
    throw new Error("Candidate provenance needs the reference repository/path and full commit/blob SHA");
  }
  const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(provenance.downloadedAt)
    || !(provenance.sourcePublishedAt === null || validDate(provenance.sourcePublishedAt))) {
    throw new Error("Use YYYY-MM-DD download/source dates; unknown sourcePublishedAt must be null");
  }
  if (gitBlobSha(bytes) !== provenance.blobSha) throw new Error("Candidate bytes do not match the pinned Git blob SHA");
  return { repository: provenance.repository, path: provenance.path, commit: provenance.commit,
    blobSha: provenance.blobSha, downloadedAt: provenance.downloadedAt,
    sourcePublishedAt: provenance.sourcePublishedAt, verification: "blob-bytes-verified-commit-link-needs-review" };
}

async function loadProjectHelpers() {
  // Compile trusted project modules with the existing compiler, not a second normalizer.
  const temporaryRoot = resolve(tmpdir());
  const output = await mkdtemp(resolve(temporaryRoot, "shelter-data-review-"));
  try {
    // Transpile only the trusted helper graph; parsing the large JSON as TypeScript
    // would duplicate the build's expensive type work. Node loads the copied JSON.
    for (const module of ["data/shelterAdapter", "data/sourceMetadata", "lib/manualShelters", "lib/geo"]) {
      const path = resolve(root, "src", `${module}.ts`);
      const result = ts.transpileModule(await readFile(path, "utf8"), {
        fileName: path, reportDiagnostics: true,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
      });
      if (result.diagnostics?.some((entry) => entry.category === ts.DiagnosticCategory.Error)) {
        throw new Error(ts.formatDiagnostics(result.diagnostics, {
          getCurrentDirectory: () => root, getCanonicalFileName: (path) => path, getNewLine: () => "\n",
        }));
      }
      const destination = resolve(output, `${module}.js`);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, result.outputText);
    }
    await copyFile(rawPath, resolve(output, "data/allShelters.raw.json"));
    const require = createRequire(import.meta.url);
    return { ...require(resolve(output, "data/shelterAdapter.js")),
      ...require(resolve(output, "lib/manualShelters.js")),
      ...require(resolve(output, "data/sourceMetadata.js")) };
  } finally {
    if (dirname(output) !== temporaryRoot || !relative(temporaryRoot, output).startsWith("shelter-data-review-")) {
      throw new Error("Unexpected temporary compiler directory; cleanup refused");
    }
    await rm(output, { recursive: true, force: true });
  }
}

export async function writePrivateReport(path, report) {
  const privateRoot = await realpath(resolve(root, "docs"));
  const target = resolve(path);
  const parent = await realpath(dirname(target));
  const within = relative(privateRoot, parent);
  if (isAbsolute(within) || within === ".." || within.startsWith("..\\") || within.startsWith("../")) {
    throw new Error("Reports must stay in the local-only docs directory");
  }
  // Exclusive creation avoids overwriting data or following an existing file symlink.
  await writeFile(target, `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
}

export async function main(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const name = args[index];
    if (!["--candidate", "--provenance", "--output"].includes(name) || !args[index + 1]
      || args[index + 1].startsWith("--") || options[name]) throw new Error("Use --candidate FILE --provenance FILE [--output docs/qa/REPORT.json], or no candidate for a baseline audit");
    options[name] = args[index + 1];
  }
  if (Boolean(options["--candidate"]) !== Boolean(options["--provenance"])) throw new Error("Candidate and provenance must be supplied together");
  const helpers = await loadProjectHelpers();
  const baselineBytes = await readFile(rawPath);
  const candidateBytes = options["--candidate"] ? await readFile(resolve(options["--candidate"])) : baselineBytes;
  const parse = (bytes) => JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
  const provenance = options["--provenance"]
    ? validateProvenance(parse(await readFile(resolve(options["--provenance"]))), candidateBytes) : null;
  const report = { formatVersion: 1, mode: provenance ? "candidate-review" : "baseline-audit",
    baselineSource: helpers.shelterDataSource, baselineSha256: sha256(baselineBytes),
    candidateSha256: sha256(candidateBytes), candidateSource: provenance,
    ...compareDatasets(parse(baselineBytes), parse(candidateBytes), helpers) };
  if (options["--output"]) await writePrivateReport(options["--output"], report);
  else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status === "blocked") process.exitCode = 1;
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
}
