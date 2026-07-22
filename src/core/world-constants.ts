/**
 * The scene is one tall vertical box — a tetris well — that the camera
 * descends as the page scrolls. Every subsystem that needs to know where the
 * world is reads from here rather than carrying its own magic numbers.
 *
 * The long axis is Y: the camera starts high (hero) and travels DOWN, facing
 * the back wall the whole way, until it arcs into a top-down view of the
 * pyramid sitting on the floor at the bottom.
 *
 * Sizing rationale: at fov 35 and a camera 45 units off the back wall, the
 * visible height is 2 * 45 * tan(17.5°) ≈ 28.4 and the visible width at 16:9
 * is ≈ 50, so a 60-wide wall fills the frame and the viewer sees a ~28-tall
 * band of the box's height at any moment.
 */
export const WORLD = {
  // Width of the box, along X — the short axis, fills the frame horizontally.
  X_MIN: -30,
  X_MAX: 30,
  WIDTH: 60,

  // Height of the box, along Y — the long axis the camera descends.
  FLOOR_Y: 0,
  TOP_Y: 320,
  HEIGHT: 320,

  // Depth of the box, along Z. The camera looks toward BACK_Z.
  BACK_Z: -45,
  FRONT_Z: 15,
  DEPTH: 60,

  // Camera rail: it descends Y at this fixed X and Z, facing -Z.
  CAM_X: 0,
  CAM_Z: 0,
  CAM_Y_START: 290,
  CAM_Y_END: 40,

  // The pyramid sits on the floor at the bottom, revealed by the top-down arc.
  PYRAMID: { x: 0, z: -25 },

  // Cubes rain down and wink out above this height, keeping the pyramid clear.
  RAIN_CLEAR_Y: 50,
} as const;

/** Radius the camera holds when looking straight down at the pyramid. */
export const TOP_DOWN_RADIUS = 75;
