interface PooledTile {
  el: HTMLElement;
  front: HTMLElement;
  back: HTMLElement;
  key: string | null;
  flipped: boolean;
}

const CELL_SIZE = 16;
const HOVER_RADIUS = CELL_SIZE * 4.2;
// Bounds how many tiles can exist at once — generous for the area a
// HOVER_RADIUS circle can cover, with headroom for fast mouse movement
// leaving old tiles mid-unflip while new ones spin up.
const POOL_SIZE = 220;

/**
 * The tetris theme's pixel-block motif, applied to the portrait: a small
 * recycled pool of real DOM tiles laid over the stylized front image, each
 * of which puzzle-flips in genuine CSS 3D (`perspective` + `rotateY`, real
 * perspective foreshortening, not a 2D squash) to reveal the actual photo
 * wherever the cursor lingers. Only tiles near the cursor ever exist in the
 * DOM — everywhere else the plain <img> shows through untouched.
 */
export class PortraitPixelFlip {
  private container: HTMLElement;
  private frontImg: HTMLImageElement;
  private backImg: HTMLImageElement;
  private pool: HTMLElement;
  private tiles: PooledTile[] = [];
  private active = new Map<string, PooledTile>();
  private mouse = { x: -9999, y: -9999 };
  private raf = 0;
  private resizeObserver: ResizeObserver;

  constructor(
    container: HTMLElement,
    frontImg: HTMLImageElement,
    backImg: HTMLImageElement,
    pool: HTMLElement,
  ) {
    this.container = container;
    this.frontImg = frontImg;
    this.backImg = backImg;
    this.pool = pool;

    for (let i = 0; i < POOL_SIZE; i++) {
      this.tiles.push(this.buildTile());
    }

    this.resizeObserver = new ResizeObserver(() => this.reset());
    this.resizeObserver.observe(container);

    container.addEventListener("mousemove", this.onMouseMove, {
      passive: true,
    });
    container.addEventListener("mouseleave", this.onMouseLeave);

    this.tick();
  }

  private buildTile(): PooledTile {
    const el = document.createElement("div");
    el.className = "flip-tile";
    el.style.width = `${CELL_SIZE}px`;
    el.style.height = `${CELL_SIZE}px`;

    const inner = document.createElement("div");
    inner.className = "flip-tile__inner";

    const front = document.createElement("div");
    front.className = "flip-tile__face flip-tile__face--front";
    const back = document.createElement("div");
    back.className = "flip-tile__face flip-tile__face--back";

    inner.append(front, back);
    el.append(inner);

    inner.addEventListener("transitionend", (e) => {
      if (e.propertyName !== "transform") return;
      const tile = this.tiles.find((t) => t.el === el);
      if (tile && !tile.flipped) this.release(tile);
    });

    return { el, front, back, key: null, flipped: false };
  }

  /** `object-fit: cover`'s uniform scale + centered crop, in CSS px. */
  private coverRect(img: HTMLImageElement, rect: DOMRect) {
    const scale = Math.max(
      rect.width / img.naturalWidth,
      rect.height / img.naturalHeight,
    );
    const renderedW = img.naturalWidth * scale;
    const renderedH = img.naturalHeight * scale;
    return {
      size: `${renderedW}px ${renderedH}px`,
      offsetX: (renderedW - rect.width) / 2,
      offsetY: (renderedH - rect.height) / 2,
    };
  }

  private assign(tile: PooledTile, row: number, col: number, rect: DOMRect) {
    tile.key = `${row}:${col}`;
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    tile.el.style.left = `${x}px`;
    tile.el.style.top = `${y}px`;

    // Both faces use the FRONT image's mapping, even for the back face —
    // the two files are the same shot at very slightly different native
    // resolutions, so fitting each independently drifted a few px out of
    // alignment. Sharing one mapping keeps every flip exactly in place.
    const front = this.coverRect(this.frontImg, rect);
    tile.front.style.backgroundImage = `url(${this.frontImg.src})`;
    tile.front.style.backgroundSize = front.size;
    tile.front.style.backgroundPosition = `${-(front.offsetX + x)}px ${-(front.offsetY + y)}px`;

    const back = front;
    tile.back.style.backgroundImage = `url(${this.backImg.src})`;
    tile.back.style.backgroundSize = back.size;
    tile.back.style.backgroundPosition = `${-(back.offsetX + x)}px ${-(back.offsetY + y)}px`;

    this.pool.appendChild(tile.el);
    this.active.set(tile.key, tile);
  }

  private release(tile: PooledTile) {
    if (tile.key) this.active.delete(tile.key);
    tile.key = null;
    tile.el.remove();
  }

  private onMouseMove = (e: MouseEvent) => {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  };

  private onMouseLeave = () => {
    this.mouse.x = -9999;
    this.mouse.y = -9999;
  };

  private reset() {
    for (const tile of this.tiles) {
      tile.flipped = false;
      tile.el.classList.remove("is-flipped");
      if (tile.key) this.release(tile);
    }
  }

  private tick = () => {
    this.raf = requestAnimationFrame(this.tick);

    if (!this.frontImg.complete || !this.frontImg.naturalWidth) return;
    if (!this.backImg.complete || !this.backImg.naturalWidth) return;

    const rect = this.container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const wanted = new Set<string>();
    const spread = Math.ceil(HOVER_RADIUS / CELL_SIZE);
    const centerCol = Math.floor(this.mouse.x / CELL_SIZE);
    const centerRow = Math.floor(this.mouse.y / CELL_SIZE);
    const maxCol = Math.ceil(rect.width / CELL_SIZE) - 1;
    const maxRow = Math.ceil(rect.height / CELL_SIZE) - 1;

    for (let row = centerRow - spread; row <= centerRow + spread; row++) {
      if (row < 0 || row > maxRow) continue;
      for (let col = centerCol - spread; col <= centerCol + spread; col++) {
        if (col < 0 || col > maxCol) continue;

        const cx = col * CELL_SIZE + CELL_SIZE / 2;
        const cy = row * CELL_SIZE + CELL_SIZE / 2;
        if (Math.hypot(cx - this.mouse.x, cy - this.mouse.y) >= HOVER_RADIUS)
          continue;

        const key = `${row}:${col}`;
        wanted.add(key);
        if (this.active.has(key)) continue;

        const tile = this.tiles.find((t) => t.key === null);
        if (!tile) continue; // pool exhausted — the wave outruns it, rare and harmless

        this.assign(tile, row, col, rect);
        // Assign, then flip on the next frame so the browser has a resting
        // rotateY(0) to transition *from* instead of skipping the tween.
        requestAnimationFrame(() => {
          tile.flipped = true;
          tile.el.classList.add("is-flipped");
        });
      }
    }

    for (const [key, tile] of this.active) {
      if (wanted.has(key)) continue;
      tile.flipped = false;
      tile.el.classList.remove("is-flipped");
    }
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.container.removeEventListener("mousemove", this.onMouseMove);
    this.container.removeEventListener("mouseleave", this.onMouseLeave);
    this.reset();
  }
}
