type Callback = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, Callback[]> = new Map();

  on(event: string, callback: Callback) {
    const callbacks = this.events.get(event) || [];
    callbacks.push(callback);
    this.events.set(event, callbacks);
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event);

    if (!callbacks) return;

    callbacks.forEach((callback) => callback(...args));
  }
}
