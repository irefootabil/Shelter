const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `adapost-urgenta-romania-app-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `adapost-urgenta-romania-runtime-${CACHE_VERSION}`;
const APP_BASE_URL = new URL(self.registration.scope).pathname;
const APP_SHELL_URL = `${APP_BASE_URL}index.html`;
const APP_ASSETS_URL = `${APP_BASE_URL}assets/`;
const CORE_ASSETS = [APP_BASE_URL, APP_SHELL_URL, `${APP_BASE_URL}manifest.webmanifest`, `${APP_BASE_URL}icons/app-icon.svg`];
const CACHEABLE_DESTINATIONS = new Set(["document", "font", "image", "manifest", "script", "style", "worker"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    precacheAppShell().then(() => {
      self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    deleteOldCaches().then(() => {
      self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (isNavigationRequest(event.request)) {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }

  if (isSameOriginCacheableRequest(event.request)) {
    event.respondWith(handleCacheFirstRequest(event.request));
    return;
  }

  event.respondWith(fetch(event.request));
});

async function precacheAppShell() {
  const cache = await caches.open(APP_SHELL_CACHE);
  const appShellResponse = await fetch(APP_SHELL_URL, { cache: "reload" });

  if (!appShellResponse.ok) {
    throw new Error(`App shell precache failed with status ${appShellResponse.status}.`);
  }

  const appShellHtml = await appShellResponse.clone().text();
  const buildAssetUrls = getBuildAssetUrls(appShellHtml);

  await cache.put(APP_SHELL_URL, appShellResponse.clone());
  await cache.put(APP_BASE_URL, appShellResponse.clone());
  await cache.addAll([...CORE_ASSETS.filter((url) => url !== APP_BASE_URL && url !== APP_SHELL_URL), ...buildAssetUrls]);
}

function getBuildAssetUrls(appShellHtml) {
  const assetUrls = new Set();
  const assetReferences = appShellHtml.matchAll(/\b(?:href|src)=["']([^"']+)["']/g);

  for (const [, assetReference] of assetReferences) {
    const assetUrl = new URL(assetReference, self.location.origin);

    if (assetUrl.origin === self.location.origin && assetUrl.pathname.startsWith(APP_ASSETS_URL)) {
      assetUrls.add(`${assetUrl.pathname}${assetUrl.search}`);
    }
  }

  return [...assetUrls];
}

async function deleteOldCaches() {
  const expectedCaches = new Set([APP_SHELL_CACHE, RUNTIME_CACHE]);
  const cacheNames = await caches.keys();

  await Promise.all(cacheNames.filter((cacheName) => !expectedCaches.has(cacheName)).map((cacheName) => caches.delete(cacheName)));
}

function isNavigationRequest(request) {
  return request.mode === "navigate" || request.destination === "document";
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      await cache.put(APP_SHELL_URL, response.clone());
      await cache.put(APP_BASE_URL, response.clone());
    }

    return response;
  } catch {
    const cachedAppShell = await caches.match(APP_SHELL_URL);
    return cachedAppShell ?? createOfflineResponse("App shell is not available in the offline cache.");
  }
}

function isSameOriginCacheableRequest(request) {
  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return false;
  }

  return requestUrl.pathname.startsWith(APP_ASSETS_URL) || CACHEABLE_DESTINATIONS.has(request.destination);
}

async function handleCacheFirstRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return createOfflineResponse("Requested asset is not available in the offline cache.");
  }
}

function createOfflineResponse(message) {
  return new Response(message, {
    status: 504,
    statusText: "Gateway Timeout",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
