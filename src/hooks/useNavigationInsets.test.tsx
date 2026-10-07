import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNavigationInsets } from "./useNavigationInsets";

function Navigation() {
  const { headerRef, navigationRef } = useNavigationInsets();
  return <><header ref={headerRef}><a href="#main">Brand</a></header>
    <main id="main"><details><summary>Guide group</summary></details>
      <select aria-label="Locality"><option value="">Choose locality</option>
        <option value="selected">Selected locality</option></select></main>
    <nav ref={navigationRef}><a href="#main">Navigation</a></nav></>;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.documentElement.style.removeProperty("--sticky-header-height");
  document.documentElement.style.removeProperty("--bottom-nav-height");
});

describe("useNavigationInsets", () => {
  function setupFocusGeometry() {
    vi.stubGlobal("innerHeight", 900);
    let frame: FrameRequestCallback = () => {};
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { frame = callback; return 1; });
    const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const scroll = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
    let targetTop = 740;
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const top = this.tagName === "HEADER" ? 0 : this.tagName === "NAV" ? 780 : targetTop;
      const height = this.tagName === "HEADER" ? 100 : 60;
      return { top, bottom: top + height, height } as DOMRect;
    });
    const view = render(<Navigation />);
    const summary = view.getByText("Guide group");
    return { view, summary, scroll, cancel, flush: () => act(() => frame(0)),
      setTop: (top: number) => { targetTop = top; } };
  }

  it("reveals a focused summary obscured by the bottom bar, preserving its outline clearance", () => {
    const { summary, scroll, flush } = setupFocusGeometry();
    act(() => summary.focus());
    flush();
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 28, behavior: "instant" });
  });

  it("corrects reverse focus under the header but leaves visible controls and navigation alone", () => {
    const { view, summary, scroll, flush, setTop } = setupFocusGeometry();
    setTop(90);
    act(() => summary.focus());
    flush();
    expect(scroll).toHaveBeenLastCalledWith({ top: -18, behavior: "instant" });
    scroll.mockClear();
    setTop(300);
    fireEvent.focusIn(summary);
    flush();
    expect(scroll).not.toHaveBeenCalled();
    for (const label of ["Brand", "Navigation"]) {
      act(() => view.getByText(label).focus());
      flush();
    }
    expect(scroll).not.toHaveBeenCalled();
  });

  it("uses the visual viewport after keyboard resize and removes pending work on unmount", () => {
    const viewport = new EventTarget();
    Object.assign(viewport, { offsetTop: 50, height: 600 });
    vi.stubGlobal("visualViewport", viewport);
    const { view, summary, scroll, flush, setTop, cancel } = setupFocusGeometry();
    setTop(610);
    act(() => summary.focus());
    flush();
    expect(scroll).toHaveBeenLastCalledWith({ top: 28, behavior: "instant" });
    scroll.mockClear();
    setTop(620);
    act(() => viewport.dispatchEvent(new Event("resize")));
    flush();
    expect(scroll).toHaveBeenLastCalledWith({ top: 38, behavior: "instant" });
    const remove = vi.spyOn(viewport, "removeEventListener");
    fireEvent.focusIn(summary);
    view.unmount();
    expect(cancel).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("reveals an unchanged focused selector after a selection reflows content", () => {
    const { view, scroll, flush, setTop } = setupFocusGeometry();
    const selector = view.getByRole("combobox", { name: "Locality" });
    setTop(700);
    act(() => selector.focus());
    flush();
    expect(scroll).not.toHaveBeenCalled();

    fireEvent.change(selector, { target: { value: "selected" } });
    // Layout changes after the event, before the scheduled animation frame.
    setTop(750);
    flush();
    expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 38, behavior: "instant" });
    expect(selector).toHaveFocus();

    scroll.mockClear();
    setTop(600);
    fireEvent.change(selector, { target: { value: "" } });
    flush();
    expect(scroll).not.toHaveBeenCalled();
    const remove = vi.spyOn(document, "removeEventListener");
    view.unmount();
    expect(remove).toHaveBeenCalledWith("change", expect.any(Function));
  });

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
