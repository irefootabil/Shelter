import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNavigationInsets } from "./useNavigationInsets";

function Navigation() {
  const { headerRef, navigationRef } = useNavigationInsets();
  return <><header ref={headerRef} /><nav ref={navigationRef} /></>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty("--sticky-header-height");
  document.documentElement.style.removeProperty("--bottom-nav-height");
});

describe("useNavigationInsets", () => {
  it("measures both surfaces, updates after text reflow, and restores styles on cleanup", () => {
    let headerHeight = 60;
    let navHeight = 54;
    let resize: () => void = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { resize = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return { height: this.tagName === "HEADER" ? headerHeight : navHeight } as DOMRect;
    });
    const root = document.documentElement;
    root.style.setProperty("--sticky-header-height", "72px", "important");
    const previousPriority = root.style.getPropertyPriority("--sticky-header-height");
    const view = render(<Navigation />);
    expect(root.style.getPropertyValue("--sticky-header-height")).toBe("60px");
    expect(root.style.getPropertyValue("--bottom-nav-height")).toBe("54px");
    expect(observe).toHaveBeenCalledTimes(2);
    headerHeight = 143.5;
    navHeight = 110;
    act(resize);
    expect(root.style.getPropertyValue("--sticky-header-height")).toBe("144px");
    expect(root.style.getPropertyValue("--bottom-nav-height")).toBe("110px");
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(root.style.getPropertyValue("--sticky-header-height")).toBe("72px");
    expect(root.style.getPropertyPriority("--sticky-header-height")).toBe(previousPriority);
    expect(root.style.getPropertyValue("--bottom-nav-height")).toBe("");
    headerHeight = 200;
    act(() => window.dispatchEvent(new Event("resize")));
    expect(root.style.getPropertyValue("--sticky-header-height")).toBe("72px");
  });

  it("keeps CSS fallbacks for zero sizes and handles browsers without ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    let height = 0;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ height }) as DOMRect);
    const view = render(<Navigation />);
    expect(document.documentElement.style.getPropertyValue("--sticky-header-height")).toBe("");
    height = 80;
    act(() => window.dispatchEvent(new Event("resize")));
    expect(document.documentElement.style.getPropertyValue("--sticky-header-height")).toBe("80px");
    view.unmount();
  });
});
