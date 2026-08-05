/**
 * The per-frame values `Experience` tracks across its own render loop.
 *
 * A single instance is allocated once and mutated in place each frame.
 */
export interface FrameContext {
  /** Seconds since the experience started. */
  elapsed: number;

  /** Seconds since the previous frame, clamped to survive tab-switches. */
  delta: number;

  /** Normalized scroll position over the whole page, 0 → 1. */
  scrollProgress: number;
}
