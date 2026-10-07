import { useLayoutEffect, useRef } from "react";

export function useNavigationInsets() {
  const headerRef = useRef<HTMLElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const properties = ["--sticky-header-height", "--bottom-nav-height"] as const;
    const elements = [headerRef.current, navigationRef.current];
    const previous = properties.map((property) => ({
      value: root.style.getPropertyValue(property),
      priority: root.style.getPropertyPriority(property),
    }));
    let focusFrame: number | null = null;

    function revealFocusedControl() {
      focusFrame = null;
      const focused = document.activeElement;
      if (!(focused instanceof HTMLElement) || !focused.closest("main")) return;
      if (focused.tagName === "MAIN" || focused.classList.contains("task-view")) return;

      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const header = headerRef.current?.getBoundingClientRect();
      const navigation = navigationRef.current?.getBoundingClientRect();
      const top = Math.max(viewportTop, header?.bottom ?? viewportTop) + 8;
      const bottom = Math.min(viewportBottom, navigation?.top ?? viewportBottom) - 8;
      if (bottom <= top) return;

      const rect = focused.getBoundingClientRect();
      // Native focus scrolling may ignore scroll-padding on older browsers.
      // An immediate correction also cancels any competing smooth scroll.
      const delta = rect.top < top ? rect.top - top
        : rect.bottom > bottom && rect.height <= bottom - top ? rect.bottom - bottom
        : rect.top > bottom ? rect.top - top : 0;
      if (delta !== 0) window.scrollBy({ top: delta, behavior: "instant" });
    }

    function scheduleFocusReveal() {
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
      focusFrame = window.requestAnimationFrame(revealFocusedControl);
    }

    // Text scaling and wrapped labels can resize either navigation surface.
    function measure() {
      elements.forEach((element, index) => {
        const height = element?.getBoundingClientRect().height ?? 0;
        if (height > 0) root.style.setProperty(properties[index], `${Math.ceil(height)}px`);
      });
      scheduleFocusReveal();
    }
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    elements.forEach((element) => { if (element) observer?.observe(element); });
    window.addEventListener("resize", measure);
    document.addEventListener("focusin", scheduleFocusReveal);
    // React may reflow status text after a selection without moving focus.
    document.addEventListener("change", scheduleFocusReveal);
    window.visualViewport?.addEventListener("resize", scheduleFocusReveal);
    window.visualViewport?.addEventListener("scroll", scheduleFocusReveal);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("focusin", scheduleFocusReveal);
      document.removeEventListener("change", scheduleFocusReveal);
      window.visualViewport?.removeEventListener("resize", scheduleFocusReveal);
      window.visualViewport?.removeEventListener("scroll", scheduleFocusReveal);
      if (focusFrame !== null) window.cancelAnimationFrame(focusFrame);
      properties.forEach((property, index) => {
        const { value, priority } = previous[index];
        if (value) root.style.setProperty(property, value, priority);
        else root.style.removeProperty(property);
      });
    };
  }, []);

  return { headerRef, navigationRef };
}
