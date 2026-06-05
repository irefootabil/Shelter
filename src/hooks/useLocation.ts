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
  enabled?: boolean;
  cacheMaxAgeMs?: number;
  manualLocation?: ManualLocationInput | null;
  watchOptions?: PositionOptions;
  now?: () => number;
};

export type UseLocationResult = {
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
const SMOOTHING_ALPHA = 0.35;
const GEOLOCATION_PERMISSION_DENIED = 1;

export function useLocation(options: UseLocationOptions = {}): UseLocationResult {
  const {
    enabled = true,
    cacheMaxAgeMs = DEFAULT_CACHE_MAX_AGE_MS,
    manualLocation: manualLocationInput = null,
    now = Date.now,
    watchOptions = DEFAULT_WATCH_OPTIONS,
  } = options;
  const currentTime = now();
  const [permissionState, setPermissionState] = useState<LocationPermissionState>("unsupported");
  const [gpsLocation, setGpsLocation] = useState<LocationSnapshot | null>(null);
  const [cachedLocation, setCachedLocation] = useState<LocationSnapshot | null>(() =>
    readCachedLocation(currentTime, cacheMaxAgeMs),
  );
  const [status, setStatus] = useState<LocationStatus>(() => getInitialStatus(enabled, cachedLocation));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const manualLocation = useMemo(
    () => createManualLocation(manualLocationInput, currentTime),
    [currentTime, manualLocationInput],
  );
  const effectiveLocation = chooseEffectiveLocation(gpsLocation, cachedLocation, manualLocation);
  const fallbackRef = useRef({
    cachedLocation,
    manualLocation,
  });

  fallbackRef.current = {
    cachedLocation,
    manualLocation,
  };

  useEffect(() => {
    setCachedLocation(readCachedLocation(now(), cacheMaxAgeMs));
  }, [cacheMaxAgeMs, now]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    if (typeof navigator.geolocation?.watchPosition !== "function") {
      const fallbackStatus = getFallbackStatus(fallbackRef.current.cachedLocation, fallbackRef.current.manualLocation);
      setStatus(fallbackStatus ?? "unavailable");
      return;
    }

    let isActive = true;
    let watchId: number | null = null;
    let previousSmoothedCoordinate: Coordinate | null = null;

    setStatus(getFallbackStatus(fallbackRef.current.cachedLocation, fallbackRef.current.manualLocation) ?? "loading");
    setErrorMessage(null);

    async function startWatch(): Promise<void> {
      const state = await queryPermissionState();

      if (!isActive) {
        return;
      }

      setPermissionState(state);

      if (state === "denied") {
        setStatus(cachedLocation?.isStale ? "stale" : cachedLocation || manualLocation ? "ready" : "denied");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!isActive) {
            return;
          }

          const timestamp = normalizeTimestamp(position.timestamp, now());
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
          setCachedLocation(nextLocation);
          setStatus("ready");
          setErrorMessage(null);
          writeCachedLocation(nextLocation);
        },
        (error) => {
          if (!isActive) {
            return;
          }

          if (error.code === GEOLOCATION_PERMISSION_DENIED) {
            setPermissionState("denied");
            setStatus(getFallbackStatus(fallbackRef.current.cachedLocation, fallbackRef.current.manualLocation) ?? "denied");
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
      isActive = false;

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled, now, watchOptions]);

  return {
    status,
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

  if (!isCoordinate(coordinate) || typeof payload.timestamp !== "number" || !Number.isFinite(payload.timestamp)) {
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

function writeCachedLocation(location: LocationSnapshot): void {
  writeJsonToStorage(LOCATION_CACHE_KEY, {
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
