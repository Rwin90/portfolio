import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export class ScrollController {
  lenis: Lenis;

  progress = 0;
  scroll = 0;
  limit = 1;
  velocity = 0;

  constructor() {
    // Smooth/inertial scroll is itself a motion effect — honor the OS
    // preference by making Lenis track the native scroll near-instantly
    // instead of the usual heavy trailing.
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.lenis = new Lenis({
      smoothWheel: !reduced,
      lerp: reduced ? 1 : 0.07,
      wheelMultiplier: 1,
      // Nav links (#about, #work, #contact) get the same eased scroll instead
      // of an instant native jump — matters now that CSS scroll-behavior is
      // gone (it fought Lenis' own per-frame scrollTo calls).
      anchors: !reduced,
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
  }

  private rafTick = (time: number) => {
    this.lenis.raf(time * 1000);
  };

  dispose() {
    gsap.ticker.remove(this.rafTick);
    this.lenis.destroy();
  }
}
