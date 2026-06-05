import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCATION_CACHE_KEY, useLocation, type UseLocationOptions } from "./useLocation";

const NOW = 1_700_000_000_000;
const bucharest = { latitude: 44.4268, longitude: 26.1025 };
const clujNapoca = { latitude: 46.7712, longitude: 23.6236 };
const fixedNow = () => NOW;

type GeolocationMocks = {
  watchPosition: ReturnType<typeof vi.fn>;
  clearWatch: ReturnType<typeof vi.fn>;
  emitSuccess: (position: Partial<GeolocationPosition>) => void;
  emitError: (error: Partial<GeolocationPositionError>) => void;
};

function renderUseLocation(options: UseLocationOptions = {}) {
  return renderHook(() =>
    useLocation({
      now: fixedNow,
      ...options,
    }),
  );
}

describe("useLocation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setNavigatorValue("geolocation", undefined);
    setNavigatorValue("permissions", undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("reports unavailable when browser geolocation is missing and no fallback exists", async () => {
    const { result } = renderUseLocation();

    await waitFor(() => expect(result.current.status).toBe("unavailable"));

    expect(result.current.effectiveLocation).toBeNull();
    expect(result.current.permissionState).toBe("unsupported");
  });

  it("uses a fresh cached last known location when geolocation is unavailable", async () => {
    writeCachedLocation({
      latitude: bucharest.latitude,
      longitude: bucharest.longitude,
      timestamp: NOW - 60_000,
      accuracyMeters: 12,
    });

    const { result } = renderUseLocation();

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.cachedLocation).toMatchObject({
      coordinate: bucharest,
      source: "cache",
      isStale: false,
      accuracyMeters: 12,
    });
    expect(result.current.effectiveLocation?.source).toBe("cache");
  });

  it("surfaces an expired cached location as stale without using it as effective current location", async () => {
    writeCachedLocation({
      latitude: bucharest.latitude,
      longitude: bucharest.longitude,
      timestamp: NOW - 20 * 60_000,
    });

    const { result } = renderUseLocation();

    await waitFor(() => expect(result.current.status).toBe("stale"));

    expect(result.current.cachedLocation?.isStale).toBe(true);
    expect(result.current.effectiveLocation).toBeNull();
  });

  it("removes invalid cached coordinates instead of returning them", async () => {
    writeCachedLocation({
      latitude: 91,
      longitude: bucharest.longitude,
      timestamp: NOW - 60_000,
    });

    const { result } = renderUseLocation();

    await waitFor(() => expect(result.current.status).toBe("unavailable"));

    expect(result.current.cachedLocation).toBeNull();
    expect(window.localStorage.getItem(LOCATION_CACHE_KEY)).toBeNull();
  });

  it("does not start a geolocation watch when permission is already denied", async () => {
    const geolocation = installGeolocationMock();
    setNavigatorValue("permissions", {
      query: vi.fn().mockResolvedValue({ state: "denied" }),
    });

    const { result } = renderUseLocation();

    await waitFor(() => expect(result.current.status).toBe("denied"));

    expect(result.current.permissionState).toBe("denied");
    expect(geolocation.watchPosition).not.toHaveBeenCalled();
  });

  it("reports denied when the geolocation watch returns a permission error", async () => {
    const geolocation = installGeolocationMock();

    const { result } = renderUseLocation();

    await waitFor(() => expect(geolocation.watchPosition).toHaveBeenCalled());

    act(() => {
      geolocation.emitError({ code: 1, message: "permisiune refuzata" });
    });

    expect(result.current.status).toBe("denied");
    expect(result.current.permissionState).toBe("denied");
    expect(result.current.errorMessage).toBe("permisiune refuzata");
  });

  it("stores successful GPS positions and uses them as the effective location", async () => {
    const geolocation = installGeolocationMock();

    const { result } = renderUseLocation();

    await waitFor(() => expect(geolocation.watchPosition).toHaveBeenCalled());

    act(() => {
      geolocation.emitSuccess(createPosition(bucharest, NOW, 8));
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.gpsLocation).toMatchObject({
      coordinate: bucharest,
      source: "gps",
      isStale: false,
      accuracyMeters: 8,
    });
    expect(result.current.effectiveLocation?.source).toBe("gps");
    expect(JSON.parse(window.localStorage.getItem(LOCATION_CACHE_KEY) ?? "{}")).toMatchObject({
      latitude: bucharest.latitude,
      longitude: bucharest.longitude,
      timestamp: NOW,
      accuracyMeters: 8,
    });
  });

  it("keeps manual fallback available when no GPS or fresh cache exists", async () => {
    const { result } = renderUseLocation({
      manualLocation: {
        coordinate: clujNapoca,
        timestamp: NOW - 5_000,
      },
    });

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(result.current.manualLocation?.source).toBe("manual");
    expect(result.current.effectiveLocation).toMatchObject({
      coordinate: clujNapoca,
      source: "manual",
    });
  });
});

function installGeolocationMock(): GeolocationMocks {
  let successCallback: PositionCallback | null = null;
  let errorCallback: PositionErrorCallback | null = null;
  const watchPosition = vi.fn((success: PositionCallback, error: PositionErrorCallback | null) => {
    successCallback = success;
    errorCallback = error;

    return 42;
  });
  const clearWatch = vi.fn();

  setNavigatorValue("geolocation", {
    watchPosition,
    clearWatch,
  });

  return {
    watchPosition,
    clearWatch,
    emitSuccess(position) {
      successCallback?.(position as GeolocationPosition);
    },
    emitError(error) {
      errorCallback?.(error as GeolocationPositionError);
    },
  };
}

function createPosition(coordinate: typeof bucharest, timestamp: number, accuracy: number): Partial<GeolocationPosition> {
  return {
    coords: {
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      accuracy,
    } as GeolocationCoordinates,
    timestamp,
  };
}

function writeCachedLocation(payload: unknown): void {
  window.localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(payload));
}

function setNavigatorValue(key: "geolocation" | "permissions", value: unknown): void {
  Object.defineProperty(navigator, key, {
    configurable: true,
    value,
  });
}
