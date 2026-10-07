import { useEffect, useMemo, useRef, useState } from "react";
import { isCoordinate, type Coordinate } from "../lib/geo";
import { readJsonFromStorage, removeFromStorage, writeJsonToStorage } from "../lib/storage";

export type LocationStatus = "idle" | "loading" | "ready" | "denied" | "unavailable" | "error" | "stale";

export type LocationSource = "gps" | "cache" | "manual";

export type LocationPermissionState = PermissionState | "unsupported";

export type LocationSnapshot = {
  coordinate: Coordinate;
  source: LocationSource;
  timestamp: number;
  accuracyMeters: number | null;
  isStale: boolean;
};

export type ManualLocationInput = {
  coordinate: Coordinate;
  timestamp?: number;
  accuracyMeters?: number | null;
};

export type UseLocationOptions = {
  mode?: "auto" | "gps" | "manual";
  retryKey?: number;
  enabled?: boolean;
  cacheMaxAgeMs?: number;
  manualLocation?: ManualLocationInput | null;
  watchOptions?: PositionOptions;
  now?: () => number;
};

export type UseLocationResult = {
  retainLocation: boolean;
  privacyStatus: "idle" | "cleared" | "updated" | "storage-error";
  setRetainLocation: (retain: boolean) => void;
  clearSavedLocation: () => void;
  positionAgeSeconds: number | null;
  status: LocationStatus;
  permissionState: LocationPermissionState;
  gpsLocation: LocationSnapshot | null;
  cachedLocation: LocationSnapshot | null;
  manualLocation: LocationSnapshot | null;
  effectiveLocation: LocationSnapshot | null;
  errorMessage: string | null;
};

type CachedLocationPayload = {
  latitude: unknown;
  longitude: unknown;
  timestamp: unknown;
  accuracyMeters?: unknown;
};

const DEFAULT_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
const DEFAULT_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 15_000,
  timeout: 10_000,
};
const LOCATION_CACHE_KEY = "adapost-urgenta-romania:last-known-location:v1";
export const LOCATION_RETENTION_KEY = "adapost-urgenta-romania:retain-location:v1";
const SMOOTHING_ALPHA = 0.35;
const GEOLOCATION_PERMISSION_DENIED = 1;

export function useLocation(options: UseLocationOptions = {}): UseLocationResult {
  const {
    mode = "auto",
    retryKey = 0,
    enabled = true,
    cacheMaxAgeMs = DEFAULT_CACHE_MAX_AGE_MS,
    manualLocation: manualLocationInput = null,
    now = Date.now,
    watchOptions = DEFAULT_WATCH_OPTIONS,
  } = options;
  const [currentTime, setCurrentTime] = useState(now);
  const [retainLocation, setRetention] = useState(readRetention);
  const retentionRef = useRef(retainLocation);
  const suppressCacheRef = useRef(!retainLocation);
  const watchGeneration = useRef(0);
  const stopWatchRef = useRef<(() => void) | null>(null);
  const [privacyStatus, setPrivacyStatus] = useState<UseLocationResult["privacyStatus"]>("idle");
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("unsupported");
  const [gpsSnapshot, setGpsLocation] = useState<LocationSnapshot | null>(null);
  const [cachedSnapshot, setCachedLocation] = useState<LocationSnapshot | null>(() =>
    retainLocation ? readCachedLocation(currentTime, cacheMaxAgeMs) : null,
  );
  const gpsLocation = useMemo(() => refreshFreshness(gpsSnapshot, currentTime, cacheMaxAgeMs), [gpsSnapshot, currentTime, cacheMaxAgeMs]);
  const cachedLocation = useMemo(() => refreshFreshness(cachedSnapshot, currentTime, cacheMaxAgeMs), [cachedSnapshot, currentTime, cacheMaxAgeMs]);
  const [status, setStatus] = useState<LocationStatus>(() => getInitialStatus(enabled, cachedLocation));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const manualLocation = useMemo(
    () => createManualLocation(manualLocationInput, now()),
    [manualLocationInput, now],
  );
  const effectiveLocation = mode === "manual" ? manualLocation : chooseEffectiveLocation(enabled ? gpsLocation : null, cachedLocation, mode === "auto" ? manualLocation : null);
  const fallbackRef = useRef({
    cachedLocation,
    manualLocation: mode === "auto" ? manualLocation : null,
  });

  fallbackRef.current = {
    cachedLocation,
    manualLocation: mode === "auto" ? manualLocation : null,
  };

  useEffect(() => {
    if (!suppressCacheRef.current) setCachedLocation(readCachedLocation(now(), cacheMaxAgeMs));
  }, [cacheMaxAgeMs, now]);

  function forgetPosition(): boolean {
    watchGeneration.current += 1;
    stopWatchRef.current?.();
    suppressCacheRef.current = true;
    fallbackRef.current.cachedLocation = null;
    setGpsLocation(null);
    setCachedLocation(null);
    setStatus("idle");
    setErrorMessage(null);
    return removeFromStorage(LOCATION_CACHE_KEY);
  }

  function clearSavedLocation(): void {
    setPrivacyStatus(forgetPosition() ? "cleared" : "storage-error");
  }

  function setRetainLocation(retain: boolean): void {
    const persisted = writeJsonToStorage(LOCATION_RETENTION_KEY, retain);
    // Disabling is immediate even when persistence is blocked; enabling fails closed.
    retentionRef.current = retain && persisted;
    setRetention(retentionRef.current);
    const removed = retentionRef.current ? true : forgetPosition();
    setPrivacyStatus(persisted && removed ? "updated" : "storage-error");
  }

  useEffect(() => {
    if (!retentionRef.current && !removeFromStorage(LOCATION_CACHE_KEY)) setPrivacyStatus("storage-error");
    const onStorage = (event: StorageEvent) => {
      try {
        if (event.storageArea !== null && event.storageArea !== window.localStorage) return;
      } catch {
        return;
      }
      if (event.key === LOCATION_RETENTION_KEY || event.key === null) {
        retentionRef.current = readRetention();
        setRetention(retentionRef.current);
        if (!retentionRef.current) clearSavedLocation();
      } else if (event.key === LOCATION_CACHE_KEY && event.newValue === null) {
        clearSavedLocation();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const refresh = () => setCurrentTime(now());
    refresh();
    const timer = window.setInterval(refresh, 1000);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [now]);

  useEffect(() => {
    if (!enabled || mode === "manual") {
      setGpsLocation(null);
      setStatus("idle");
      return;
    }

    if (typeof navigator.geolocation?.watchPosition !== "function") {
      const fallbackStatus = getFallbackStatus(fallbackRef.current.cachedLocation, fallbackRef.current.manualLocation);
      setStatus(fallbackStatus ?? "unavailable");
      return;
    }

    let isActive = true;
    const generation = watchGeneration.current;
    const active = () => isActive && generation === watchGeneration.current;
    let watchId: number | null = null;
    let previousSmoothedCoordinate: Coordinate | null = null;
    const stop = () => {
      isActive = false;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      watchId = null;
    };
    stopWatchRef.current = stop;

    setStatus(getFallbackStatus(fallbackRef.current.cachedLocation, fallbackRef.current.manualLocation) ?? "loading");
    setErrorMessage(null);

    async function startWatch(): Promise<void> {
      const state = await queryPermissionState();

      if (!active()) {
        return;
      }

      setPermissionState(state);

      if (state === "denied") {
        setStatus("denied");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!active()) {
            return;
          }

          const readingTime = now();
          setCurrentTime(readingTime);
          const timestamp = Math.min(normalizeTimestamp(position.timestamp, readingTime), readingTime);
          const coordinate = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };

          if (!isCoordinate(coordinate)) {
            removeFromStorage(LOCATION_CACHE_KEY);
            setStatus(getFallbackStatus(fallbackRef.current.cachedLocation, fallbackRef.current.manualLocation) ?? "error");
            setErrorMessage("Invalid geolocation coordinate.");
            return;
          }

          const smoothedCoordinate =
            previousSmoothedCoordinate === null
              ? coordinate
              : smoothCoordinate(previousSmoothedCoordinate, coordinate, SMOOTHING_ALPHA);
          const nextLocation = createLocationSnapshot({
            coordinate: smoothedCoordinate,
            source: "gps",
            timestamp,
            accuracyMeters: normalizeAccuracy(position.coords.accuracy),
            isStale: false,
          });

          previousSmoothedCoordinate = smoothedCoordinate;
          setGpsLocation(nextLocation);
          setStatus("ready");
          setErrorMessage(null);
          if (retentionRef.current) {
            if (writeCachedLocation(nextLocation)) {
              suppressCacheRef.current = false;
              setCachedLocation({ ...nextLocation, source: "cache" });
            } else {
              setPrivacyStatus("storage-error");
            }
          }
        },
        (error) => {
          if (!active()) {
            return;
          }

          if (error.code === GEOLOCATION_PERMISSION_DENIED) {
            setPermissionState("denied");
            setStatus("denied");
            setErrorMessage(error.message || "Location permission denied.");
            return;
          }

          setStatus(getFallbackStatus(fallbackRef.current.cachedLocation, fallbackRef.current.manualLocation) ?? "error");
          setErrorMessage(error.message || "Location unavailable.");
        },
        watchOptions,
      );
    }

    void startWatch();

    return () => {
      stop();
      if (stopWatchRef.current === stop) stopWatchRef.current = null;
    };
  }, [enabled, mode, retryKey, now, watchOptions]);

  return {
    retainLocation,
    privacyStatus,
    setRetainLocation,
    clearSavedLocation,
    positionAgeSeconds: mode === "manual" || (gpsLocation ?? cachedLocation) === null ? null :
      Math.max(0, Math.floor((currentTime - (gpsLocation ?? cachedLocation)!.timestamp) / 1000)),
    status: mode === "manual" ? (manualLocation === null ? "idle" : "ready") :
      effectiveLocation === null && (gpsLocation?.isStale || cachedLocation?.isStale) && status !== "denied" ? "stale" : status,
    permissionState,
    gpsLocation,
    cachedLocation,
    manualLocation,
    effectiveLocation,
    errorMessage,
  };
}

export {
  DEFAULT_CACHE_MAX_AGE_MS as LOCATION_CACHE_MAX_AGE_MS,
  LOCATION_CACHE_KEY,
};

function readCachedLocation(now: number, cacheMaxAgeMs: number): LocationSnapshot | null {
  const payload = readJsonFromStorage<CachedLocationPayload>(LOCATION_CACHE_KEY);

  if (payload === null) {
    return null;
  }

  const coordinate = {
    latitude: payload.latitude,
    longitude: payload.longitude,
  };

  if (!isCoordinate(coordinate) || typeof payload.timestamp !== "number" || !Number.isFinite(payload.timestamp) || payload.timestamp > now) {
    removeFromStorage(LOCATION_CACHE_KEY);
    return null;
  }

  return createLocationSnapshot({
    coordinate,
    source: "cache",
    timestamp: payload.timestamp,
    accuracyMeters: normalizeAccuracy(payload.accuracyMeters),
    isStale: now - payload.timestamp > cacheMaxAgeMs,
  });
}

function refreshFreshness(snapshot: LocationSnapshot | null, time: number, maxAge: number): LocationSnapshot | null {
  if (snapshot === null) return null;
  const isStale = snapshot.timestamp > time || time - snapshot.timestamp >= maxAge;
  return snapshot.isStale === isStale ? snapshot : { ...snapshot, isStale };
}

function readRetention(): boolean {
  try {
    const value = window.localStorage.getItem(LOCATION_RETENTION_KEY);
    return value === null || JSON.parse(value) === true;
  } catch {
    return false;
  }
}

function writeCachedLocation(location: LocationSnapshot): boolean {
  return writeJsonToStorage(LOCATION_CACHE_KEY, {
    latitude: location.coordinate.latitude,
    longitude: location.coordinate.longitude,
    timestamp: location.timestamp,
    accuracyMeters: location.accuracyMeters,
  });
}

function chooseEffectiveLocation(
  gpsLocation: LocationSnapshot | null,
  cachedLocation: LocationSnapshot | null,
  manualLocation: LocationSnapshot | null,
): LocationSnapshot | null {
  if (gpsLocation !== null && !gpsLocation.isStale) {
    return gpsLocation;
  }

  if (cachedLocation !== null && !cachedLocation.isStale) {
    return cachedLocation;
  }

  return manualLocation;
}

function createManualLocation(input: ManualLocationInput | null, now: number): LocationSnapshot | null {
  if (input === null || !isCoordinate(input.coordinate)) {
    return null;
  }

  return createLocationSnapshot({
    coordinate: input.coordinate,
    source: "manual",
    timestamp: input.timestamp ?? now,
    accuracyMeters: normalizeAccuracy(input.accuracyMeters),
    isStale: false,
  });
}

function createLocationSnapshot(location: LocationSnapshot): LocationSnapshot {
  return location;
}

function getInitialStatus(enabled: boolean, cachedLocation: LocationSnapshot | null): LocationStatus {
  if (!enabled) {
    return "idle";
  }

  if (cachedLocation?.isStale) {
    return "stale";
  }

  return cachedLocation === null ? "loading" : "ready";
}

function getFallbackStatus(
  cachedLocation: LocationSnapshot | null,
  manualLocation: LocationSnapshot | null,
): LocationStatus | null {
  if (cachedLocation?.isStale) {
    return "stale";
  }

  if (cachedLocation !== null || manualLocation !== null) {
    return "ready";
  }

  return null;
}

async function queryPermissionState(): Promise<LocationPermissionState> {
  if (typeof navigator.permissions?.query !== "function") {
    return "unsupported";
  }

  try {
    const status = await navigator.permissions.query({ name: "geolocation" });

    return status.state;
  } catch {
    return "unsupported";
  }
}

function normalizeTimestamp(timestamp: number, fallback: number): number {
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function normalizeAccuracy(accuracy: unknown): number | null {
  return typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null;
}

function smoothCoordinate(previous: Coordinate, next: Coordinate, alpha: number): Coordinate {
  return {
    latitude: previous.latitude + (next.latitude - previous.latitude) * alpha,
    longitude: previous.longitude + (next.longitude - previous.longitude) * alpha,
  };
}
