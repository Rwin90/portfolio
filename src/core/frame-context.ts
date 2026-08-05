import type * as THREE from "three";

/**
 * Everything a subsystem is allowed to know about the current frame.
 *
 * A single instance is allocated once and mutated in place each frame, so
 * subsystems must read from it during their own update() and never hold on to
 * it.
 */
export interface FrameContext {
  /** Seconds since the experience started. */
  elapsed: number;

  /** Seconds since the previous frame, clamped to survive tab-switches. */
  delta: number;

  /** Normalized scroll position over the whole page, 0 → 1. */
  scrollProgress: number;

  camera: THREE.PerspectiveCamera;
}

export interface Updatable {
  update(ctx: FrameContext): void;
  dispose?(): void;
}

export interface Resizable {
  resize(width: number, height: number, pixelRatio: number): void;
}
