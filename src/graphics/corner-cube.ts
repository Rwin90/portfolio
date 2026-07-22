import * as THREE from "three";
import type { Gui } from "../core/gui";
import type { FrameContext, Updatable } from "../core/frame-context";
import { createGlassMaterial } from "./glass-material";

/**
 * A single glass cube pinned to a corner of the viewport, spinning on Y as you
 * scroll. It's parented to the camera, so it holds its screen position through
 * the whole descent and the top-down arc — a fixed HUD element rather than
 * something living in the world.
 */
export class CornerCube implements Updatable {
  private group = new THREE.Group();
  private mesh: THREE.Mesh;
  private edges: THREE.LineSegments;
  private material: THREE.MeshPhysicalMaterial;
  private edgeMaterial: THREE.LineBasicMaterial;

  /** Distance in front of the camera; also sets the on-screen size. */
  distance = 20;
  /** Fraction of the half-frame to inset from the corner. */
  inset = 0.85;
  /** −1 left / +1 right, −1 bottom / +1 top. */
  cornerX = -1;
  cornerY = -1;

  /** Full turns across the whole scroll. */
  turns = 2;
  /** Lower = smoother / more lag behind the scroll. */
  smoothing = 0.045;

  private targetRotY = 0;
  private currentRotY = 0;

  constructor(camera: THREE.PerspectiveCamera, gui?: Gui) {
    const size = 0.6;
    const geometry = new THREE.BoxGeometry(size, size, size);

    this.material = createGlassMaterial();
    this.mesh = new THREE.Mesh(geometry, this.material);

    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      this.edgeMaterial,
    );

    this.group.add(this.mesh, this.edges);
    // Render on top of the scene regardless of depth, so it always reads as a
    // foreground UI element.
    this.group.renderOrder = 10;

    camera.add(this.group);

    this.setupGui(gui);
  }

  update(ctx: FrameContext) {
    // Keep it pinned to the corner even as the aspect changes on resize.
    const halfH =
      Math.tan(THREE.MathUtils.degToRad(ctx.camera.fov) / 2) * this.distance;
    const halfW = halfH * ctx.camera.aspect;
    this.group.position.set(
      this.cornerX * halfW * this.inset,
      this.cornerY * halfH * this.inset,
      -this.distance,
    );

    // Bind Y rotation to scroll, eased so it trails the scroll smoothly.
    this.targetRotY = ctx.scrollProgress * Math.PI * 2 * this.turns;
    this.currentRotY += (this.targetRotY - this.currentRotY) * this.smoothing;
    this.group.rotation.y = this.currentRotY;

    // A whisper of idle tilt so it reads as 3D even when scroll is still.
    this.group.rotation.x = Math.sin(ctx.elapsed * 0.3) * 0.12;
  }

  private setupGui(gui?: Gui) {
    if (!gui) return;
    const folder = gui.folder("Corner Cube");
    folder.add(this, "turns", 0, 6, 0.1).name("turns / scroll");
    folder.add(this, "smoothing", 0.01, 0.3, 0.005).name("smoothing");
    folder.add(this, "distance", 4, 20, 0.5).name("distance");
    folder.add(this, "inset", 0.4, 1, 0.01).name("corner inset");
    folder.add(this, "cornerX", { left: -1, right: 1 }).name("corner X");
    folder.add(this, "cornerY", { bottom: -1, top: 1 }).name("corner Y");
    folder.add(this.group, "visible").name("visible");
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.edges.geometry.dispose();
    this.edgeMaterial.dispose();
    this.group.removeFromParent();
  }
}
