import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { appCopy, emergencyContent } from "./content";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

  it("renders emergency actions and active location controls", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: appCopy.actions.call112 })).toHaveAttribute("href", "tel:112");
    expect(screen.getByRole("button", { name: appCopy.actions.enableLocation })).toBeEnabled();
    expect(screen.getByRole("link", { name: appCopy.actions.manualSearch })).toHaveAttribute("href", "#manual-location");
    expect(screen.getByText(emergencyContent.numbers[0].action)).toBeInTheDocument();
  });

  it("shows the no-location shelter placeholder before a usable source exists", () => {
    render(<App />);

    expect(screen.getByText(appCopy.sections.location.sourceLabels.none)).toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.shelter.listPlaceholder)).toBeInTheDocument();
    expect(screen.getByText("-- km")).toBeInTheDocument();
  });

  it("uses manual county and town selection to render ranked shelters", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseCounty), { target: { value: "B" } });
    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseTown), { target: { value: "Sector 1" } });

    expect(await screen.findByText(appCopy.sections.location.sourceLabels.manual)).toBeInTheDocument();
    expect(screen.getByText(`${appCopy.sections.location.manualSelection}: Bucuresti, Sector 1`)).toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.shelter.primaryLabel)).toBeInTheDocument();
    expect(screen.getByLabelText(appCopy.sections.shelter.nearestLabel)).toBeInTheDocument();
    expect(screen.queryByText(appCopy.sections.shelter.listPlaceholder)).not.toBeInTheDocument();
  });
});
