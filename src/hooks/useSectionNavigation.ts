import { useLayoutEffect, useRef, useState } from "react";

export type AppView = "search" | "emergency" | "install" | "status";

function readView(): AppView {
  const fragment = window.location.hash.slice(1);
  if (fragment === "emergency" || fragment === "install" || fragment === "status") return fragment;
  if (fragment === "source") return "status";
  return "search";
}

export function useSectionNavigation() {
  const [activeSection, setActiveSection] = useState<AppView>(readView);
  const current = useRef(activeSection);
  const positions = useRef<Partial<Record<AppView, number>>>({});
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    function update() {
      const next = readView();
      if (next === current.current) return;
      positions.current[current.current] = window.scrollY;
      current.current = next;
      setActiveSection(next);
    }
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.history.scrollRestoration = previousRestoration;
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById(`view-${activeSection}`)?.focus({ preventScroll: true });
    window.scrollTo({ top: positions.current[activeSection] ?? 0, behavior: "instant" });
  }, [activeSection]);

  function navigate(view: AppView) {
    if (view === current.current) return;
    positions.current[current.current] = window.scrollY;
    window.history.pushState(null, "", `#${view}`);
    current.current = view;
    setActiveSection(view);
  }

  return { activeSection, navigate };
}
