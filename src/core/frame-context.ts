import type * as THREE from "three";

/**
 * Everything a subsystem is allowed to know about the current frame.
 *
 * A single instance is allocated once and mutated in place each frame, so
 * subsystems must read from it during their own update() and never hold on to
 * it. `cameraPos` in particular is a live reference, not a copy.
 */
export interface FrameContext {
  /** Seconds since the experience started. */
  elapsed: number;

  /** Seconds since the previous frame, clamped to survive tab-switches. */
  delta: number;

  /** Normalized scroll position over the whole page, 0 → 1. */
  scrollProgress: number;

  /** Lenis' signed scroll velocity. */
  scrollVelocity: number;

  /**
   * Scroll progress at which the camera starts arcing to the top-down view.
   * Derived from the `.outro` section's real offset.
   */
  splitT: number;

  /** Pointer in normalized device coordinates, -1 → 1 on both axes. */
  mouse: { x: number; y: number };

  /** Live world position of the camera. */
  cameraPos: THREE.Vector3;

  camera: THREE.PerspectiveCamera;
}

export interface Updatable {
  update(ctx: FrameContext): void;
  dispose?(): void;
}

export interface Resizable {
  resize(width: number, height: number, pixelRatio: number): void;
}
