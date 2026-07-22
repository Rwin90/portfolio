import * as THREE from "three";
import type { Gui } from "../core/gui";
import type { FrameContext, Updatable } from "../core/frame-context";
import { WORLD } from "../core/world-constants";
import type { BackgroundPlane } from "./background-plane";

// Hoisted scratch vectors — update() runs every frame and must not allocate.
const _ndc = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _forward = new THREE.Vector3();

/**
 * The point light the user asked for: it originates at the camera and paints
 * the back wall, following the mouse.
 *
 * Two lights do the work. `origin` sits just ahead of the camera and rim-lights
 * the rain passing near the lens — it tracks the camera down the box for free.
 * `paint` marks where the cursor ray meets the wall, and the wall's own shader
 * draws the soft glow around that point (a PointLight can't be aimed, only
 * placed, and its inverse-square falloff is too tight to paint a 360-wide wall).
 */
export class CursorLight implements Updatable {
  origin: THREE.PointLight;
  paint: THREE.PointLight;

  private helper?: THREE.PointLightHelper;

  private bg: BackgroundPlane;

  private position = new THREE.Vector3(0, WORLD.HEIGHT / 2, WORLD.BACK_Z);
  private target = new THREE.Vector3(0, WORLD.HEIGHT / 2, WORLD.BACK_Z);

  smoothing = 0.09;
  baseIntensity = 30;
  pulseAmplitude = 4;
  pulseSpeed = 0.8;

  constructor(scene: THREE.Scene, bg: BackgroundPlane, gui?: Gui) {
    this.bg = bg;

    this.origin = new THREE.PointLight(0x8fb0ff, 6, 30, 2);
    this.paint = new THREE.PointLight(0x2c4992, this.baseIntensity, 90, 2);
    this.paint.position.copy(this.position);

    scene.add(this.origin, this.paint);

    if (import.meta.env.DEV) {
      this.helper = new THREE.PointLightHelper(this.paint, 1);
      scene.add(this.helper);
    }

    this.setupGui(gui);
  }

  update(ctx: FrameContext) {
    // origin light rides just ahead of the camera.
    _forward.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion);
    this.origin.position.copy(ctx.cameraPos).addScaledVector(_forward, 2);

    // Cast the cursor into the scene. unproject mutates in place, no alloc.
    _ndc.set(ctx.mouse.x, ctx.mouse.y, 0.5).unproject(ctx.camera);
    _dir.copy(_ndc).sub(ctx.cameraPos).normalize();

    // Intersect the wall while the camera faces it; once it arcs to look down,
    // dir.z → 0 and the wall intersection blows up, so hand off to the floor.
    let hit = false;
    if (Math.abs(_dir.z) > 0.25) {
      const d = (WORLD.BACK_Z - ctx.cameraPos.z) / _dir.z;
      if (d > 0) {
        _hit.copy(ctx.cameraPos).addScaledVector(_dir, d);
        hit = true;
      }
    }
    if (!hit && Math.abs(_dir.y) > 0.25) {
      const d = (WORLD.FLOOR_Y - ctx.cameraPos.y) / _dir.y;
      if (d > 0) {
        _hit.copy(ctx.cameraPos).addScaledVector(_dir, d);
        hit = true;
      }
    }

    if (hit) {
      _hit.x = THREE.MathUtils.clamp(_hit.x, WORLD.X_MIN, WORLD.X_MAX);
      _hit.y = THREE.MathUtils.clamp(_hit.y, WORLD.FLOOR_Y, WORLD.TOP_Y);
      this.target.copy(_hit);
    }

    this.position.lerp(this.target, this.smoothing);
    this.paint.position.copy(this.position);
    this.bg.setPaintPosition(this.position);

    // Breathe around the base intensity. The previous code did `+= sin(...)`,
    // which integrates a signed sine sampled at irregular frame times into an
    // unbounded random walk.
    this.paint.intensity =
      this.baseIntensity +
      Math.sin(ctx.elapsed * this.pulseSpeed) * this.pulseAmplitude;
  }

  private setupGui(gui?: Gui) {
    if (!gui) return;

    const folder = gui.folder("Cursor Light");

    folder
      .addColor({ c: "#2c4992" }, "c")
      .name("paint color")
      .onChange((v: string) => {
        this.paint.color.set(v);
        this.bg.setPaintColor(new THREE.Color(v));
      });

    folder.add(this, "baseIntensity", 0, 80, 0.5).name("paint intensity");
    folder.add(this.paint, "distance", 10, 200, 1).name("paint distance");
    folder.add(this, "smoothing", 0.01, 0.3, 0.001).name("follow speed");
    folder.add(this, "pulseAmplitude", 0, 20, 0.1).name("pulse amp");
    folder.add(this, "pulseSpeed", 0, 3, 0.01).name("pulse speed");

    folder
      .addColor({ c: "#8fb0ff" }, "c")
      .name("origin color")
      .onChange((v: string) => this.origin.color.set(v));
    folder.add(this.origin, "intensity", 0, 30, 0.1).name("origin intensity");
    folder.add(this.origin, "distance", 5, 120, 1).name("origin distance");

    if (this.helper) {
      folder.add(this.helper, "visible").name("show helper");
    }
  }

  dispose() {
    this.origin.removeFromParent();
    this.paint.removeFromParent();
    this.helper?.dispose();
    this.helper?.removeFromParent();
  }
}
