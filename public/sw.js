const CACHE_VERSION = "__BUILD_ID__";
const APP_BASE_URL = new URL(self.registration.scope).pathname;
const CACHE_PREFIX = `adapost-urgenta-romania-${encodeURIComponent(APP_BASE_URL)}-`;
const APP_SHELL_CACHE = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_SHELL_URL = `${APP_BASE_URL}index.html`;
const APP_ASSETS_URL = `${APP_BASE_URL}assets/`;
const CORE_ASSETS = [APP_SHELL_URL, `${APP_BASE_URL}manifest.webmanifest`, `${APP_BASE_URL}icons/app-icon.svg`];

self.addEventListener("install", (event) => event.waitUntil(precacheAppShell()));
self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "APPLY_UPDATE") {
    event.waitUntil(isOfflineReady().then((ready) => ready ? self.skipWaiting() : undefined));
  }
  if (event.data?.type === "OFFLINE_STATUS") {
    event.waitUntil(isOfflineReady().then((ready) => {
      event.ports[0]?.postMessage({ ready, version: CACHE_VERSION });
    }).catch(() => event.ports[0]?.postMessage({ ready: false })));
  }
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(APP_BASE_URL)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(caches.open(APP_SHELL_CACHE).then(async (cache) =>
      await cache.match(APP_SHELL_URL) ?? fetch(event.request)));
  } else if (url.pathname.startsWith(APP_ASSETS_URL) || CORE_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(APP_SHELL_CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      return fetch(event.request).catch(() => new Response("Asset unavailable offline.", { status: 504 }));
    }));
  }
});

async function precacheAppShell() {
  try {
    const response = await fetch(APP_SHELL_URL, { cache: "reload" });
    if (!response.ok) throw new Error("App shell could not be downloaded.");
    const urls = getBuildAssetUrls(await response.clone().text());
    if (urls.length === 0) throw new Error("App shell contains no build assets.");
    const cache = await caches.open(APP_SHELL_CACHE);
    await cache.addAll([...CORE_ASSETS.filter((url) => url !== APP_SHELL_URL), ...urls]);
    // Publish the shell only after every required asset has been cached.
    await cache.put(APP_SHELL_URL, response);
  } catch (error) {
    await caches.delete(APP_SHELL_CACHE);
    throw error;
  }
}

function getBuildAssetUrls(html) {
  const urls = new Set();
  for (const [, reference] of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    const url = new URL(reference, new URL(APP_SHELL_URL, self.location.origin));
    if (url.origin === self.location.origin && url.pathname.startsWith(APP_ASSETS_URL)) {
      urls.add(`${url.pathname}${url.search}`);
    }
  }
  return [...urls];
}

async function isOfflineReady() {
  const cache = await caches.open(APP_SHELL_CACHE);
  const shell = await cache.match(APP_SHELL_URL);
  if (!shell) return false;
  const assets = getBuildAssetUrls(await shell.text());
  if (assets.length === 0) return false;
  const entries = await Promise.all([...CORE_ASSETS, ...assets].map((url) => cache.match(url)));
  return entries.every((entry) => entry?.ok);
}

async function deleteOldCaches() {
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== APP_SHELL_CACHE)
    .map((name) => caches.delete(name)));
}
