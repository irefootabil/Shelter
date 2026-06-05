import { describe, expect, it } from "vitest";
import {
  emergencyContent,
  emergencyInstructionGroups,
  emergencyNumbers,
  emergencySources,
} from "./emergencyContent";

describe("emergencyContent", () => {
  it("exports the required emergency phone numbers", () => {
    expect(emergencyNumbers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "single-emergency-number",
          number: "112",
          label: expect.stringContaining("urgente"),
        }),
        expect.objectContaining({
          id: "emergency-sms",
          number: "113",
          label: expect.stringContaining("SMS"),
        }),
      ]),
    );
  });

  it("keeps all emergency numbers actionable", () => {
    for (const number of emergencyNumbers) {
      expect(number.number).toMatch(/^\d{3}$/);
      expect(number.description.length).toBeGreaterThan(40);
      expect(number.availability.length).toBeGreaterThan(10);
      expect(number.action.length).toBeGreaterThan(30);
    }
  });

  it("includes the key offline instruction groups", () => {
    expect(emergencyInstructionGroups.map((group) => group.id)).toEqual([
      "first-actions",
      "earthquake",
      "go-to-shelter",
      "inside-shelter",
      "official-updates",
    ]);

    for (const group of emergencyInstructionGroups) {
      expect(group.title).not.toHaveLength(0);
      expect(group.summary).not.toHaveLength(0);
      expect(group.items.length).toBeGreaterThanOrEqual(3);
      expect(group.items.every((item) => item.length > 20)).toBe(true);
    }
  });

  it("keeps the bundled content tied to official-source caveats", () => {
    expect(emergencyContent.disclaimer).toContain("112");
    expect(emergencyContent.disclaimer).toContain("autoritatilor");
    expect(emergencyContent.intro).toContain("offline");
    expect(emergencyContent.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(emergencyContent.numbers).toBe(emergencyNumbers);
    expect(emergencyContent.instructionGroups).toBe(emergencyInstructionGroups);
    expect(emergencyContent.sources).toBe(emergencySources);
    expect(emergencySources.map((source) => source.url)).toEqual([
      "https://fiipregatit.ro/",
      "https://localizare.112.ro/privacy-policy/ro",
    ]);
  });
});
