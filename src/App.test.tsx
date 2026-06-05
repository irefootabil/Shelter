import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { appCopy, emergencyContent } from "./content";

describe("App", () => {
  it("renders the main mobile shell landmarks", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigare principala" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: appCopy.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: appCopy.sections.shelter.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: appCopy.sections.emergency.title })).toBeInTheDocument();
  });

  it("keeps key Romanian copy visible in the shell", () => {
    render(<App />);

    expect(screen.getByText(appCopy.status.offlineReady)).toBeInTheDocument();
    expect(screen.getByText(appCopy.status.localOnly)).toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.location.fallback)).toBeInTheDocument();
    expect(screen.getByText(emergencyContent.disclaimer)).toBeInTheDocument();
  });

  it("renders emergency actions and disabled placeholder controls", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: appCopy.actions.call112 })).toHaveAttribute("href", "tel:112");
    expect(screen.getByRole("button", { name: appCopy.actions.enableLocation })).toBeDisabled();
    expect(screen.getByRole("button", { name: appCopy.actions.manualSearch })).toBeDisabled();
    expect(screen.getByText(emergencyContent.numbers[0].action)).toBeInTheDocument();
  });
});
