import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const serviceWorkerSource = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");

describe("service worker offline cache contract", () => {
  it("uses versioned app shell and runtime caches", () => {
    expect(serviceWorkerSource).toContain('const CACHE_VERSION = "v1";');
    expect(serviceWorkerSource).toContain("adapost-urgenta-romania-app-shell-${CACHE_VERSION}");
    expect(serviceWorkerSource).toContain("adapost-urgenta-romania-runtime-${CACHE_VERSION}");
  });

  it("precaches the core local PWA assets", () => {
    expect(serviceWorkerSource).toContain('const APP_SHELL_URL = "/index.html";');
    expect(serviceWorkerSource).toContain('"/manifest.webmanifest"');
    expect(serviceWorkerSource).toContain('"/icons/app-icon.svg"');
  });

  it("discovers Vite build assets from the app shell", () => {
    expect(serviceWorkerSource).toContain("function getBuildAssetUrls");
    expect(serviceWorkerSource).toContain('assetUrl.pathname.startsWith("/assets/")');
    expect(serviceWorkerSource).toContain("cache.addAll([...CORE_ASSETS");
  });

  it("falls back to the cached shell for navigations and returns a clear offline miss", () => {
    expect(serviceWorkerSource).toContain("function isNavigationRequest");
    expect(serviceWorkerSource).toContain("handleNavigationRequest(event.request)");
    expect(serviceWorkerSource).toContain("caches.match(APP_SHELL_URL)");
    expect(serviceWorkerSource).toContain("Requested asset is not available in the offline cache.");
    expect(serviceWorkerSource).toContain("status: 504");
  });
});
