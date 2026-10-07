import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LOCATION_CACHE_KEY, LOCATION_RETENTION_KEY, useLocation, type UseLocationOptions } from "./useLocation";

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
  it("clears memory and storage, rejects late callbacks, and preserves unrelated offline state", async () => {
    const geo = installGeolocationMock();
    localStorage.setItem("offline-preparation", "keep");
    const { result, rerender } = renderHook(({ retryKey }) => useLocation({ now: fixedNow, retryKey }), { initialProps: { retryKey: 0 } });
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalledTimes(1));
    act(() => geo.emitSuccess(createPosition(bucharest, NOW, 10)));
    expect(result.current.cachedLocation).not.toBeNull();
    act(() => result.current.clearSavedLocation());
    act(() => geo.emitSuccess(createPosition(clujNapoca, NOW, 10)));
    expect(result.current.gpsLocation).toBeNull();
    expect(result.current.cachedLocation).toBeNull();
    expect(result.current.effectiveLocation).toBeNull();
    expect(localStorage.getItem(LOCATION_CACHE_KEY)).toBeNull();
    expect(localStorage.getItem("offline-preparation")).toBe("keep");
    expect(result.current.privacyStatus).toBe("cleared");
    expect(geo.clearWatch).toHaveBeenCalledWith(42);
    rerender({ retryKey: 1 });
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalledTimes(2));
    act(() => geo.emitSuccess(createPosition(clujNapoca, NOW, 10)));
    expect(result.current.gpsLocation?.coordinate).toEqual(clujNapoca);
  });

  it("persists opt-out across remounts while allowing deliberate GPS use without saving", async () => {
    const geo = installGeolocationMock();
    const first = renderUseLocation({ enabled: false });
    act(() => first.result.current.setRetainLocation(false));
    expect(localStorage.getItem(LOCATION_RETENTION_KEY)).toBe("false");
    first.unmount();
    const { result } = renderUseLocation();
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalledTimes(1));
    act(() => geo.emitSuccess(createPosition(bucharest, NOW, 10)));
    expect(result.current.retainLocation).toBe(false);
    expect(result.current.gpsLocation).not.toBeNull();
    expect(result.current.cachedLocation).toBeNull();
    expect(localStorage.getItem(LOCATION_CACHE_KEY)).toBeNull();
    act(() => result.current.setRetainLocation(true));
    act(() => geo.emitSuccess(createPosition(bucharest, NOW, 10)));
    expect(localStorage.getItem(LOCATION_CACHE_KEY)).not.toBeNull();
  });

  it("invalidates pending permission queries before they can start a watch", async () => {
    const geo = installGeolocationMock();
    let resolve!: (value: { state: string }) => void;
    setNavigatorValue("permissions", { query: vi.fn(() => new Promise((done) => { resolve = done; })) });
    const { result } = renderUseLocation();
    act(() => result.current.clearSavedLocation());
    await act(async () => resolve({ state: "granted" }));
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });

  it("reports blocked deletion honestly and clears memory without breaking manual fallback", async () => {
    writeCachedLocation({ ...bucharest, timestamp: NOW, accuracyMeters: 10 });
    const { result } = renderUseLocation({ manualLocation: { coordinate: clujNapoca } });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new Error("blocked"); });
    act(() => result.current.clearSavedLocation());
    expect(result.current.cachedLocation).toBeNull();
    expect(result.current.effectiveLocation?.coordinate).toEqual(clujNapoca);
    expect(result.current.privacyStatus).toBe("storage-error");
  });

  it("disables saving immediately even when the preference cannot persist", async () => {
    const geo = installGeolocationMock();
    const { result } = renderUseLocation();
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalledTimes(1));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    act(() => result.current.setRetainLocation(false));
    act(() => geo.emitSuccess(createPosition(bucharest, NOW, 10)));
    expect(result.current.retainLocation).toBe(false);
    expect(result.current.gpsLocation).toBeNull();
    expect(result.current.privacyStatus).toBe("storage-error");
    act(() => result.current.setRetainLocation(true));
    expect(result.current.retainLocation).toBe(false);
  });

  it("fails closed on inaccessible or malformed preferences", () => {
    localStorage.setItem(LOCATION_RETENTION_KEY, "broken-json");
    const first = renderUseLocation({ enabled: false });
    expect(first.result.current.retainLocation).toBe(false);
    first.unmount();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const second = renderUseLocation({ enabled: false });
    expect(second.result.current.retainLocation).toBe(false);
  });

  it("honors opt-out from another tab and rejects its old watch readings", async () => {
    const geo = installGeolocationMock();
    const { result } = renderUseLocation();
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalledTimes(1));
    act(() => geo.emitSuccess(createPosition(bucharest, NOW, 10)));
    localStorage.setItem(LOCATION_RETENTION_KEY, "false");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: LOCATION_RETENTION_KEY, newValue: "false" })));
    act(() => geo.emitSuccess(createPosition(clujNapoca, NOW, 10)));
    expect(result.current.retainLocation).toBe(false);
    expect(result.current.gpsLocation).toBeNull();
    expect(localStorage.getItem(LOCATION_CACHE_KEY)).toBeNull();
  });
  beforeEach(() => {
    window.localStorage.clear();
    setNavigatorValue("geolocation", undefined);
    setNavigatorValue("permissions", undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
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
  it("manual mode overrides cache, stops the watch, and clearing selection removes the effective position", async () => {
    const geo = installGeolocationMock();
    const { result, rerender } = renderHook(({ mode, manual }: { mode: "gps" | "manual"; manual: boolean }) =>
      useLocation({ now: fixedNow, mode, manualLocation: manual ? { coordinate: clujNapoca } : null }),
      { initialProps: { mode: "gps", manual: true } });
    await waitFor(() => expect(geo.watchPosition).toHaveBeenCalled());
    expect(result.current.status).toBe("loading");
    expect(result.current.effectiveLocation).toBeNull();
    act(() => geo.emitSuccess(createPosition(bucharest, NOW, 8)));
    expect(result.current.effectiveLocation?.source).toBe("gps");
    rerender({ mode: "manual", manual: true });
    expect(result.current.effectiveLocation?.coordinate).toEqual(clujNapoca);
    expect(geo.clearWatch).toHaveBeenCalledWith(42);
    rerender({ mode: "manual", manual: false });
    expect(result.current.effectiveLocation).toBeNull();
  });

  it("expires GPS while open, refreshes on resume, and recovers on a new reading", async () => {
    vi.useFakeTimers();
    let clock = NOW;
    const now = () => clock;
    const geo = installGeolocationMock();
    const { result } = renderHook(() => useLocation({ now, cacheMaxAgeMs: 5000, mode: "gps" }));
    await act(async () => { await Promise.resolve(); });
    act(() => geo.emitSuccess(createPosition(bucharest, NOW, 8)));
    clock += 6000;
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.status).toBe("stale");
    expect(result.current.effectiveLocation).toBeNull();
    expect(result.current.positionAgeSeconds).toBe(6);
    act(() => geo.emitSuccess(createPosition(clujNapoca, clock, 10)));
    expect(result.current.status).toBe("ready");
    clock += 6000;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current.effectiveLocation).toBeNull();
  });

  it("expires cached positions and restarts the GPS watch on retry", async () => {
    vi.useFakeTimers();
    let clock = NOW;
    const now = () => clock;
    writeCachedLocation({ ...bucharest, timestamp: NOW });
    const geo = installGeolocationMock();
    const { result, rerender } = renderHook(({ retryKey }) => useLocation({ now, cacheMaxAgeMs: 5000, retryKey }), { initialProps: { retryKey: 0 } });
    await act(async () => { await Promise.resolve(); });
    expect(result.current.effectiveLocation?.source).toBe("cache");
    clock += 6000;
    act(() => window.dispatchEvent(new Event("pageshow")));
    expect(result.current.effectiveLocation).toBeNull();
    rerender({ retryKey: 1 });
    await act(async () => { await Promise.resolve(); });
    expect(geo.clearWatch).toHaveBeenCalledWith(42);
    expect(geo.watchPosition).toHaveBeenCalledTimes(2);
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
