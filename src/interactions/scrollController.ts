import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Normalized scroll ranges per section, derived from real DOM layout.
 * Consumed by the camera (where along the box are we?) and by any
 * subsystem that wants to react to a specific beat.
 */
export type SectionRanges = Record<string, [number, number]>;

const SECTION_SELECTORS = [".hero", ".experience", ".work", ".outro"] as const;

export class ScrollController {
  lenis: Lenis;

  progress = 0;
  scroll = 0;
  limit = 1;
  velocity = 0;

  /**
   * Scroll progress at which the camera begins its arc to the top-down view.
   * Derived from `.outro`'s real offset so the arc stays locked to its
   * section no matter how much copy the other sections gain or lose.
   */
  splitT = 0.85;

  sections: SectionRanges = {};

  constructor() {
    this.lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      lerp: 0.08,
    });

    this.lenis.on("scroll", ({ scroll, limit, velocity }) => {
      this.scroll = scroll;
      this.limit = limit;
      this.velocity = velocity;
      this.progress = limit > 0 ? scroll / limit : 0;

      // Keep ScrollTrigger frame-locked to Lenis' smoothed position.
      // Without this, DOM animations read native window.scrollY while the
      // 3D reads Lenis' lerped value, and the two drift apart on fast scroll.
      ScrollTrigger.update();
    });

    // Lenis is driven by gsap's ticker so there is exactly one clock in the
    // app. lenis.raf expects milliseconds; gsap.ticker hands out seconds.
    gsap.ticker.add(this.rafTick);
    gsap.ticker.lagSmoothing(0);

    this.measure();
    ScrollTrigger.addEventListener("refresh", this.measure);
  }

  private rafTick = (time: number) => {
    this.lenis.raf(time * 1000);
  };

  /**
   * Recompute section ranges + splitT from live layout.
   * Runs on construction and on every ScrollTrigger refresh (i.e. resize).
   */
  measure = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;

    this.sections = {};

    for (const selector of SECTION_SELECTORS) {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) continue;

      const name = selector.slice(1);
      const start = el.offsetTop / max;
      const end = (el.offsetTop + el.offsetHeight) / max;

      this.sections[name] = [
        Math.min(Math.max(start, 0), 1),
        Math.min(Math.max(end, 0), 1),
      ];
    }

    this.splitT = this.sections.outro?.[0] ?? 0.85;
  };

  dispose() {
    gsap.ticker.remove(this.rafTick);
    ScrollTrigger.removeEventListener("refresh", this.measure);
    this.lenis.destroy();
  }
}
