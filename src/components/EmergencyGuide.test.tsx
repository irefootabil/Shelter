import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmergencyGuide } from "./EmergencyGuide";
import { appCopy, emergencyContent } from "../content";

describe("EmergencyGuide", () => {
  it("exposes every bundled group and ordered instruction step", () => {
    const { container } = render(<EmergencyGuide />);
    const groups = container.querySelectorAll("details");
    expect(groups).toHaveLength(emergencyContent.instructionGroups.length);

    emergencyContent.instructionGroups.forEach((group, index) => {
      const disclosure = groups[index];
      expect(within(disclosure).getByText(group.title)).toBeInTheDocument();
      expect(within(disclosure).getByText(group.summary)).toBeInTheDocument();
      const list = disclosure.querySelector("ol")!;
      expect(within(list).getAllByRole("listitem", { hidden: true })).toHaveLength(group.items.length);
      group.items.forEach((item) => expect(within(list).getByText(item)).toBeInTheDocument());
    });
  });

  it("opens the first group by default and supports independent native disclosures", () => {
    const { container, rerender } = render(<EmergencyGuide />);
    const groups = container.querySelectorAll("details");
    expect([...groups].map((group) => group.open)).toEqual([true, false, false, false, false]);
    expect(within(groups[0]).getByText(emergencyContent.instructionGroups[0].items[0])).toBeVisible();
    expect(within(groups[1]).getByText(emergencyContent.instructionGroups[1].items[0])).not.toBeVisible();
    fireEvent.click(groups[1].querySelector("summary")!);
    expect(groups[1].open).toBe(true);
    expect(within(groups[1]).getByText(emergencyContent.instructionGroups[1].items[0])).toBeVisible();
    expect(groups[0].open).toBe(true);
    fireEvent.click(groups[0].querySelector("summary")!);
    expect(groups[0].open).toBe(false);
    expect(groups[1].open).toBe(true);
    rerender(<EmergencyGuide />);
    expect(groups[0].open).toBe(false);
    expect(groups[1].open).toBe(true);
  });

  it("retains native focusable summary controls without replacing their semantics", () => {
    const { container } = render(<EmergencyGuide />);
    for (const summary of container.querySelectorAll("summary")) {
      summary.focus();
      expect(summary).toHaveFocus();
      expect(summary).not.toHaveAttribute("role");
      expect(summary).not.toHaveAttribute("tabindex", "-1");
    }
  });

  it("provides only the intended telephone action and shows number descriptions", () => {
    const { container } = render(<EmergencyGuide />);
    expect(screen.getByRole("link", { name: appCopy.actions.call112 })).toHaveAttribute("href", "tel:112");
    expect(container.querySelectorAll("a[href^='tel:']")).toHaveLength(1);
    expect(container.querySelector("a[href^='sms:']")).toBeNull();
    emergencyContent.numbers.forEach((number) => {
      expect(screen.getByText(number.description)).toBeInTheDocument();
      expect(screen.getByText(number.availability)).toBeInTheDocument();
    });
    expect(screen.getByText(emergencyContent.numbers[1].description)).toHaveTextContent("inregistrate in prealabil");
  });

  it("keeps the authority disclaimer, review date, sources and network caveat visible", () => {
    render(<EmergencyGuide />);
    expect(screen.getByText(emergencyContent.disclaimer)).toBeInTheDocument();
    expect(screen.getByText(`${emergencyContent.reviewedLabel}: ${emergencyContent.lastReviewed}`)).toBeInTheDocument();
    expect(screen.getByText(emergencyContent.externalLinksNote)).toBeInTheDocument();
    emergencyContent.sources.forEach((source) => {
      expect(screen.getByRole("link", { name: source.label })).toHaveAttribute("href", source.url);
    });
  });

  it("renders the entire bundled guide offline without fetching content", () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "onLine");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    try {
      const { container } = render(<EmergencyGuide />);
      expect(container.querySelectorAll("details li")).toHaveLength(19);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("link", { name: appCopy.actions.call112 })).toBeInTheDocument();
    } finally {
      fetchSpy.mockRestore();
      if (descriptor) Object.defineProperty(navigator, "onLine", descriptor);
      else Reflect.deleteProperty(navigator, "onLine");
    }
  });
});
