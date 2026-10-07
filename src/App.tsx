import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { appCopy } from "./content";
import { EmergencyGuide } from "./components/EmergencyGuide";
import { useNavigationInsets } from "./hooks/useNavigationInsets";
import { shelterCountyGroups, shelters, shelterDataSource, type Shelter, type ShelterStatus } from "./data";
import { useCompass, type CompassCalibrationState, type CompassStatus } from "./hooks/useCompass";
import { useLocation, type LocationSnapshot, type LocationStatus } from "./hooks/useLocation";
import { getBearingDegrees, getCardinalDirection, type CardinalDirection, type Coordinate } from "./lib/geo";
import { rankShelters } from "./lib/ranking";
import { estimateTownLocation, listManualShelters } from "./lib/manualShelters";
import { applyOfflineUpdate, useNetworkOnline, useOfflineStatus } from "./registerServiceWorker";

const statusItems = [
  {
    label: appCopy.status.labels.offline,
    text: appCopy.status.offlineReady,
  },
  {
    label: appCopy.status.labels.manual,
    text: appCopy.status.manualFallback,
  },
  {
    label: appCopy.status.labels.private,
    text: appCopy.status.localOnly,
  },
];

type ManualSelection = {
  countyId: string;
  town: string;
};

export function App() {
  const { headerRef, navigationRef } = useNavigationInsets();
  const offlineStatus = useOfflineStatus();
  const networkOnline = useNetworkOnline();
  const [locationMode, setLocationMode] = useState<"gps" | "manual">("manual");
  const [gpsRetryKey, setGpsRetryKey] = useState(0);
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
        : estimateTownLocation(selectedCounty.shelters.filter((shelter) => shelter.town === manualSelection.town)),
    [manualSelection.town, selectedCounty],
  );
  const location = useLocation({
    mode: locationMode,
    retryKey: gpsRetryKey,
    enabled: gpsEnabled,
  });
  const compass = useCompass();
  const latitude = location.effectiveLocation?.coordinate.latitude;
  const longitude = location.effectiveLocation?.coordinate.longitude;
  const rankingCoordinate = useMemo(
    () => latitude === undefined || longitude === undefined ? null : { latitude, longitude },
    [latitude, longitude],
  );
  const isManualSearch = locationMode === "manual" && manualSelection.town !== "" && selectedCounty !== null;
  const manualShelters = useMemo(() => selectedCounty === null ? []
    : listManualShelters(selectedCounty.shelters, selectedCounty.id, manualSelection.town),
  [selectedCounty, manualSelection.town]);
  const ranking = useMemo(
    () =>
      rankingCoordinate === null || isManualSearch
        ? { primary: null, nearest: [] }
        : rankShelters(rankingCoordinate, shelters, { limit: 4 }),
    [rankingCoordinate, isManualSearch],
  );
  const targetDirection = useMemo(
    () =>
      rankingCoordinate === null || ranking.primary === null
        ? null
        : getTargetDirection(rankingCoordinate, ranking.primary.shelter),
    [rankingCoordinate, ranking.primary],
  );
  const sourceLabel = isManualSearch ? appCopy.sections.location.sourceLabels.manual : getLocationSourceLabel(location.effectiveLocation);
  const statusLabel = isManualSearch ? appCopy.sections.location.manualBrowsing : getLocationStatusLabel(location.status, location.effectiveLocation);
  const primaryDistance = ranking.primary === null ? "-- km" : formatDistance(ranking.primary.distanceMeters);

  function updateCounty(countyId: string): void {
    setLocationMode("manual");
    setGpsEnabled(false);
    setManualSelection({ countyId, town: "" });
  }

  function startGps(): void {
    setLocationMode("gps");
    setGpsEnabled(true);
    setGpsRetryKey((key) => key + 1);
  }

  return (
    <div className="app-frame">
      <a className="skip-link" href="#top" onClick={() => document.getElementById("top")?.focus()}>
        {appCopy.accessibility.skipToContent}
      </a>
      <header className="top-bar" ref={headerRef}>
        <a className="brand-lockup" href="#top" aria-label={appCopy.productLabel}>
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>{appCopy.productLabel}</span>
        </a>
        <span className="network-pill" role="status">{appCopy.status.offlineLabels[offlineStatus]}</span>
      </header>

      <main id="top" className="app-shell" tabIndex={-1}>
        <section className="hero" aria-labelledby="app-title">
          <p className="eyebrow">{appCopy.productLabel}</p>
          <h1 id="app-title">{appCopy.title}</h1>
          <p className="lead">{appCopy.subtitle}</p>
          <div className="hero-actions" aria-label={appCopy.accessibility.primaryActions}>
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
                <p>{item === statusItems[0] ? appCopy.status.offlineDetails[offlineStatus] : item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="install" className="panel install-panel" aria-labelledby="install-title">
          <div>
            <p className="card-kicker">{appCopy.sections.install.status}</p>
            <h2 id="install-title">{appCopy.sections.install.title}</h2>
            <p role="status">{appCopy.status.offlineDetails[offlineStatus]}</p>
            <p>{networkOnline ? appCopy.status.connectionOnline : appCopy.status.connectionOffline}</p>
            <p>{appCopy.sections.install.description}</p>
          </div>
          <ol className="install-checklist">
            {appCopy.sections.install.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="quiet-note">{appCopy.sections.install.caveat}</p>
          {offlineStatus === "update-available" ? (
            <button type="button" className="primary-action" onClick={applyOfflineUpdate}>{appCopy.actions.applyUpdate}</button>
          ) : null}
        </section>

        <section className="panel location-panel" aria-labelledby="location-title">
          <div>
            <p className="card-kicker">{appCopy.sections.location.status}</p>
            <h2 id="location-title">{appCopy.sections.location.title}</h2>
            <p>{appCopy.sections.location.description}</p>
          </div>
          <fieldset className="location-modes">
            <legend>{appCopy.sections.location.modeLabel}</legend>
            <label><input type="radio" name="location-mode" checked={locationMode === "gps"} onChange={startGps} />{appCopy.sections.location.gpsMode}</label>
            <label><input type="radio" name="location-mode" checked={locationMode === "manual"} onChange={() => { setLocationMode("manual"); setGpsEnabled(false); }} />{appCopy.sections.location.manualMode}</label>
          </fieldset>
          <div className="control-row">
            <button type="button" className="primary-action" onClick={startGps}>
              {gpsEnabled ? appCopy.actions.retryLocation : appCopy.actions.enableLocation}
            </button>
            {gpsEnabled ? <button type="button" className="secondary-action" onClick={() => { setGpsEnabled(false); setLocationMode("manual"); }}>{appCopy.actions.stopLocation}</button> : null}
            <a className="secondary-action" href="#manual-location">
              {appCopy.actions.manualSearch}
            </a>
          </div>
          <div className="location-summary">
            <p role="status" aria-atomic="true">
              <strong>{sourceLabel}</strong>
              <span>{statusLabel}</span>
            </p>
            {locationMode === "manual" || location.positionAgeSeconds === null ? null : <p>{appCopy.sections.location.age}: {location.positionAgeSeconds} {appCopy.sections.location.seconds}</p>}
            {locationMode === "manual" ? null : <p>
              {location.effectiveLocation?.accuracyMeters === null || location.effectiveLocation === null
                ? appCopy.sections.location.noAccuracy
                : `${appCopy.sections.location.accuracy}: ${formatDistance(location.effectiveLocation.accuracyMeters)}`}
            </p>}
          </div>
          <div id="manual-location" className="manual-grid">
            <label>
              <span>{appCopy.actions.chooseCounty}</span>
              <select id="manual-county" value={manualSelection.countyId} onChange={(event) => updateCounty(event.target.value)}>
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
                onChange={(event) => { setLocationMode("manual"); setGpsEnabled(false); setManualSelection((current) => ({ ...current, town: event.target.value })); }}
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
          <details className="location-privacy">
            <summary>{appCopy.sections.location.privacy.title}</summary>
            <label className="retention-control">
              <input type="checkbox" checked={location.retainLocation} onChange={(event) => {
                location.setRetainLocation(event.target.checked);
                if (!event.target.checked) { setGpsEnabled(false); setLocationMode("manual"); }
              }} />
              <span>{appCopy.sections.location.privacy.retain}</span>
            </label>
            <p className="quiet-note">{location.retainLocation ? appCopy.sections.location.privacy.retained : appCopy.sections.location.privacy.notRetained}</p>
            <button type="button" className="secondary-action" title={appCopy.sections.location.privacy.clear} aria-label={appCopy.sections.location.privacy.clear} onClick={() => {
              location.clearSavedLocation(); setGpsEnabled(false); setLocationMode("manual");
            }}><Trash2 size={18} aria-hidden="true" /><span>{appCopy.sections.location.privacy.clear}</span></button>
            <p className="quiet-note">{appCopy.sections.location.privacy.scope}</p>
            <p role="status" aria-atomic="true">{location.privacyStatus === "idle" ? "" : appCopy.sections.location.privacy.feedback[location.privacyStatus]}</p>
          </details>
        </section>

        <section id="nearby" className="panel shelter-panel" aria-labelledby="shelter-title">
          <div className="section-heading">
            <div>
              <p className="card-kicker">{isManualSearch ? appCopy.sections.shelter.manualStatus : appCopy.sections.shelter.status}</p>
              <h2 id="shelter-title">{isManualSearch ? appCopy.sections.shelter.manualTitle : appCopy.sections.shelter.title}</h2>
            </div>
            {isManualSearch ? null : <span className="distance-placeholder">{primaryDistance}</span>}
          </div>
          <p>{isManualSearch ? appCopy.sections.shelter.manualDescription : appCopy.sections.shelter.description}</p>
          {isManualSearch ? <p className="quiet-note">{appCopy.sections.shelter.manualBrowsingNote}</p> : null}
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
              <div className="compass-status">
                <p role="status" aria-atomic="true">
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
          <p className="visually-hidden" role="status" aria-atomic="true">
            {ranking.primary === null ? "" : `${appCopy.sections.shelter.primaryLabel}: ${ranking.primary.shelter.address}`}
          </p>
          <div className="result-placeholder shelter-results">
            <h3>{isManualSearch ? appCopy.sections.shelter.localListLabel : appCopy.sections.shelter.listTitle}</h3>
            {isManualSearch ? (
              <>
                {manualShelters.some((shelter) => shelter.status === "functional" && !manualLocation?.suspectIds.has(shelter.id))
                  ? null : <p>{appCopy.sections.shelter.noLocalFunctional}</p>}
                <div className="nearest-list" aria-label={appCopy.sections.shelter.localListLabel}>
                  {manualShelters.map((shelter) => (
                    <ShelterResult shelter={shelter} key={shelter.id}
                      suspectCoordinate={manualLocation?.suspectIds.has(shelter.id)} />
                  ))}
                </div>
                <a className="secondary-action" href="#manual-location"
                  onClick={(event) => {
                    // Native fragment navigation can override selector focus on older Chrome.
                    event.preventDefault();
                    document.getElementById("manual-county")?.focus();
                  }}>
                  {appCopy.actions.searchOtherLocality}
                </a>
              </>
            ) : ranking.primary === null ? (
              <p>{appCopy.sections.shelter.listPlaceholder}</p>
            ) : (
              <>
                <ShelterResult shelter={ranking.primary.shelter} distanceMeters={ranking.primary.distanceMeters} label={appCopy.sections.shelter.primaryLabel} />
                <div className="nearest-list" aria-label={appCopy.sections.shelter.nearestLabel}>
                  {ranking.nearest
                    .filter((result) => result.shelter.id !== ranking.primary?.shelter.id)
                    .slice(0, 3)
                    .map((result) => (
                      <ShelterResult shelter={result.shelter} distanceMeters={result.distanceMeters} key={result.shelter.id} />
                    ))}
                </div>
              </>
            )}
          </div>
        </section>

        <EmergencyGuide />

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

      <nav className="bottom-nav" ref={navigationRef} aria-label={appCopy.navigation.primaryLabel}>
        <a href="#status">{appCopy.navigation.status}</a>
        <a href="#install">{appCopy.navigation.install}</a>
        <a href="#nearby">{appCopy.navigation.shelter}</a>
        <a href="#emergency">{appCopy.navigation.emergency}</a>
      </nav>
    </div>
  );
}

function ShelterResult({ shelter, distanceMeters, label, suspectCoordinate = false }: { shelter: Shelter; distanceMeters?: number; label?: string; suspectCoordinate?: boolean }) {

  return (
    <article className="shelter-result">
      <div className="shelter-result-heading">
        <div>
          {label ? <p className="card-kicker">{label}</p> : null}
          <h4>{shelter.address}</h4>
        </div>
        <span className={getShelterStatusClass(shelter.status)}>{appCopy.sections.shelter.statusLabels[shelter.status]}</span>
      </div>
      {suspectCoordinate ? <p className="quiet-note">{appCopy.sections.shelter.suspectCoordinate}</p> : null}
      <dl>
        {distanceMeters === undefined ? null : <div>
          <dt>{appCopy.sections.shelter.fields.distance}</dt>
          <dd>{formatDistance(distanceMeters)}</dd>
        </div>}
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

function getTargetDirection(coordinate: Coordinate, shelter: Shelter): {
  bearingDegrees: number;
  cardinalDirection: CardinalDirection;
} {
  const bearingDegrees = getBearingDegrees(coordinate, {
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
