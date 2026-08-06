interface Tile {
  row: number;
  col: number;
  /** 0 = showing the front image, 1 = fully flipped to the back image. */
  target: 0 | 1;
  /** Current eased progress toward `target`, 0 → 1. */
  progress: number;
  /** Where `progress` eased from, so a reversed flip doesn't jump. */
  from: number;
  animStart: number;
}

const CELL_SIZE = 22;
const HOVER_RADIUS = CELL_SIZE * 2;
const FLIP_DURATION_MS = 480;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * The tetris theme's pixel-block motif, applied to the portrait: a grid of
 * tiles laid over the stylized front image, each of which puzzle-flips
 * (an eased horizontal squash standing in for a Y-axis rotation) to reveal
 * the real photo underneath wherever the cursor lingers.
 */
export class PortraitPixelFlip {
  private container: HTMLElement;
  private frontImg: HTMLImageElement;
  private backImg: HTMLImageElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tiles: Tile[] = [];
  private mouse = { x: -9999, y: -9999 };
  private raf = 0;
  private dpr = Math.min(devicePixelRatio || 1, 2);
  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    frontImg: HTMLImageElement,
    backImg: HTMLImageElement,
    canvas: HTMLCanvasElement,
  ) {
    this.container = container;
    this.frontImg = frontImg;
    this.backImg = backImg;
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    container.addEventListener("mousemove", this.onMouseMove, { passive: true });
    container.addEventListener("mouseleave", this.onMouseLeave);

    this.tick();
  }

  private resize = () => {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = Math.max(1, rect.width * this.dpr);
    this.canvas.height = Math.max(1, rect.height * this.dpr);

    const cols = Math.max(1, Math.ceil(rect.width / CELL_SIZE));
    const rows = Math.max(1, Math.ceil(rect.height / CELL_SIZE));
    this.tiles = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        this.tiles.push({ row, col, target: 0, progress: 0, from: 0, animStart: 0 });
      }
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  };

  private onMouseLeave = () => {
    this.mouse.x = -9999;
    this.mouse.y = -9999;
  };

  private setTarget(tile: Tile, target: 0 | 1, now: number) {
    if (tile.target === target) return;
    tile.target = target;
    tile.from = tile.progress;
    tile.animStart = now;
  }

  private tick = () => {
    this.raf = requestAnimationFrame(this.tick);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (
      !this.frontImg.complete ||
      !this.frontImg.naturalWidth ||
      !this.backImg.complete ||
      !this.backImg.naturalWidth
    ) {
      return;
    }

    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const now = performance.now();

    for (const tile of this.tiles) {
      const cx = tile.col * CELL_SIZE + CELL_SIZE / 2;
      const cy = tile.row * CELL_SIZE + CELL_SIZE / 2;
      const hovered = Math.hypot(cx - this.mouse.x, cy - this.mouse.y) < HOVER_RADIUS;

      this.setTarget(tile, hovered ? 1 : 0, now);

      if (tile.progress !== tile.target) {
        const t = Math.min(1, (now - tile.animStart) / FLIP_DURATION_MS);
        tile.progress = tile.from + (tile.target - tile.from) * easeInOutCubic(t);
        if (t >= 1) tile.progress = tile.target;
      }

      // At rest showing the front image, the tile is pixel-identical to
      // the plain <img> beneath — nothing to draw.
      if (tile.progress === 0) continue;

      this.drawTile(tile, rect);
    }
  };

  /**
   * `object-fit: cover` uses one uniform scale (not independent X/Y
   * stretching) and centers the crop. Two images at different native
   * resolutions/aspect ratios both need this same mapping to end up
   * visually the same size in the container — independent X/Y scaling
   * (what this used to do) is `object-fit: fill` math, not `cover`, and is
   * exactly why the two images didn't line up.
   */
  private coverSourceRect(img: HTMLImageElement, rect: DOMRect) {
    const scale = Math.max(
      rect.width / img.naturalWidth,
      rect.height / img.naturalHeight,
    );
    const offsetX = (img.naturalWidth * scale - rect.width) / 2;
    const offsetY = (img.naturalHeight * scale - rect.height) / 2;
    return { scale, offsetX, offsetY };
  }

  private drawTile(tile: Tile, rect: DOMRect) {
    const angle = tile.progress * Math.PI;
    const showingBack = angle > Math.PI / 2;
    const scaleX = showingBack ? -Math.cos(angle) : Math.cos(angle);
    if (scaleX < 0.04) return;

    const img = showingBack ? this.backImg : this.frontImg;
    const { scale, offsetX, offsetY } = this.coverSourceRect(img, rect);

    const dstX = tile.col * CELL_SIZE;
    const dstY = tile.row * CELL_SIZE;
    const srcX = (dstX + offsetX) / scale;
    const srcY = (dstY + offsetY) / scale;
    const srcSize = CELL_SIZE / scale;

    const size = CELL_SIZE * this.dpr;
    const px = dstX * this.dpr + size / 2;
    const py = dstY * this.dpr + size / 2;

    this.ctx.save();
    this.ctx.translate(px, py);
    this.ctx.scale(scaleX, 1);
    this.ctx.drawImage(
      img,
      srcX,
      srcY,
      srcSize,
      srcSize,
      -size / 2,
      -size / 2,
      size,
      size,
    );
    this.ctx.restore();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.container.removeEventListener("mousemove", this.onMouseMove);
    this.container.removeEventListener("mouseleave", this.onMouseLeave);
  }
}
