import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type WebManifest = {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: string;
  display_override: string[];
  background_color: string;
  theme_color: string;
  lang: string;
  dir: string;
  categories: string[];
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose: string;
  }>;
};

const manifest = JSON.parse(
  readFileSync(resolve(process.cwd(), "public/manifest.webmanifest"), "utf8"),
) as WebManifest;

describe("web app manifest install metadata", () => {
  it("declares a Romanian standalone app within its deployed scope", () => {
    expect(manifest.name).toBe("Adapost Urgenta Romania");
    expect(manifest.short_name).toBe("Adaposturi");
    expect(manifest.lang).toBe("ro");
    expect(manifest.dir).toBe("ltr");
    expect(manifest.start_url).toBe(".");
    expect(manifest.scope).toBe(".");
    expect(manifest.display).toBe("standalone");
    expect(manifest.display_override).toEqual(["standalone", "minimal-ui", "browser"]);
  });

  it("keeps install icon and theme metadata local", () => {
    expect(manifest.background_color).toBe("#050505");
    expect(manifest.theme_color).toBe("#050505");
    expect(manifest.categories).toEqual(["navigation", "utilities"]);
    expect(manifest.icons).toContainEqual({
      src: "icons/app-icon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any maskable",
    });
  });
});
