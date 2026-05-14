import { EventEmitter } from "../utils/event-emitter";

export class Sizes extends EventEmitter {
  public width = window.innerWidth;
  public height = window.innerHeight;
  public pixelRatio = Math.min(window.devicePixelRatio, 2);

  constructor() {
    super();

    window.addEventListener("resize", this.handleResize);
  }

  private handleResize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    this.emit("resize");
  };
}
