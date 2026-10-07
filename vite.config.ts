import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/Shelter/",
  plugins: [react(), {
    name: "version-offline-release",
    apply: "build",
    writeBundle(output, bundle) {
      const template = readFileSync(resolve("public/sw.js"), "utf8");
      const releaseFiles: Record<string, string> = {};
      for (const name of ["manifest.webmanifest", "icons/app-icon.svg"]) {
        releaseFiles[name] = createHash("sha256").update(readFileSync(resolve("public", name))).digest("hex");
      }
      const hash = createHash("sha256").update(template).update(readFileSync(resolve("public/manifest.webmanifest")));
      hash.update(readFileSync(resolve("public/icons/app-icon.svg")));
      for (const name of Object.keys(bundle).sort()) {
        const asset = bundle[name];
        const content = asset.type === "chunk" ? asset.code : asset.source;
        hash.update(name).update(content);
        releaseFiles[name] = createHash("sha256").update(content).digest("hex");
      }
      writeFileSync(resolve(output.dir ?? "dist", "sw.js"), template
        .replace("__BUILD_ID__", hash.digest("hex").slice(0, 16))
        .replace("__RELEASE_FILES__", JSON.stringify(releaseFiles)));
    },
  }],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
