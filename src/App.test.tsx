import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { appCopy } from "./content/appCopy";

describe("App", () => {
  it("renders the Romanian emergency app shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: appCopy.title })).toBeInTheDocument();
    expect(screen.getByText(appCopy.status.offlineReady)).toBeInTheDocument();
    expect(screen.getByText(appCopy.status.manualFallback)).toBeInTheDocument();
  });
});
