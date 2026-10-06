import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCompass, type UseCompassOptions } from "./useCompass";

const NOW = 1_700_000_000_000;
const fixedNow = () => NOW;

type OrientationConstructorMock = {
  requestPermission?: ReturnType<typeof vi.fn>;
};

function renderUseCompass(options: UseCompassOptions = {}) {
  return renderHook(() =>
    useCompass({
      now: fixedNow,
      ...options,
    }),
  );
}

describe("useCompass", () => {
  beforeEach(() => {
    unsetDeviceOrientationEvent();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    unsetDeviceOrientationEvent();
  });

  it("reports unavailable when device orientation is unsupported", async () => {
    const { result } = renderUseCompass();

    await waitFor(() => expect(result.current.status).toBe("unavailable"));

    expect(result.current.permissionState).toBe("unsupported");
    expect(result.current.headingDegrees).toBeNull();
    expect(result.current.canRequestPermission).toBe(false);
  });

  it("waits for explicit permission when the iOS permission API is present", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");

    installDeviceOrientationEvent({ requestPermission });

    const { result } = renderUseCompass();

    await waitFor(() => expect(result.current.status).toBe("permission-required"));

    expect(result.current.permissionState).toBe("prompt");
    expect(result.current.canRequestPermission).toBe(true);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("starts listening after iOS orientation permission is granted", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");

    installDeviceOrientationEvent({ requestPermission });

    const { result } = renderUseCompass();

    await act(async () => {
      await expect(result.current.requestPermission()).resolves.toBe("granted");
    });

    expect(result.current.permissionState).toBe("granted");
    expect(result.current.status).toBe("listening");

    act(() => {
      dispatchOrientation({ webkitCompassHeading: 91, webkitCompassAccuracy: 8 });
    });

    expect(result.current.status).toBe("ready");
    expect(result.current.headingDegrees).toBe(91);
    expect(result.current.cardinalDirection).toBe("E");
    expect(result.current.accuracyDegrees).toBe(8);
    expect(result.current.calibrationState).toBe("good");
  });

  it("reports denied when iOS orientation permission is denied", async () => {
    const requestPermission = vi.fn().mockResolvedValue("denied");

    installDeviceOrientationEvent({ requestPermission });

    const { result } = renderUseCompass();

    await act(async () => {
      await expect(result.current.requestPermission()).resolves.toBe("denied");
    });

    expect(result.current.permissionState).toBe("denied");
    expect(result.current.status).toBe("denied");
    expect(result.current.errorMessage).toBe("Device orientation permission denied.");
  });

  it("uses alpha orientation as a fallback heading and smooths wraparound changes", async () => {
    installDeviceOrientationEvent();

    const { result } = renderUseCompass({ smoothingAlpha: 0.5 });

    await waitFor(() => expect(result.current.status).toBe("listening"));

    act(() => {
      dispatchOrientation({ alpha: 10, absolute: true });
    });

    expect(result.current.headingDegrees).toBe(350);
    expect(result.current.cardinalDirection).toBe("N");

    act(() => {
      dispatchOrientation({ alpha: 350, absolute: true });
    });

    expect(result.current.headingDegrees).toBe(0);
    expect(result.current.cardinalDirection).toBe("N");
  });

  it("marks calibration as needing attention when browser accuracy is poor", async () => {
    installDeviceOrientationEvent();

    const { result } = renderUseCompass({ calibrationAccuracyThresholdDegrees: 15 });

    await waitFor(() => expect(result.current.status).toBe("listening"));

    act(() => {
      dispatchOrientation({ webkitCompassHeading: 180, webkitCompassAccuracy: 30 });
    });

    expect(result.current.headingDegrees).toBe(180);
    expect(result.current.cardinalDirection).toBe("S");
    expect(result.current.accuracyDegrees).toBe(30);
    expect(result.current.calibrationState).toBe("needs-calibration");
  });

  it("removes the orientation listener during cleanup", async () => {
    installDeviceOrientationEvent();

    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { unmount, result } = renderUseCompass();

    await waitFor(() => expect(result.current.status).toBe("listening"));

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("deviceorientation", expect.any(Function));
  });
  it("ignores relative and invalid events without discarding a fresh absolute heading", () => {
    installDeviceOrientationEvent();
    const { result } = renderUseCompass();
    act(() => dispatchOrientation({ alpha: 90, absolute: true }));
    expect(result.current.headingDegrees).toBe(270);
    act(() => dispatchOrientation({ alpha: 90, absolute: false }));
    expect(result.current.headingDegrees).toBe(270);
    expect(result.current.status).toBe("ready");
    act(() => dispatchOrientation({ webkitCompassHeading: 90, webkitCompassAccuracy: -1 }));
    expect(result.current.headingDegrees).toBe(270);
    expect(result.current.errorMessage).toBeNull();
  });

  it("stays ready when absolute and relative event streams alternate", () => {
    installDeviceOrientationEvent();
    const { result } = renderUseCompass({ smoothingAlpha: 1 });
    for (const alpha of [90, 91, 92]) {
      act(() => dispatchOrientation({ alpha, absolute: true }, "deviceorientationabsolute"));
      expect(result.current.status).toBe("ready");
      act(() => dispatchOrientation({ alpha, absolute: false }));
      expect(result.current.status).toBe("ready");
      expect(result.current.headingDegrees).toBe(360 - alpha);
      act(() => dispatchOrientation({}));
      expect(result.current.status).toBe("ready");
    }
  });

  it("does not let repeated invalid samples keep an old heading alive and recovers unsmoothed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    installDeviceOrientationEvent();
    const { result } = renderHook(() => useCompass());
    act(() => dispatchOrientation({ alpha: 90, absolute: true }));
    for (let seconds = 1; seconds <= 10; seconds++) {
      act(() => {
        vi.advanceTimersByTime(1000);
        dispatchOrientation({ alpha: 90, absolute: false });
      });
      expect(result.current.status).toBe(seconds < 10 ? "ready" : "unavailable");
    }
    expect(result.current.headingDegrees).toBeNull();
    act(() => dispatchOrientation({ alpha: 180, absolute: true }));
    expect(result.current.status).toBe("ready");
    expect(result.current.headingDegrees).toBe(180);
  });

  it("waits through invalid startup events and expires without a valid sample", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    installDeviceOrientationEvent();
    const { result } = renderHook(() => useCompass());
    act(() => dispatchOrientation({}));
    expect(result.current.status).toBe("listening");
    expect(result.current.headingDegrees).toBeNull();
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.status).toBe("unavailable");
  });

  it("expires stopped readings, handles sensors that never emit, and recovers", () => {
    vi.useFakeTimers();
    let clock = NOW;
    const now = () => clock;
    installDeviceOrientationEvent();
    const { result } = renderHook(() => useCompass({ now }));
    clock += 11_000;
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.status).toBe("unavailable");
    act(() => dispatchOrientation({ alpha: 90, absolute: true }));
    expect(result.current.status).toBe("ready");
    clock += 11_000;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current.headingDegrees).toBeNull();
    act(() => dispatchOrientation({ alpha: 0, absolute: true }));
    expect(result.current.headingDegrees).toBe(0);
  });
});

function installDeviceOrientationEvent(mock: OrientationConstructorMock = {}): void {
  function DeviceOrientationEventMock() {
    return undefined;
  }

  Object.assign(DeviceOrientationEventMock, mock);

  Object.defineProperty(window, "DeviceOrientationEvent", {
    configurable: true,
    value: DeviceOrientationEventMock,
  });
}

function unsetDeviceOrientationEvent(): void {
  Reflect.deleteProperty(window, "DeviceOrientationEvent");
}

function dispatchOrientation(reading: {
  absolute?: boolean;
  alpha?: number;
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}, eventType = "deviceorientation"): void {
  const event = new Event(eventType);

  Object.defineProperties(event, {
    absolute: { value: reading.absolute ?? false },
    alpha: {
      configurable: true,
      value: reading.alpha ?? null,
    },
    webkitCompassAccuracy: {
      configurable: true,
      value: reading.webkitCompassAccuracy,
    },
    webkitCompassHeading: {
      configurable: true,
      value: reading.webkitCompassHeading,
    },
  });

  window.dispatchEvent(event);
}
