export class Mouse {
  normalized = {
    x: 0,
    y: 0,
  };

  x: number;

  y: number;

  constructor() {
    window.addEventListener("mousemove", this.onMove);
    this.x = 0;
    this.y = 0;
  }

  onMove = (e: MouseEvent) => {
    this.normalized.x = (e.clientX / window.innerWidth) * 2 - 1;

    this.normalized.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.x = e.clientX;
    this.y = e.clientY;
  };
}
