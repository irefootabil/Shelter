import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyOfflineUpdate, checkWorkerReady, registerServiceWorker, useOfflineStatus } from "./registerServiceWorker";

class TestChannel {
  port1 = { onmessage: null as ((event: { data: unknown }) => void) | null, close: vi.fn() };
  port2 = { reply: (data: unknown) => queueMicrotask(() => this.port1.onmessage?.({ data })) };
}

function worker(ready: boolean): ServiceWorker {
  return { postMessage: vi.fn((_message, ports) => ports?.[0].reply({ ready })) } as unknown as ServiceWorker;
}

describe("offline readiness", () => {
  beforeEach(() => {
    vi.stubGlobal("MessageChannel", TestChannel);
    vi.stubEnv("PROD", true);
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");
  });

  afterEach(() => {
    vi.stubEnv("PROD", false);
    act(() => registerServiceWorker());
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  function install(active: ServiceWorker | null, waiting: ServiceWorker | null = null, error = false) {
    const registration = Object.assign(new EventTarget(), { active, waiting, installing: null, update: vi.fn().mockResolvedValue(undefined) });
    const container = Object.assign(new EventTarget(), {
      controller: active,
      register: error ? vi.fn().mockRejectedValue(new Error("registration failed")) : vi.fn().mockResolvedValue(registration),
    });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: container });
    return registration;
  }

  it("reports ready only after the active worker confirms its cache", async () => {
    install(worker(true));
    const { result } = renderHook(useOfflineStatus);
    act(() => registerServiceWorker());
    expect(result.current).toBe("preparing");
    await waitFor(() => expect(result.current).toBe("ready"));
  });

  it.each(["incomplete", "registration"])("reports failed for %s failures", async (failure) => {
    install(worker(false), null, failure === "registration");
    const { result } = renderHook(useOfflineStatus);
    act(() => registerServiceWorker());
    await waitFor(() => expect(result.current).toBe("failed"));
  });

  it("offers only a verified waiting release and applies it on request", async () => {
    const waiting = worker(true);
    install(worker(true), waiting);
    const { result } = renderHook(useOfflineStatus);
    act(() => registerServiceWorker());
    await waitFor(() => expect(result.current).toBe("update-available"));
    expect(waiting.postMessage).not.toHaveBeenCalledWith({ type: "APPLY_UPDATE" });
    act(() => applyOfflineUpdate());
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "APPLY_UPDATE" });
  });

  it("keeps the old release ready when the waiting release is incomplete", async () => {
    install(worker(true), worker(false));
    const { result } = renderHook(useOfflineStatus);
    act(() => registerServiceWorker());
    await waitFor(() => expect(result.current).toBe("ready"));
  });

  it("times out unresponsive workers without claiming readiness", async () => {
    vi.useFakeTimers();
    const result = checkWorkerReady({ postMessage: vi.fn() } as unknown as ServiceWorker);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(result).resolves.toBe(false);
    await expect(checkWorkerReady({ postMessage: () => { throw new Error("unavailable"); } } as unknown as ServiceWorker)).resolves.toBe(false);
  });
});
