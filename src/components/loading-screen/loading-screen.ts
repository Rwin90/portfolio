import { gsap } from "gsap";

const GRID_COLS = 4;
const GRID_ROWS = 3;
const HOLD_MS = 450;

// Same tetromino coordinate sets as the 3D scene's rain pieces
// (src/core/tetris-world.ts), so the loader reads as the same "block".
const SHAPES: [number, number][][] = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
  ],
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
];

export class LoadingScreen {
  private container: HTMLElement;
  private cells: HTMLElement[] = [];

  private shapeIndex = 0;
  private loopHandle?: number;
  private ready = false;

  constructor() {
    const container = document.getElementById("loading-screen");
    if (!container) throw new Error("Loading screen markup missing");
    this.container = container;

    const grid = document.createElement("div");
    grid.className = "loader-grid";
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      const cell = document.createElement("div");
      cell.className = "loader-cell";
      grid.appendChild(cell);
      this.cells.push(cell);
    }
    this.container.appendChild(grid);

    gsap.from(grid, {
      opacity: 0,
      scale: 0.85,
      duration: 0.8,
      ease: "power3.out",
    });

    // One tetromino at a time, morphing into a random next one (never the
    // same shape twice in a row), on a loop until the experience is ready —
    // so the sequence isn't the same fixed pattern on every visit.
    this.shapeIndex = Math.floor(Math.random() * SHAPES.length);
    this.showShape(this.shapeIndex);
    this.loopHandle = window.setInterval(() => {
      this.shapeIndex = this.nextRandomShapeIndex();
      this.showShape(this.shapeIndex);
    }, HOLD_MS);
  }

  private nextRandomShapeIndex(): number {
    let next = Math.floor(Math.random() * SHAPES.length);
    if (next === this.shapeIndex) {
      next = (next + 1) % SHAPES.length;
    }
    return next;
  }

  private showShape(index: number) {
    const active = new Set(SHAPES[index].map(([x, y]) => y * GRID_COLS + x));
    this.cells.forEach((cell, i) => {
      cell.classList.toggle("is-active", active.has(i));
    });
  }

  setProgress(p: number) {
    if (p >= 1.0 && !this.ready) {
      this.ready = true;
      this.hide();
    }
  }

  private hide() {
    clearInterval(this.loopHandle);
    gsap.to(this.container, {
      opacity: 0,
      duration: 1.0,
      ease: "power2.inOut",
      onComplete: () => this.container.remove(),
    });
  }
}
