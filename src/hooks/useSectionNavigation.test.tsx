import { useRef } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSectionNavigation } from "./useSectionNavigation";

const sections = [
  { id: "search", destination: "search" },
  { id: "nearby", destination: "search" },
  { id: "emergency", destination: "emergency" },
  { id: "install", destination: "install" },
] as const;

function Example() {
  const header = useRef<HTMLElement>(null);
  const active = useSectionNavigation(sections, header);
  return <><header ref={header} /><main>{sections.map(({ id }) => <section id={id} key={id} />)}</main><output>{active}</output></>;
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("useSectionNavigation", () => {
  it("tracks scrolling, direct anchors and layout changes without confusing results with a new view", () => {
    let position = 0;
    let frame: FrameRequestCallback = () => {};
    let resize: () => void = () => {};
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { resize = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    const request = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { frame = callback; return 1; });
    const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.tagName === "HEADER") return { bottom: 100 } as DOMRect;
      const index = sections.findIndex(({ id }) => id === this.id);
      return { top: 116 + index * 300 - position, height: 300 } as DOMRect;
    });
    const view = render(<Example />);
    expect(screen.getByRole("status")).toHaveTextContent("search");
    expect(observe).toHaveBeenCalledTimes(2);
    position = 400;
    act(() => { window.dispatchEvent(new Event("scroll")); window.dispatchEvent(new Event("scroll")); });
    expect(request).toHaveBeenCalledOnce();
    act(() => frame(0));
    expect(screen.getByRole("status")).toHaveTextContent("search");
    vi.spyOn(window, "getComputedStyle").mockReturnValue({ fontSize: "32px" } as CSSStyleDeclaration);
    position = 588;
    act(() => window.dispatchEvent(new Event("hashchange")));
    act(() => frame(0));
    expect(screen.getByRole("status")).toHaveTextContent("emergency");
    position = 600;
    act(() => window.dispatchEvent(new Event("hashchange")));
    act(() => frame(0));
    expect(screen.getByRole("status")).toHaveTextContent("emergency");
    position = 900;
    act(resize);
    act(() => frame(0));
    expect(screen.getByRole("status")).toHaveTextContent("install");
    act(() => window.dispatchEvent(new Event("resize")));
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledWith(1);
    request.mockClear();
    act(() => window.dispatchEvent(new Event("scroll")));
    expect(request).not.toHaveBeenCalled();
  });

  it("keeps search selected for unavailable geometry and browsers without ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 0, height: 0, bottom: 0 } as DOMRect);
    render(<Example />);
    expect(screen.getByRole("status")).toHaveTextContent("search");
  });

  it("marks the final destination at the document end even when its heading cannot reach the header", () => {
    vi.stubGlobal("innerHeight", 900);
    vi.stubGlobal("scrollY", 100);
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 240, height: 300, bottom: 540 } as DOMRect);
    render(<Example />);
    expect(screen.getByRole("status")).toHaveTextContent("install");
  });
});
