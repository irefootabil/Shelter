import { useSyncExternalStore } from "react";

export type OfflineStatus = "preparing" | "ready" | "failed" | "unavailable" | "update-available";
let status: OfflineStatus = "unavailable";
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | null = null;

function setStatus(next: OfflineStatus): void {
  status = next;
  listeners.forEach((listener) => listener());
}

export function useOfflineStatus(): OfflineStatus {
  return useSyncExternalStore((listener) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, () => status, () => "unavailable");
}

export function useNetworkOnline(): boolean {
  return useSyncExternalStore((listener) => {
    window.addEventListener("online", listener);
    window.addEventListener("offline", listener);
    return () => {
      window.removeEventListener("online", listener);
      window.removeEventListener("offline", listener);
    };
  }, () => navigator.onLine, () => false);
}

export function applyOfflineUpdate(): void {
  registration?.waiting?.postMessage({ type: "APPLY_UPDATE" });
}

export async function checkWorkerReady(worker: ServiceWorker): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (ready: boolean) => {
      window.clearTimeout(timer);
      channel.port1.close();
      resolve(ready);
    };
    const timer = window.setTimeout(() => finish(false), 5000);
    channel.port1.onmessage = (event) => finish(event.data?.ready === true);
    try {
      worker.postMessage({ type: "OFFLINE_STATUS" }, [channel.port2]);
    } catch {
      finish(false);
    }
  });
}

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) {
    setStatus("unavailable");
    return;
  }
  setStatus("preparing");
  let hadController = navigator.serviceWorker.controller !== null;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) window.location.reload();
    hadController = true;
  });

  async function start(): Promise<void> {
    try {
      registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: "none",
      });
      const current = registration;
      let refreshSequence = 0;
      async function refresh(): Promise<void> {
        const sequence = ++refreshSequence;
        if (current.waiting && await checkWorkerReady(current.waiting)) {
          if (sequence === refreshSequence) setStatus("update-available");
          return;
        }
        const worker = current.active;
        const ready = worker !== null && await checkWorkerReady(worker);
        if (sequence === refreshSequence) setStatus(ready ? "ready" : "failed");
      }
      function watchInstalling(): void {
        const worker = current.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "activated" || worker.state === "installed" || worker.state === "redundant") {
            if (worker.state !== "installed" || current.active) void refresh();
          }
        });
      }
      current.addEventListener("updatefound", watchInstalling);
      watchInstalling();
      if (current.active) await refresh();
      else if (!current.installing) setStatus("failed");
      window.addEventListener("online", () => { void current.update().catch(() => undefined); void refresh(); });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") { void current.update().catch(() => undefined); void refresh(); }
      });
    } catch {
      setStatus("failed");
    }
  }
  if (document.readyState === "complete") void start();
  else window.addEventListener("load", () => void start(), { once: true });
}
