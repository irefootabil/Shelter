import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCardinalDirection, type CardinalDirection } from "../lib/geo";

export type CompassStatus =
  | "idle"
  | "listening"
  | "ready"
  | "permission-required"
  | "denied"
  | "unavailable"
  | "error";

export type CompassPermissionState = "granted" | "denied" | "prompt" | "unsupported";

export type CompassCalibrationState = "unknown" | "good" | "needs-calibration";

export type CompassSnapshot = {
  headingDegrees: number;
  cardinalDirection: CardinalDirection;
  accuracyDegrees: number | null;
  calibrationState: CompassCalibrationState;
  timestamp: number;
};

export type UseCompassOptions = {
  enabled?: boolean;
  smoothingAlpha?: number;
  calibrationAccuracyThresholdDegrees?: number;
  now?: () => number;
};

export type UseCompassResult = {
  status: CompassStatus;
  permissionState: CompassPermissionState;
  headingDegrees: number | null;
  cardinalDirection: CardinalDirection | null;
  accuracyDegrees: number | null;
  calibrationState: CompassCalibrationState;
  snapshot: CompassSnapshot | null;
  errorMessage: string | null;
  canRequestPermission: boolean;
  requestPermission: () => Promise<CompassPermissionState>;
};

type DeviceOrientationPermissionResult = "granted" | "denied";

type DeviceOrientationConstructorWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<DeviceOrientationPermissionResult>;
};

type CompassOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

const DEFAULT_SMOOTHING_ALPHA = 0.25;
const DEFAULT_CALIBRATION_ACCURACY_THRESHOLD_DEGREES = 20;

export function useCompass(options: UseCompassOptions = {}): UseCompassResult {
  const {
    enabled = true,
    smoothingAlpha = DEFAULT_SMOOTHING_ALPHA,
    calibrationAccuracyThresholdDegrees = DEFAULT_CALIBRATION_ACCURACY_THRESHOLD_DEGREES,
    now = Date.now,
  } = options;
  const normalizedSmoothingAlpha = clampSmoothingAlpha(smoothingAlpha);
  const supportsOrientation = canUseDeviceOrientation();
  const canRequestPermission = supportsOrientation && hasDeviceOrientationPermissionRequest();
  const [permissionState, setPermissionState] = useState<CompassPermissionState>(() =>
    canRequestPermission ? "prompt" : supportsOrientation ? "granted" : "unsupported",
  );
  const [status, setStatus] = useState<CompassStatus>(() =>
    getInitialCompassStatus(enabled, supportsOrientation, canRequestPermission),
  );
  const [snapshot, setSnapshot] = useState<CompassSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previousHeadingRef = useRef<number | null>(null);

  useEffect(() => {
    previousHeadingRef.current = null;
    setSnapshot(null);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    if (!supportsOrientation) {
      setPermissionState("unsupported");
      setStatus("unavailable");
      return;
    }

    if (permissionState === "denied") {
      setStatus("denied");
      return;
    }

    if (canRequestPermission && permissionState !== "granted") {
      setStatus("permission-required");
      return;
    }

    setStatus("listening");
    setErrorMessage(null);

    function handleOrientation(event: DeviceOrientationEvent): void {
      const reading = getCompassReading(event as CompassOrientationEvent, calibrationAccuracyThresholdDegrees);

      if (reading === null) {
        setStatus("error");
        setErrorMessage("Device orientation event did not include a usable heading.");
        return;
      }

      const previousHeading = previousHeadingRef.current;
      const headingDegrees =
        previousHeading === null
          ? reading.headingDegrees
          : smoothHeadingDegrees(previousHeading, reading.headingDegrees, normalizedSmoothingAlpha);
      const nextSnapshot: CompassSnapshot = {
        headingDegrees,
        cardinalDirection: getCardinalDirection(headingDegrees),
        accuracyDegrees: reading.accuracyDegrees,
        calibrationState: reading.calibrationState,
        timestamp: now(),
      };

      previousHeadingRef.current = headingDegrees;
      setSnapshot(nextSnapshot);
      setStatus("ready");
      setErrorMessage(null);
    }

    window.addEventListener("deviceorientation", handleOrientation);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [
    calibrationAccuracyThresholdDegrees,
    canRequestPermission,
    enabled,
    normalizedSmoothingAlpha,
    now,
    permissionState,
    supportsOrientation,
  ]);

  const requestPermission = useCallback(async (): Promise<CompassPermissionState> => {
    if (!enabled) {
      setStatus("idle");
      return permissionState;
    }

    if (!supportsOrientation) {
      setPermissionState("unsupported");
      setStatus("unavailable");
      return "unsupported";
    }

    const OrientationEvent = getDeviceOrientationConstructor();

    if (typeof OrientationEvent?.requestPermission !== "function") {
      setPermissionState("granted");
      setStatus("listening");
      return "granted";
    }

    try {
      const result = await OrientationEvent.requestPermission();
      const nextPermissionState: CompassPermissionState = result === "granted" ? "granted" : "denied";

      setPermissionState(nextPermissionState);
      setStatus(nextPermissionState === "granted" ? "listening" : "denied");
      setErrorMessage(nextPermissionState === "denied" ? "Device orientation permission denied." : null);

      return nextPermissionState;
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Device orientation permission request failed.");

      return permissionState;
    }
  }, [enabled, permissionState, supportsOrientation]);

  const result = useMemo<UseCompassResult>(
    () => ({
      status,
      permissionState,
      headingDegrees: snapshot?.headingDegrees ?? null,
      cardinalDirection: snapshot?.cardinalDirection ?? null,
      accuracyDegrees: snapshot?.accuracyDegrees ?? null,
      calibrationState: snapshot?.calibrationState ?? "unknown",
      snapshot,
      errorMessage,
      canRequestPermission,
      requestPermission,
    }),
    [canRequestPermission, errorMessage, permissionState, requestPermission, snapshot, status],
  );

  return result;
}

function canUseDeviceOrientation(): boolean {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

function hasDeviceOrientationPermissionRequest(): boolean {
  return typeof getDeviceOrientationConstructor()?.requestPermission === "function";
}

function getDeviceOrientationConstructor(): DeviceOrientationConstructorWithPermission | undefined {
  return window.DeviceOrientationEvent as DeviceOrientationConstructorWithPermission | undefined;
}

function getInitialCompassStatus(
  enabled: boolean,
  supportsOrientation: boolean,
  canRequestPermission: boolean,
): CompassStatus {
  if (!enabled) {
    return "idle";
  }

  if (!supportsOrientation) {
    return "unavailable";
  }

  return canRequestPermission ? "permission-required" : "listening";
}

function getCompassReading(
  event: CompassOrientationEvent,
  calibrationAccuracyThresholdDegrees: number,
): Pick<CompassSnapshot, "headingDegrees" | "accuracyDegrees" | "calibrationState"> | null {
  const webkitHeading = normalizeFiniteDegrees(event.webkitCompassHeading);
  const alphaHeading = typeof event.alpha === "number" ? normalizeFiniteDegrees(360 - event.alpha) : null;
  const headingDegrees = webkitHeading ?? alphaHeading;

  if (headingDegrees === null) {
    return null;
  }

  const accuracyDegrees = normalizeAccuracyDegrees(event.webkitCompassAccuracy);

  return {
    headingDegrees,
    accuracyDegrees,
    calibrationState: getCalibrationState(accuracyDegrees, calibrationAccuracyThresholdDegrees),
  };
}

function getCalibrationState(
  accuracyDegrees: number | null,
  calibrationAccuracyThresholdDegrees: number,
): CompassCalibrationState {
  if (accuracyDegrees === null) {
    return "unknown";
  }

  return accuracyDegrees > calibrationAccuracyThresholdDegrees ? "needs-calibration" : "good";
}

function smoothHeadingDegrees(previous: number, next: number, alpha: number): number {
  const delta = ((((next - previous) % 360) + 540) % 360) - 180;

  return normalizeDegrees(previous + delta * alpha);
}

function normalizeFiniteDegrees(degrees: number | undefined): number | null {
  return typeof degrees === "number" && Number.isFinite(degrees) ? normalizeDegrees(degrees) : null;
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function normalizeAccuracyDegrees(accuracy: unknown): number | null {
  return typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null;
}

function clampSmoothingAlpha(alpha: number): number {
  if (!Number.isFinite(alpha)) {
    return DEFAULT_SMOOTHING_ALPHA;
  }

  return Math.min(1, Math.max(0, alpha));
}
