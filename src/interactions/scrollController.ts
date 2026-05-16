import Lenis from "lenis";

export class ScrollController {
  lenis: Lenis;

  progress = 0;

  scroll = 0;

  limit = 1;
  velocity = 0;
  constructor() {
    document.body.style.height = "400vh";

    this.lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true,
      lerp: 0.08,
    });

    this.lenis.on("scroll", ({ scroll, limit, velocity }) => {
      this.scroll = scroll;

      this.limit = limit;
      this.velocity = velocity;
      this.progress = scroll / limit;
    });
  }

  update(time: number) {
    this.lenis.raf(time);
  }
}
