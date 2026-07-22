import * as THREE from "three";

import type { FrameContext, Updatable } from "./frame-context";
import { WORLD, TOP_DOWN_RADIUS } from "./world-constants";

// Hoisted scratch objects — update() runs every frame and must not allocate.
//
// Orientation goes through Matrix4.lookAt rather than Object3D.lookAt: for a
// plain Object3D the latter aims +Z at the target, while a camera looks down
// -Z. Using an Object3D here points the camera 180° away from the wall.
const _lookMatrix = new THREE.Matrix4();
const _up = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _target = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _euler = new THREE.Euler();

/**
 * Drives the camera down the height of the box as the page scrolls.
 *
 * Two phases:
 *   t < splitT   descend along -Y at fixed X and depth, facing the back wall
 *                dead-on. Linear, so constant scrolling reads as constant
 *                travel.
 *   t >= splitT  swing down and over the pyramid on a circular arc, ending
 *                looking straight down at the floor.
 *
 * Orientation is built as a quaternion rather than by writing euler angles and
 * then calling lookAt(). lookAt() overwrites the whole quaternion, so the
 * previous implementation silently discarded every bit of mouse parallax and
 * scroll roll it had just computed.
 */
export class CameraManager implements Updatable {
  camera: THREE.PerspectiveCamera;

  /** Pivot the top-down arc swings around: the foot of the pyramid. */
  private readonly pivot = new THREE.Vector3(
    WORLD.PYRAMID.x,
    WORLD.FLOOR_Y,
    WORLD.PYRAMID.z,
  );

  /** Unit vector from the pivot to where the camera enters the arc. */
  private readonly arcAxis = new THREE.Vector3();
  private arcStartRadius = 0;

  private readonly arcRotation = new THREE.Quaternion();
  private readonly arcStep = new THREE.Quaternion();
  private readonly identity = new THREE.Quaternion();

  private readonly basePos = new THREE.Vector3();
  private readonly baseLook = new THREE.Vector3();
  private readonly phaseALook = new THREE.Vector3();

  private readonly baseQuat = new THREE.Quaternion();
  private readonly parallaxQuat = new THREE.Quaternion();
  private readonly desiredQuat = new THREE.Quaternion();

  targetRotationX = 0;
  targetRotationY = 0;
  currentRotationX = 0;
  currentRotationY = 0;
  rollZ = 0;

  /** How far through the top-down arc we are, 0 → 1. Exposed for debugging. */
  arcBlend = 0;

  /**
   * When false the camera stops driving itself, so OrbitControls (or anything
   * else) can take over without the two fighting for the transform each frame.
   */
  enabled = true;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      // A 0.1 near plane across a 360-unit world wastes depth precision.
      0.5,
      800,
    );

    this.camera.position.set(WORLD.CAM_X, WORLD.CAM_Y_START, WORLD.CAM_Z);

    // Geometry of the arc, computed once: where the camera enters it and how
    // far out from the pivot that is.
    this.arcAxis
      .set(WORLD.CAM_X, WORLD.CAM_Y_END, WORLD.CAM_Z)
      .sub(this.pivot);
    this.arcStartRadius = this.arcAxis.length();
    this.arcAxis.normalize();

    // Rotation that takes the entry direction all the way to straight-up, so
    // the camera ends directly above the pyramid looking down.
    this.arcRotation.setFromUnitVectors(this.arcAxis, new THREE.Vector3(0, 1, 0));

    this.phaseALook.set(WORLD.CAM_X, WORLD.CAM_Y_END, WORLD.BACK_Z);
  }

  update(ctx: FrameContext) {
    if (!this.enabled) {
      this.camera.getWorldPosition(ctx.cameraPos);
      return;
    }

    this.updatePath(ctx.scrollProgress, ctx.splitT);

    this.updateMouseParallax(ctx.mouse);

    this.updateOrientation(ctx.scrollVelocity);

    this.updatePosition(ctx.scrollVelocity, ctx.elapsed);

    // Publish the resolved world position for everything downstream. The
    // camera is registered first precisely so this is fresh when they read it.
    this.camera.getWorldPosition(ctx.cameraPos);
  }

  /** Writes basePos/baseLook for this scroll position and sets arcBlend. */
  private updatePath(t: number, splitT: number) {
    const split = THREE.MathUtils.clamp(splitT, 0.05, 0.99);

    if (t < split) {
      // PHASE A — descend the box, facing the wall.
      const u = t / split;
      const y = THREE.MathUtils.lerp(WORLD.CAM_Y_START, WORLD.CAM_Y_END, u);

      this.basePos.set(WORLD.CAM_X, y, WORLD.CAM_Z);
      this.baseLook.set(WORLD.CAM_X, y, WORLD.BACK_Z);
      this.arcBlend = 0;
      return;
    }

    // PHASE B — arc up and over the pyramid.
    // smoothstep has zero derivative at 0, so the seam with phase A is smooth.
    const raw = (t - split) / (1 - split);
    const v = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(raw, 0, 1), 0, 1);
    this.arcBlend = v;

    this.arcStep.copy(this.identity).slerp(this.arcRotation, v);
    _dir.copy(this.arcAxis).applyQuaternion(this.arcStep);

    const radius = THREE.MathUtils.lerp(this.arcStartRadius, TOP_DOWN_RADIUS, v);

    this.basePos.copy(this.pivot).addScaledVector(_dir, radius);
    this.baseLook.copy(this.phaseALook).lerp(this.pivot, v);
  }

  private updateMouseParallax(mouse: { x: number; y: number }) {
    this.targetRotationX = mouse.y * 0.08;
    this.targetRotationY = mouse.x * 0.12;

    this.currentRotationX +=
      (this.targetRotationX - this.currentRotationX) * 0.04;

    this.currentRotationY +=
      (this.targetRotationY - this.currentRotationY) * 0.04;
  }

  private updateOrientation(scrollVelocity: number) {
    // Blend "up" toward -Z as we go over the top. Looking straight down with
    // up = (0,1,0) is degenerate and the roll pops; this keeps it defined.
    const v = this.arcBlend;
    _up.set(0, 1 - v, -v).normalize();

    _lookMatrix.lookAt(this.basePos, this.baseLook, _up);
    this.baseQuat.setFromRotationMatrix(_lookMatrix);

    this.rollZ = THREE.MathUtils.clamp(
      scrollVelocity * 0.00025,
      -0.05,
      0.05,
    );

    _euler.set(this.currentRotationX, this.currentRotationY, this.rollZ, "YXZ");
    this.parallaxQuat.setFromEuler(_euler);

    // POST-multiply: parallax is applied in the camera's own frame, so yaw is
    // around its up axis and roll survives — the same whether we're horizontal
    // or looking straight down.
    this.desiredQuat.copy(this.baseQuat).multiply(this.parallaxQuat);

    this.camera.quaternion.slerp(this.desiredQuat, 0.12);
  }

  private updatePosition(scrollVelocity: number, elapsed: number) {
    // Mouse parallax and idle breathing, as a camera-local translation.
    _offset
      .set(
        this.currentRotationY * 12 + Math.sin(elapsed * 0.08) * 0.3,
        this.currentRotationX * 10 + Math.sin(elapsed * 0.12) * 0.2,
        0,
      )
      .applyQuaternion(this.camera.quaternion);

    // Fast scrolling eases the camera back along its own view axis.
    const velocity = Math.min(Math.abs(scrollVelocity), 40) * 0.045;
    _forward.set(0, 0, 1).applyQuaternion(this.camera.quaternion);

    _target
      .copy(this.basePos)
      .add(_offset)
      .addScaledVector(_forward, velocity);

    this.camera.position.lerp(_target, 0.12);
  }

  // Driven by Sizes — the app's single resize listener.
  resize(width: number, height: number) {
    this.camera.aspect = width / height;

    this.camera.updateProjectionMatrix();
  }
}
