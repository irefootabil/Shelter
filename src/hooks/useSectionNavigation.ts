import { useEffect, useState, type RefObject } from "react";

type Section = { id: string; destination: string };

export function useSectionNavigation(sections: readonly Section[], headerRef: RefObject<HTMLElement | null>) {
  const [activeSection, setActiveSection] = useState(sections[0].destination);

  useEffect(() => {
    let frame: number | null = null;

    function measure() {
      frame = null;
      const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
      const threshold = (headerRef.current?.getBoundingClientRect().bottom ?? 0) + rootFontSize + 8;
      let destination = sections[0].destination;
      for (const section of sections) {
        const rect = document.getElementById(section.id)?.getBoundingClientRect();
        if (rect && rect.height > 0 && rect.top <= threshold) destination = section.destination;
      }
      // The final section may not reach the header when the page ends sooner.
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        destination = sections[sections.length - 1].destination;
      }
      setActiveSection(destination);
    }

    function schedule() {
      if (frame === null) frame = window.requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    // Expanded details and search results can move sections without a scroll event.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    const main = document.querySelector("main");
    if (main) observer?.observe(main);
    if (headerRef.current) observer?.observe(headerRef.current);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      observer?.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [sections, headerRef]);

  return activeSection;
}
