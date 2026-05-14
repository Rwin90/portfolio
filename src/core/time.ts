import { EventEmitter } from "../utils/event-emitter";

export class Time extends EventEmitter {
  private current = performance.now();

  constructor() {
    super();

    requestAnimationFrame(this.tick);
  }

  private tick = () => {
    const now = performance.now();
    const delta = now - this.current;

    this.current = now;

    this.emit("tick", delta);

    requestAnimationFrame(this.tick);
  };
}
