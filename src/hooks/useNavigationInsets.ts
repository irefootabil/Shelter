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
    // Text scaling and wrapped labels can resize either navigation surface.
    function measure() {
      elements.forEach((element, index) => {
        const height = element?.getBoundingClientRect().height ?? 0;
        if (height > 0) root.style.setProperty(properties[index], `${Math.ceil(height)}px`);
      });
    }
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    elements.forEach((element) => { if (element) observer?.observe(element); });
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      properties.forEach((property, index) => {
        const { value, priority } = previous[index];
        if (value) root.style.setProperty(property, value, priority);
        else root.style.removeProperty(property);
      });
    };
  }, []);

  return { headerRef, navigationRef };
}
