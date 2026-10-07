import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSectionNavigation } from "./useSectionNavigation";

function Example() {
  const { activeSection, navigate } = useSectionNavigation();
  return <><div id={`view-${activeSection}`} tabIndex={-1}>{activeSection}</div>
    <button onClick={() => navigate("install")}>Offline</button>
    <button onClick={() => navigate("search")}>Search</button></>;
}

beforeEach(() => {
  window.history.replaceState(null, "", "#search");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("useSectionNavigation", () => {
  it("switches immediately, saves scroll and focuses the selected region", () => {
    render(<Example />);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(240);
    fireEvent.click(screen.getByText("Offline"));
    expect(window.location.hash).toBe("#install");
    expect(document.getElementById("view-install")).toHaveFocus();
    fireEvent.click(screen.getByText("Search"));
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 240, behavior: "instant" });
  });

  it("handles direct and legacy links with a safe unknown-link fallback", () => {
    window.history.replaceState(null, "", "#source");
    render(<Example />);
    expect(document.getElementById("view-status")).toBeInTheDocument();
    act(() => {
      window.history.replaceState(null, "", "#unknown");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(document.getElementById("view-search")).toHaveFocus();
  });

  it("handles browser history changes and removes event listeners", () => {
    const view = render(<Example />);
    act(() => {
      window.history.replaceState(null, "", "#emergency");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(document.getElementById("view-emergency")).toHaveFocus();
    view.unmount();
    expect(() => window.dispatchEvent(new PopStateEvent("popstate"))).not.toThrow();
  });
});
