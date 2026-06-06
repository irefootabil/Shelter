import { useMemo, useState } from "react";
import { appCopy, emergencyContent } from "./content";
import { shelterCountyGroups, shelters, shelterDataSource, type Shelter, type ShelterStatus } from "./data";
import { useCompass, type CompassCalibrationState, type CompassStatus } from "./hooks/useCompass";
import { useLocation, type LocationSnapshot, type LocationStatus } from "./hooks/useLocation";
import { getBearingDegrees, getCardinalDirection, type CardinalDirection } from "./lib/geo";
import { rankShelters, type RankedShelter } from "./lib/ranking";

const statusItems = [
  {
    label: "Offline",
    text: appCopy.status.offlineReady,
  },
  {
    label: "Manual",
    text: appCopy.status.manualFallback,
  },
  {
    label: "Privat",
    text: appCopy.status.localOnly,
  },
];

type ManualSelection = {
  countyId: string;
  town: string;
};

export function App() {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [manualSelection, setManualSelection] = useState<ManualSelection>({
    countyId: "",
    town: "",
  });
  const selectedCounty = shelterCountyGroups.find((group) => group.id === manualSelection.countyId) ?? null;
  const townOptions = useMemo(() => getTownOptions(selectedCounty?.shelters ?? []), [selectedCounty]);
  const manualLocation = useMemo(
    () =>
      selectedCounty === null || manualSelection.town === ""
        ? null
        : getTownCenter(selectedCounty.shelters, manualSelection.town),
    [manualSelection.town, selectedCounty],
  );
  const location = useLocation({
    enabled: gpsEnabled,
    manualLocation: manualLocation === null ? null : { coordinate: manualLocation },
  });
  const compass = useCompass();
  const ranking = useMemo(
    () =>
      location.effectiveLocation === null
        ? { primary: null, nearest: [] }
        : rankShelters(location.effectiveLocation.coordinate, shelters, { limit: 4 }),
    [location.effectiveLocation],
  );
  const targetDirection = useMemo(
    () =>
      location.effectiveLocation === null || ranking.primary === null
        ? null
        : getTargetDirection(location.effectiveLocation, ranking.primary.shelter),
    [location.effectiveLocation, ranking.primary],
  );
  const sourceLabel = getLocationSourceLabel(location.effectiveLocation);
  const statusLabel = getLocationStatusLabel(location.status, location.effectiveLocation);
  const primaryDistance = ranking.primary === null ? "-- km" : formatDistance(ranking.primary.distanceMeters);

  function updateCounty(countyId: string): void {
    setManualSelection({ countyId, town: "" });
  }

  return (
    <div className="app-frame">
      <header className="top-bar">
        <a className="brand-lockup" href="#top" aria-label={appCopy.productLabel}>
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>{appCopy.productLabel}</span>
        </a>
        <span className="network-pill">{statusItems[0].label}</span>
      </header>

      <main id="top" className="app-shell">
        <section className="hero" aria-labelledby="app-title">
          <p className="eyebrow">{appCopy.productLabel}</p>
          <h1 id="app-title">{appCopy.title}</h1>
          <p className="lead">{appCopy.subtitle}</p>
          <div className="hero-actions" aria-label="Actiuni principale">
            <a className="primary-action" href="#nearby">
              {appCopy.actions.findShelter}
            </a>
            <a className="secondary-action" href="#emergency">
              {appCopy.actions.emergencyGuide}
            </a>
          </div>
        </section>

        <section id="status" className="status-grid" aria-labelledby="status-title">
          <h2 id="status-title">{appCopy.status.title}</h2>
          <div className="status-cards">
            {statusItems.map((item) => (
              <article className="status-card" key={item.label}>
                <p className="card-kicker">{item.label}</p>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="install" className="panel install-panel" aria-labelledby="install-title">
          <div>
            <p className="card-kicker">{appCopy.sections.install.status}</p>
            <h2 id="install-title">{appCopy.sections.install.title}</h2>
            <p>{appCopy.sections.install.description}</p>
          </div>
          <ol className="install-checklist">
            {appCopy.sections.install.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="quiet-note">{appCopy.sections.install.caveat}</p>
        </section>

        <section className="panel location-panel" aria-labelledby="location-title">
          <div>
            <p className="card-kicker">{appCopy.sections.location.status}</p>
            <h2 id="location-title">{appCopy.sections.location.title}</h2>
            <p>{appCopy.sections.location.description}</p>
          </div>
          <div className="control-row">
            <button type="button" className="primary-action" onClick={() => setGpsEnabled(true)} disabled={gpsEnabled}>
              {appCopy.actions.enableLocation}
            </button>
            <a className="secondary-action" href="#manual-location">
              {appCopy.actions.manualSearch}
            </a>
          </div>
          <div className="location-summary" aria-live="polite">
            <p>
              <strong>{sourceLabel}</strong>
              <span>{statusLabel}</span>
            </p>
            <p>
              {location.effectiveLocation?.accuracyMeters === null || location.effectiveLocation === null
                ? appCopy.sections.location.noAccuracy
                : `${appCopy.sections.location.accuracy}: ${formatDistance(location.effectiveLocation.accuracyMeters)}`}
            </p>
          </div>
          <div id="manual-location" className="manual-grid">
            <label>
              <span>{appCopy.actions.chooseCounty}</span>
              <select value={manualSelection.countyId} onChange={(event) => updateCounty(event.target.value)}>
                <option value="">{appCopy.sections.location.manualCountyPlaceholder}</option>
                {shelterCountyGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{appCopy.actions.chooseTown}</span>
              <select
                value={manualSelection.town}
                onChange={(event) => setManualSelection((current) => ({ ...current, town: event.target.value }))}
                disabled={selectedCounty === null}
              >
                <option value="">{appCopy.sections.location.manualTownPlaceholder}</option>
                {townOptions.map((town) => (
                  <option key={town} value={town}>
                    {town}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {manualSelection.town !== "" ? (
            <p className="quiet-note">
              {appCopy.sections.location.manualSelection}: {selectedCounty?.name}, {manualSelection.town}
            </p>
          ) : (
            <p className="quiet-note">{appCopy.sections.location.fallback}</p>
          )}
        </section>

        <section id="nearby" className="panel shelter-panel" aria-labelledby="shelter-title">
          <div className="section-heading">
            <div>
              <p className="card-kicker">{appCopy.sections.shelter.status}</p>
              <h2 id="shelter-title">{appCopy.sections.shelter.title}</h2>
            </div>
            <span className="distance-placeholder">{primaryDistance}</span>
          </div>
          <p>{appCopy.sections.shelter.description}</p>
          {targetDirection === null ? null : (
            <section className="compass-card" aria-labelledby="compass-title">
              <div className="compass-heading-row">
                <div>
                  <p className="card-kicker">{appCopy.sections.compass.status}</p>
                  <h3 id="compass-title">{appCopy.sections.compass.title}</h3>
                </div>
                <span className="bearing-chip">
                  {appCopy.sections.compass.cardinalLabels[targetDirection.cardinalDirection]} ·{" "}
                  {formatBearing(targetDirection.bearingDegrees)}
                </span>
              </div>
              <p>
                {appCopy.sections.compass.directionPrefix}{" "}
                <strong>{appCopy.sections.compass.cardinalLabels[targetDirection.cardinalDirection]}</strong>
              </p>
              <div className="compass-status" aria-live="polite">
                <p>
                  <strong>{appCopy.sections.compass.fields.compass}</strong>
                  <span>{getCompassStatusLabel(compass.status, compass.calibrationState)}</span>
                </p>
                {compass.headingDegrees === null || compass.cardinalDirection === null ? (
                  <p>{appCopy.sections.compass.headingUnavailable}</p>
                ) : (
                  <p>
                    {appCopy.sections.compass.headingPrefix}{" "}
                    <strong>{appCopy.sections.compass.cardinalLabels[compass.cardinalDirection]}</strong> ·{" "}
                    {formatBearing(compass.headingDegrees)}
                  </p>
                )}
              </div>
              {compass.canRequestPermission && compass.status === "permission-required" ? (
                <button
                  type="button"
                  className="secondary-action compass-action"
                  onClick={() => void compass.requestPermission()}
                >
                  {appCopy.actions.enableCompass}
                </button>
              ) : null}
              <p className="quiet-note">{appCopy.sections.compass.secondaryAid}</p>
            </section>
          )}
          <div className="result-placeholder shelter-results" aria-live="polite">
            <h3>{appCopy.sections.shelter.listTitle}</h3>
            {ranking.primary === null ? (
              <p>{appCopy.sections.shelter.listPlaceholder}</p>
            ) : (
              <>
                <ShelterResult result={ranking.primary} label={appCopy.sections.shelter.primaryLabel} />
                <div className="nearest-list" aria-label={appCopy.sections.shelter.nearestLabel}>
                  {ranking.nearest
                    .filter((result) => result.shelter.id !== ranking.primary?.shelter.id)
                    .slice(0, 3)
                    .map((result) => (
                      <ShelterResult result={result} key={result.shelter.id} />
                    ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section id="emergency" className="panel emergency-panel" aria-labelledby="emergency-title">
          <div className="section-heading">
            <div>
              <p className="card-kicker">{emergencyContent.title}</p>
              <h2 id="emergency-title">{appCopy.sections.emergency.title}</h2>
            </div>
            <a className="emergency-call" href="tel:112">
              {appCopy.actions.call112}
            </a>
          </div>
          <p>{appCopy.sections.emergency.description}</p>

          <div className="number-grid">
            {emergencyContent.numbers.map((number) => (
              <article className="number-card" key={number.id}>
                <strong>{number.number}</strong>
                <div>
                  <h3>{number.label}</h3>
                  <p>{number.action}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="instruction-list">
            {emergencyContent.instructionGroups.slice(0, 3).map((group) => (
              <article className="instruction-card" key={group.id}>
                <h3>{group.title}</h3>
                <p>{group.summary}</p>
              </article>
            ))}
          </div>

          <p className="quiet-note">{emergencyContent.disclaimer}</p>
        </section>

        <section className="source-panel" aria-labelledby="source-title">
          <h2 id="source-title">{appCopy.sections.source.title}</h2>
          <dl>
            <div>
              <dt>{appCopy.sections.source.reviewed}</dt>
              <dd>{shelterDataSource.vendoredAt}</dd>
            </div>
            <div>
              <dt>{appCopy.sections.source.official}</dt>
              <dd>
                <a href={shelterDataSource.officialPdfUrl}>{shelterDataSource.officialSourceName}</a>
              </dd>
            </div>
            <div>
              <dt>{appCopy.sections.source.repository}</dt>
              <dd>
                <a href={shelterDataSource.referenceRepositoryUrl}>mhlnu/adaposturi</a>
              </dd>
            </div>
          </dl>
          <p>{appCopy.sections.source.disclaimer}</p>
        </section>
      </main>

      <nav className="bottom-nav" aria-label="Navigare principala">
        <a href="#status">{appCopy.navigation.status}</a>
        <a href="#install">{appCopy.navigation.install}</a>
        <a href="#nearby">{appCopy.navigation.shelter}</a>
        <a href="#emergency">{appCopy.navigation.emergency}</a>
      </nav>
    </div>
  );
}

function ShelterResult({ result, label }: { result: RankedShelter; label?: string }) {
  const { shelter } = result;

  return (
    <article className="shelter-result">
      <div className="shelter-result-heading">
        <div>
          {label ? <p className="card-kicker">{label}</p> : null}
          <h4>{shelter.address}</h4>
        </div>
        <span className={getShelterStatusClass(shelter.status)}>{appCopy.sections.shelter.statusLabels[shelter.status]}</span>
      </div>
      <dl>
        <div>
          <dt>{appCopy.sections.shelter.fields.distance}</dt>
          <dd>{formatDistance(result.distanceMeters)}</dd>
        </div>
        <div>
          <dt>{appCopy.sections.shelter.fields.town}</dt>
          <dd>
            {shelter.town}, {shelter.county}
          </dd>
        </div>
        <div>
          <dt>{appCopy.sections.shelter.fields.capacity}</dt>
          <dd>{formatCapacity(shelter)}</dd>
        </div>
        <div>
          <dt>{appCopy.sections.shelter.fields.access}</dt>
          <dd>{appCopy.sections.shelter.typeLabels[shelter.type]}</dd>
        </div>
      </dl>
    </article>
  );
}

function getTownOptions(countyShelters: readonly Shelter[]): string[] {
  return [...new Set(countyShelters.map((shelter) => shelter.town))].sort((left, right) => left.localeCompare(right, "ro"));
}

function getTownCenter(countyShelters: readonly Shelter[], town: string) {
  const townShelters = countyShelters.filter((shelter) => shelter.town === town);

  if (townShelters.length === 0) {
    return null;
  }

  return {
    latitude: townShelters.reduce((sum, shelter) => sum + shelter.latitude, 0) / townShelters.length,
    longitude: townShelters.reduce((sum, shelter) => sum + shelter.longitude, 0) / townShelters.length,
  };
}

function getLocationSourceLabel(location: LocationSnapshot | null): string {
  return location === null
    ? appCopy.sections.location.sourceLabels.none
    : appCopy.sections.location.sourceLabels[location.source];
}

function getLocationStatusLabel(status: LocationStatus, effectiveLocation: LocationSnapshot | null): string {
  if (effectiveLocation !== null && status === "idle") {
    return appCopy.sections.location.permissionLabels.ready;
  }

  return appCopy.sections.location.permissionLabels[status];
}

function getTargetDirection(location: LocationSnapshot, shelter: Shelter): {
  bearingDegrees: number;
  cardinalDirection: CardinalDirection;
} {
  const bearingDegrees = getBearingDegrees(location.coordinate, {
    latitude: shelter.latitude,
    longitude: shelter.longitude,
  });

  return {
    bearingDegrees,
    cardinalDirection: getCardinalDirection(bearingDegrees),
  };
}

function getCompassStatusLabel(status: CompassStatus, calibrationState: CompassCalibrationState): string {
  if (status === "ready" && calibrationState === "needs-calibration") {
    return appCopy.sections.compass.statusLabels.needsCalibration;
  }

  if (status === "ready" && calibrationState === "good") {
    return appCopy.sections.compass.statusLabels.readyCalibrated;
  }

  return appCopy.sections.compass.statusLabels[status];
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(distanceMeters < 10_000 ? 1 : 0)} km`;
}

function formatBearing(bearingDegrees: number): string {
  return `${Math.round(bearingDegrees)}°`;
}

function formatCapacity(shelter: Shelter): string {
  return shelter.capacity === null
    ? appCopy.sections.shelter.capacityUnknown
    : `${shelter.capacity} ${appCopy.sections.shelter.capacityPeople}`;
}

function getShelterStatusClass(status: ShelterStatus): string {
  return `shelter-status shelter-status-${status}`;
}
