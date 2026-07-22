import { EventEmitter } from "../utils/event-emitter";

const MAX_PIXEL_RATIO = 1.5;
const DEBOUNCE_MS = 150;

/**
 * The single resize listener in the app. Everything that needs to react to a
 * viewport change (renderer, camera, post-processing composer, ScrollTrigger)
 * subscribes here rather than adding its own listener — that way nothing can
 * be silently forgotten, which is how the composer ended up never resizing.
 */
export class Sizes extends EventEmitter {
  public width = window.innerWidth;
  public height = window.innerHeight;
  public pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();

    window.addEventListener("resize", this.handleResize);
  }

  private handleResize = () => {
    if (this.timer) clearTimeout(this.timer);

    this.timer = setTimeout(() => {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);

      this.emit("resize", this.width, this.height, this.pixelRatio);
    }, DEBOUNCE_MS);
  };

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    window.removeEventListener("resize", this.handleResize);
  }
}
