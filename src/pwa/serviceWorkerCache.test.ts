// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { createHash, webcrypto } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(resolve("public/sw.js"), "utf8");
const origin = "https://example.test";
type CacheEntry = { response: Response; requestHeaders: Headers };
type CacheStore = Map<string, Map<string, CacheEntry>>;

function worker(version: string, stores: CacheStore = new Map(), base = "/Shelter/") {
  const handlers: Record<string, (event: any) => void> = {};
  const html = `<script src="${base}assets/app-${version}.js"></script><link href="${base}assets/app-${version}.css">`;
  const releaseFiles = Object.fromEntries(["index.html", "manifest.webmanifest", "icons/app-icon.svg", `assets/app-${version}.js`, `assets/app-${version}.css`]
    .map((name) => [name, createHash("sha256").update(name === "index.html" ? html : "asset-" + version).digest("hex")]));
  const network = vi.fn(async (input: string | Request) => {
    const path = typeof input === "string" ? input : new URL(input.url).pathname;
    return new Response(path === base + "index.html" ? html : "asset-" + version);
  });
  function key(input: string | Request) {
    return new URL(typeof input === "string" ? input : input.url, origin).href;
  }
  const caches = {
    keys: async () => [...stores.keys()],
    delete: vi.fn(async (name: string) => stores.delete(name)),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name)!;
      return {
        put: async (input: string | Request, response: Response) => {
          entries.set(key(input), { response: response.clone(), requestHeaders: typeof input === "string" ? new Headers() : input.headers });
        },
        match: async (input: string | Request, options?: CacheQueryOptions) => {
          const entry = entries.get(key(input));
          if (!entry) return undefined;
          const queryHeaders = typeof input === "string" ? new Headers() : input.headers;
          const vary = entry.response.headers.get("Vary")?.split(",").map((header) => header.trim()) ?? [];
          if (!options?.ignoreVary && vary.some((header) => header === "*" || queryHeaders.get(header) !== entry.requestHeaders.get(header))) return undefined;
          return entry.response.clone();
        },
        addAll: async (urls: string[]) => {
          const responses = await Promise.all(urls.map((url) => network(url)));
          if (responses.some((r) => !r.ok)) throw new Error("Download failed");
          urls.forEach((url, i) => entries.set(key(url), { response: responses[i].clone(), requestHeaders: new Headers() }));
        },
      };
    },
  };
  const skipWaiting = vi.fn();
  const claim = vi.fn();
  const context = createContext({
    URL, Response, Set, Promise, crypto: webcrypto, Uint8Array, fetch: network, caches,
    self: {
      registration: { scope: origin + base }, location: { origin },
      clients: { claim }, skipWaiting,
      addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; },
    },
  });
  runInContext(source.replace("__BUILD_ID__", version).replace("__RELEASE_FILES__", JSON.stringify(releaseFiles)), context);
  const cacheName = `adapost-urgenta-romania-${encodeURIComponent(base)}-${version}`;
  async function event(name: string, data: Record<string, unknown> = {}) {
    let work: Promise<unknown> | undefined;
    let response: Promise<Response> | undefined;
    handlers[name]({
      ...data,
      waitUntil: (value: Promise<unknown>) => { work = value; },
      respondWith: (value: Promise<Response>) => { response = value; },
    });
    if (work) await work;
    return response ? await response : undefined;
  }
  async function ready() {
    const postMessage = vi.fn();
    await event("message", { data: { type: "OFFLINE_STATUS" }, ports: [{ postMessage }] });
    return postMessage.mock.calls[0][0].ready;
  }
  return { stores, network, caches, cacheName, event, ready, skipWaiting, claim };
}

describe("service worker release cache behavior", () => {
  it.each(["/", "/Shelter/"])("repairs partial and complete cache loss without activating an update at %s", async (base) => {
    const w = worker("one", undefined, base);
    await w.event("install");
    const entries = w.stores.get(w.cacheName)!;
    entries.delete(origin + base + "manifest.webmanifest");
    expect(await w.ready()).toBe(false);
    await w.event("message", { data: { type: "PREPARE_OFFLINE" }, ports: [{ postMessage: vi.fn() }] });
    expect(await w.ready()).toBe(true);
    w.stores.delete(w.cacheName);
    await w.event("message", { data: { type: "PREPARE_OFFLINE" }, ports: [{ postMessage: vi.fn() }] });
    expect(await w.ready()).toBe(true);
    expect(w.skipWaiting).not.toHaveBeenCalled();
    w.network.mockRejectedValue(new Error("offline"));
    expect(await (await w.event("fetch", { request: { url: origin + base, method: "GET", mode: "navigate" } }))?.text()).toContain("app-one.js");
  });

  it.each(["offline", "wrong release", "http error"])("preserves retained files when cache repair fails: %s", async (failure) => {
    const w = worker("one");
    await w.event("install");
    const entries = w.stores.get(w.cacheName)!;
    entries.delete(origin + "/Shelter/manifest.webmanifest");
    if (failure === "offline") w.network.mockRejectedValue(new Error("offline"));
    else w.network.mockResolvedValue(new Response("wrong release", { status: failure === "http error" ? 503 : 200 }));
    const postMessage = vi.fn();
    await w.event("message", { data: { type: "PREPARE_OFFLINE" }, ports: [{ postMessage }] });
    expect(postMessage).toHaveBeenCalledWith({ ready: false, version: "one" });
    expect(entries.has(origin + "/Shelter/index.html")).toBe(true);
    expect(entries.has(origin + "/Shelter/assets/app-one.js")).toBe(true);
    expect(entries.has(origin + "/Shelter/manifest.webmanifest")).toBe(false);
    expect(w.caches.delete).not.toHaveBeenCalled();
  });

  it("rejects a newer shell during full cache-loss recovery", async () => {
    const w = worker("one");
    w.network.mockResolvedValue(new Response('<script src="/Shelter/assets/app-two.js"></script>'));
    await w.event("message", { data: { type: "PREPARE_OFFLINE" }, ports: [{ postMessage: vi.fn() }] });
    expect(await w.ready()).toBe(false);
    expect(w.stores.get(w.cacheName)?.size).toBe(0);
  });

  it.each(["/", "/Shelter/"])("preserves offline release A through interrupted B preparation and retry at %s", async (base) => {
    const old = worker("old", undefined, base);
    await old.event("install");
    const update = worker("new", old.stores, base);
    const download = update.network.getMockImplementation()!;
    let interrupt!: (error: Error) => void;
    const pendingAsset = new Promise<Response>((_resolve, reject) => { interrupt = reject; });
    update.network.mockImplementation((input) =>
      input === base + "assets/app-new.css" ? pendingAsset : download(input));
    const installation = update.event("install");
    const rejected = expect(installation).rejects.toThrow("connection interrupted");
    await vi.waitFor(() => expect(update.network).toHaveBeenCalledWith(base + "assets/app-new.css"));
    expect(update.stores.get(update.cacheName)?.has(origin + base + "index.html")).toBe(false);
    expect(await update.ready()).toBe(false);
    await update.event("message", { data: { type: "APPLY_UPDATE" } });
    expect(update.skipWaiting).not.toHaveBeenCalled();

    old.network.mockRejectedValue(new Error("offline"));
    expect(await (await old.event("fetch", {
      request: { url: origin + base, method: "GET", mode: "navigate" },
    }))?.text()).toContain("app-old.js");
    expect(await (await old.event("fetch", {
      request: new Request(origin + base + "assets/app-old.js"),
    }))?.text()).toBe("asset-old");
    interrupt(new Error("connection interrupted"));
    await rejected;
    expect(update.stores.has(update.cacheName)).toBe(false);
    expect(await old.ready()).toBe(true);

    update.network.mockImplementation(download);
    await update.event("install");
    expect(await update.ready()).toBe(true);
    expect(update.stores.has(old.cacheName)).toBe(true);
    expect(update.skipWaiting).not.toHaveBeenCalled();
    await update.event("message", { data: { type: "APPLY_UPDATE" } });
    await update.event("activate");
    expect(update.stores.has(old.cacheName)).toBe(false);
    update.network.mockRejectedValue(new Error("offline"));
    expect(await (await update.event("fetch", {
      request: { url: origin + base, method: "GET", mode: "navigate" },
    }))?.text()).toContain("app-new.js");
    expect(await (await update.event("fetch", {
      request: new Request(origin + base + "assets/app-new.js"),
    }))?.text()).toBe("asset-new");
  });

  it.each(["/", "/Shelter/"])("does not claim first-load readiness during interruption and recovers on retry at %s", async (base) => {
    const first = worker("first", undefined, base);
    const download = first.network.getMockImplementation()!;
    let interrupt!: (error: Error) => void;
    const pendingAsset = new Promise<Response>((_resolve, reject) => { interrupt = reject; });
    first.network.mockImplementation((input) =>
      input === base + "assets/app-first.js" ? pendingAsset : download(input));
    const installation = first.event("install");
    const rejected = expect(installation).rejects.toThrow("first download interrupted");
    await vi.waitFor(() => expect(first.network).toHaveBeenCalledWith(base + "assets/app-first.js"));
    expect(await first.ready()).toBe(false);
    expect(first.stores.get(first.cacheName)?.has(origin + base + "index.html")).toBe(false);
    interrupt(new Error("first download interrupted"));
    await rejected;
    expect(first.stores.has(first.cacheName)).toBe(false);
    expect(await first.ready()).toBe(false);
    first.network.mockImplementation(download);
    await first.event("install");
    expect(await first.ready()).toBe(true);
    first.network.mockRejectedValue(new Error("offline"));
    expect(await (await first.event("fetch", {
      request: { url: origin + base, method: "GET", mode: "navigate" },
    }))?.text()).toContain("app-first.js");
    expect(await (await first.event("fetch", {
      request: new Request(origin + base + "assets/app-first.js"),
    }))?.text()).toBe("asset-first");
  });

  it.each(["/", "/Shelter/"])("installs and serves the complete shell and assets offline at %s", async (base) => {
    const w = worker("one", undefined, base);
    expect(await w.ready()).toBe(false);
    await w.event("install");
    expect(await w.ready()).toBe(true);
    expect(w.skipWaiting).not.toHaveBeenCalled();
    w.network.mockRejectedValue(new Error("offline"));
    const shell = await w.event("fetch", { request: { url: origin + base, method: "GET", mode: "navigate" } });
    expect(await shell?.text()).toContain("app-one.js");
    const asset = await w.event("fetch", { request: new Request(origin + base + "assets/app-one.js") });
    expect(await asset?.text()).toBe("asset-one");
    const missing = await w.event("fetch", { request: new Request(origin + base + "assets/missing.js") });
    expect(missing?.status).toBe(504);
  });

  it("keeps the previous release during a failed precache and removes incomplete new caches", async () => {
    const old = worker("old");
    await old.event("install");
    const update = worker("new", old.stores);
    update.network.mockImplementation(async (input) =>
      new Response(typeof input === "string" && input.endsWith("index.html") ?
        '<script src="/Shelter/assets/new.js"></script>' : "failed", { status: typeof input === "string" && input.endsWith("index.html") ? 200 : 503 }));
    await expect(update.event("install")).rejects.toThrow();
    expect(old.stores.has(update.cacheName)).toBe(false);
    expect(await old.ready()).toBe(true);
  });

  it("serves immutable precached modules despite Origin variation from a static host", async () => {
    const w = worker("one");
    w.network.mockImplementation(async (input) => new Response(
      typeof input === "string" && input.endsWith("index.html") ?
        '<script src="/Shelter/assets/app-one.js"></script>' : "asset-one",
      { headers: { Vary: "Origin" } },
    ));
    await w.event("install");
    expect(await w.ready()).toBe(true);
    const request = new Request(origin + "/Shelter/assets/app-one.js", { headers: { Origin: origin } });
    const cache = await w.caches.open(w.cacheName);
    expect(await cache.match(request)).toBeUndefined();
    w.network.mockRejectedValue(new Error("offline"));
    const asset = await w.event("fetch", { request });
    expect(asset?.status).toBe(200);
    expect(await asset?.text()).toBe("asset-one");
    expect(w.network).toHaveBeenCalledTimes(4);
  });

  it("waits for explicit update approval and deletes only obsolete caches owned by its scope", async () => {
    const old = worker("old");
    await old.event("install");
    old.stores.set("another-app", new Map());
    const sibling = worker("one", old.stores, "/Other/");
    await sibling.event("install");
    const update = worker("new", old.stores);
    await update.event("install");
    expect(old.stores.has(old.cacheName)).toBe(true);
    expect(update.skipWaiting).not.toHaveBeenCalled();
    await update.event("message", { data: { type: "APPLY_UPDATE" } });
    expect(update.skipWaiting).toHaveBeenCalledTimes(1);
    await update.event("activate");
    expect(old.stores.has(old.cacheName)).toBe(false);
    expect(old.stores.has("another-app")).toBe(true);
    expect(old.stores.has(sibling.cacheName)).toBe(true);
    expect(await update.ready()).toBe(true);
  });

  it("pins navigation to its release even when a newer shell exists on the network", async () => {
    const w = worker("old");
    await w.event("install");
    w.network.mockResolvedValue(new Response('<script src="/Shelter/assets/new.js"></script>'));
    const response = await w.event("fetch", { request: { url: origin + "/Shelter/", mode: "navigate", method: "GET" } });
    expect(await response?.text()).toContain("app-old.js");
    expect(await w.event("fetch", { request: new Request(origin + "/Other/asset.js") })).toBeUndefined();
  });

  it("reports lost assets as not ready and refuses an incomplete update", async () => {
    const w = worker("one");
    await w.event("install");
    w.stores.get(w.cacheName)!.delete(origin + "/Shelter/assets/app-one.js");
    expect(await w.ready()).toBe(false);
    await w.event("message", { data: { type: "APPLY_UPDATE" } });
    expect(w.skipWaiting).not.toHaveBeenCalled();
  });
});
