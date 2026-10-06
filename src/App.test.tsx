import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { appCopy, emergencyContent } from "./content";
import * as locationModule from "./hooks/useLocation";
import * as rankingModule from "./lib/ranking";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    unsetDeviceOrientationEvent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    unsetDeviceOrientationEvent();
  });

  it("reranks only for coordinate availability or value changes, not GPS metadata", () => {
    const snapshot: locationModule.LocationSnapshot = {
      coordinate: { latitude: 44.4268, longitude: 26.1025 },
      source: "gps", timestamp: Date.now(), accuracyMeters: 10, isStale: false,
    };
    const result: locationModule.UseLocationResult = {
      positionAgeSeconds: 0, status: "ready", permissionState: "granted",
      gpsLocation: snapshot, cachedLocation: null, manualLocation: null,
      effectiveLocation: snapshot, errorMessage: null,
    };
    const location = vi.spyOn(locationModule, "useLocation").mockReturnValue(result);
    const rank = vi.spyOn(rankingModule, "rankShelters");
    const view = render(<App />);
    expect(rank).toHaveBeenCalledTimes(1);
    location.mockReturnValue({ ...result, positionAgeSeconds: 1, effectiveLocation: {
      ...snapshot, coordinate: { ...snapshot.coordinate }, source: "cache", accuracyMeters: 20,
    } });
    view.rerender(<App />);
    expect(rank).toHaveBeenCalledTimes(1);
    location.mockReturnValue({ ...result, effectiveLocation: { ...snapshot, coordinate: { latitude: 46.7712, longitude: 23.6236 } } });
    view.rerender(<App />);
    expect(rank).toHaveBeenCalledTimes(2);
    location.mockReturnValue({ ...result, effectiveLocation: null, status: "stale" });
    view.rerender(<App />);
    expect(screen.getByText(appCopy.sections.shelter.listPlaceholder)).toBeInTheDocument();
    location.mockReturnValue(result);
    view.rerender(<App />);
    expect(rank).toHaveBeenCalledTimes(3);
  });

  it("renders the main mobile shell landmarks", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: appCopy.navigation.primaryLabel })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: appCopy.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: appCopy.sections.install.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: appCopy.sections.shelter.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: appCopy.sections.emergency.title })).toBeInTheDocument();
  });

  it("provides a first keyboard skip link that focuses the main landmark", () => {
    const { container } = render(<App />);
    const skip = screen.getByRole("link", { name: appCopy.accessibility.skipToContent });
    expect(container.querySelector("a")).toBe(skip);
    expect(skip).toHaveAttribute("href", "#top");
    fireEvent.click(skip);
    expect(screen.getByRole("main")).toHaveFocus();
    for (const link of container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
      expect(document.getElementById(link.hash.slice(1))).not.toBeNull();
    }
  });

  it("announces status changes without including compass telemetry or whole result cards", async () => {
    vi.spyOn(locationModule, "useLocation").mockReturnValue(gpsResult());
    const { container } = render(<App />);
    const source = screen.getByText(appCopy.sections.location.sourceLabels.gps);
    expect(source.closest('[role="status"]')).not.toBeNull();
    expect(container.querySelector(".location-summary")).not.toHaveAttribute("aria-live");
    const heading = await screen.findByText(appCopy.sections.compass.headingUnavailable);
    expect(heading.closest('[role="status"], [aria-live]')).toBeNull();
    expect(screen.getByText(appCopy.sections.compass.statusLabels.unavailable).closest('[role="status"]')).not.toBeNull();
    expect(container.querySelector(".shelter-results")).not.toHaveAttribute("aria-live");
    expect(container.querySelector('.visually-hidden[role="status"]')).toHaveTextContent(appCopy.sections.shelter.primaryLabel);
  });

  it("keeps key Romanian copy visible in the shell", () => {
    render(<App />);

    expect(screen.getAllByText(appCopy.status.offlineDetails.unavailable).length).toBeGreaterThan(0);
    expect(screen.getByText(appCopy.status.localOnly)).toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.install.caveat)).toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.location.fallback)).toBeInTheDocument();
    expect(screen.getByText(emergencyContent.disclaimer)).toBeInTheDocument();
  });

  it("shows install and offline preparation steps", () => {
    render(<App />);

    expect(screen.getByRole("link", { name: appCopy.navigation.install })).toHaveAttribute("href", "#install");

    for (const step of appCopy.sections.install.steps) {
      expect(screen.getByText(step)).toBeInTheDocument();
    }
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

  it("uses manual selection for a local address list without recommendations or position claims", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseCounty), { target: { value: "B" } });
    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseTown), { target: { value: "Sector 1" } });

    expect(await screen.findByText(appCopy.sections.location.sourceLabels.manual)).toBeInTheDocument();
    expect(screen.getByText(`${appCopy.sections.location.manualSelection}: Bucuresti, Sector 1`)).toBeInTheDocument();
    expect(screen.queryByText(appCopy.sections.shelter.primaryLabel)).not.toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.location.manualBrowsing)).toBeInTheDocument();
    expect(screen.queryByText(appCopy.sections.location.permissionLabels.ready)).not.toBeInTheDocument();
    expect(screen.queryByText(appCopy.sections.location.noAccuracy)).not.toBeInTheDocument();
    expect(screen.queryByText("-- km")).not.toBeInTheDocument();
    expect(screen.queryByText(appCopy.sections.shelter.fields.distance)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: appCopy.sections.compass.title })).not.toBeInTheDocument();
    expect(screen.getByLabelText(appCopy.sections.shelter.localListLabel)).toBeInTheDocument();
    expect(screen.queryByText(appCopy.sections.shelter.listPlaceholder)).not.toBeInTheDocument();
  });

  it("shows a text direction cue and keeps recommendations usable when compass is unavailable", async () => {
    vi.spyOn(locationModule, "useLocation").mockReturnValue(gpsResult());
    render(<App />);

    expect(await screen.findByRole("heading", { name: appCopy.sections.compass.title })).toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.shelter.primaryLabel)).toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.compass.statusLabels.unavailable)).toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.compass.headingUnavailable)).toBeInTheDocument();
    expect(screen.getAllByText(appCopy.sections.compass.directionPrefix, { exact: false }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(appCopy.sections.shelter.fields.distance).length).toBeGreaterThan(0);
  });

  it("keeps Turnu local and offers an explicit locality change instead of Giurgiu", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseCounty), { target: { value: "TR" } });
    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseTown), { target: { value: "Turnu Măgurele" } });
    expect(await screen.findByText(appCopy.sections.shelter.noLocalFunctional)).toBeInTheDocument();
    const local = screen.getByLabelText(appCopy.sections.shelter.localListLabel);
    expect(within(local).getAllByText("partial").length).toBeGreaterThan(0);
    expect(within(local).queryByText(/Camera de Comerț/)).not.toBeInTheDocument();
    expect(local.querySelectorAll("article")).toHaveLength(14);
    expect(screen.queryByText(/Camera de Comerț/)).not.toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.shelter.manualBrowsingNote)).toBeInTheDocument();
    expect(screen.queryByText(appCopy.sections.shelter.fields.distance)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: appCopy.actions.searchOtherLocality }));
    expect(screen.getByLabelText(appCopy.actions.chooseCounty)).toHaveFocus();
    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseCounty), { target: { value: "CJ" } });
    expect(screen.getByLabelText(appCopy.actions.chooseTown)).toHaveValue("");
    expect(screen.queryByLabelText(appCopy.sections.shelter.localListLabel)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: appCopy.sections.compass.title })).not.toBeInTheDocument();
    expect(screen.queryByText(appCopy.sections.shelter.primaryLabel)).not.toBeInTheDocument();
  });

  it("keeps manual browsing independent of a cached phone location", () => {
    const result = gpsResult();
    const cached = { ...result.effectiveLocation!, source: "cache" as const };
    const location = vi.spyOn(locationModule, "useLocation").mockReturnValue({
      ...result, gpsLocation: null, cachedLocation: cached, effectiveLocation: cached,
    });
    const rank = vi.spyOn(rankingModule, "rankShelters");
    render(<App />);
    expect(rank).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseCounty), { target: { value: "CJ" } });
    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseTown), { target: { value: "Huedin" } });
    expect(rank).toHaveBeenCalledTimes(1);
    expect(location.mock.calls.at(-1)?.[0]).not.toHaveProperty("manualLocation");
    expect(screen.getByLabelText(appCopy.sections.shelter.localListLabel).querySelectorAll("article")).toHaveLength(4);
    expect(screen.queryByText(appCopy.sections.shelter.fields.distance)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: appCopy.sections.compass.title })).not.toBeInTheDocument();
  });

  it("keeps the suspect Huedin record visible but removes its misleading distance", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseCounty), { target: { value: "CJ" } });
    fireEvent.change(screen.getByLabelText(appCopy.actions.chooseTown), { target: { value: "Huedin" } });
    const address = await screen.findByRole("heading", { name: "Str. Republicii nr. 39-42" });
    const record = within(address.closest("article")!);
    expect(record.getByText(appCopy.sections.shelter.suspectCoordinate)).toBeInTheDocument();
    expect(record.queryByText(appCopy.sections.shelter.fields.distance)).not.toBeInTheDocument();
    expect(record.queryByText(/km/)).not.toBeInTheDocument();
    expect(screen.getByText(appCopy.sections.shelter.noLocalFunctional)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: appCopy.sections.compass.title })).not.toBeInTheDocument();
  });

  it("lets users retry and stop GPS, then honors manual selection", async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    const watchPosition = vi.fn(() => 42);
    const clearWatch = vi.fn();
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { watchPosition, clearWatch } });
    try {
      render(<App />);
      fireEvent.click(screen.getByRole("button", { name: appCopy.actions.enableLocation }));
      await waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole("button", { name: appCopy.actions.retryLocation }));
      await waitFor(() => expect(watchPosition).toHaveBeenCalledTimes(2));
      expect(clearWatch).toHaveBeenCalledWith(42);
      fireEvent.click(screen.getByRole("button", { name: appCopy.actions.stopLocation }));
      expect(screen.getByRole("radio", { name: appCopy.sections.location.manualMode })).toBeChecked();
      expect(screen.queryByRole("button", { name: appCopy.actions.stopLocation })).not.toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(appCopy.actions.chooseCounty), { target: { value: "B" } });
      fireEvent.change(screen.getByLabelText(appCopy.actions.chooseTown), { target: { value: "Sector 1" } });
      expect(await screen.findByText(appCopy.sections.location.sourceLabels.manual)).toBeInTheDocument();
      expect(clearWatch).toHaveBeenCalledTimes(2);
    } finally {
      if (original) Object.defineProperty(navigator, "geolocation", original);
      else Reflect.deleteProperty(navigator, "geolocation");
    }
  });
});

function unsetDeviceOrientationEvent(): void {
  Reflect.deleteProperty(window, "DeviceOrientationEvent");
}

function gpsResult(): locationModule.UseLocationResult {
  const snapshot: locationModule.LocationSnapshot = {
    coordinate: { latitude: 44.4268, longitude: 26.1025 }, source: "gps",
    timestamp: Date.now(), accuracyMeters: 10, isStale: false,
  };
  return { positionAgeSeconds: 0, status: "ready", permissionState: "granted",
    gpsLocation: snapshot, cachedLocation: null, manualLocation: null,
    effectiveLocation: snapshot, errorMessage: null };
}
