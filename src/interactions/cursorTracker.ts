export class CursorTracker {
  constructor(callback: (x: number, y: number) => void) {
    window.addEventListener("mousemove", (e) => {
      const x = e.clientX / window.innerWidth - 0.5;

      const y = e.clientY / window.innerHeight - 0.5;

      callback(x, y);
    });
  }
}
