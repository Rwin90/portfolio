const HOVER_SELECTOR = "a, button, .work-row";
const LERP = 0.05;

/**
 * Custom cursor dot: position trails the pointer via a per-frame lerp, and
 * scales up with a CSS ease whenever it's over a clickable area.
 */
export class CustomCursor {
  private root: HTMLElement;
  private inner: HTMLElement;

  private target = { x: innerWidth / 2, y: innerHeight / 2 };
  private current = { x: innerWidth / 2, y: innerHeight / 2 };

  private raf = 0;

  constructor() {
    const root = document.querySelector<HTMLElement>(".cursor-dot");
    const inner = root?.querySelector<HTMLElement>(".cursor-dot__inner");
    if (!root || !inner) throw new Error("Cursor markup missing");

    this.root = root;
    this.inner = inner;

    addEventListener("mousemove", this.onMove, { passive: true });
    document.addEventListener("mouseover", this.onOver, true);
    document.addEventListener("mouseout", this.onOut, true);

    this.tick();
  }

  private onMove = (e: MouseEvent) => {
    this.target.x = e.clientX;
    this.target.y = e.clientY;
  };

  private onOver = (e: Event) => {
    if ((e.target as Element).closest?.(HOVER_SELECTOR)) {
      this.inner.classList.add("is-hover");
    }
  };

  private onOut = (e: Event) => {
    if ((e.target as Element).closest?.(HOVER_SELECTOR)) {
      this.inner.classList.remove("is-hover");
    }
  };

  private tick = () => {
    this.raf = requestAnimationFrame(this.tick);

    this.current.x += (this.target.x - this.current.x) * LERP;
    this.current.y += (this.target.y - this.current.y) * LERP;

    this.root.style.transform = `translate3d(${this.current.x}px, ${this.current.y}px, 0)`;
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    removeEventListener("mousemove", this.onMove);
    document.removeEventListener("mouseover", this.onOver, true);
    document.removeEventListener("mouseout", this.onOut, true);
  }
}
