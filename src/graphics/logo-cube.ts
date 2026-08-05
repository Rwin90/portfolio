import * as THREE from "three";
import { createGlassMaterial } from "./glass-material";
import { createEnvironmentMap } from "./createEnviormentMap";

/**
 * The little glass cube beside the nav logo, spinning with scroll. It gets
 * its own tiny WebGL canvas and renderer instead of living inside the main
 * 3D scene — a separate DOM layer painted after the page's blur/tint
 * overlay, so it reads crisp and untouched instead of soft and dimmed.
 *
 * The overhead is negligible: one extra WebGL context rendering a single
 * box at a few dozen pixels square, no post-processing.
 */
export class LogoCube {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private group = new THREE.Group();

  private material: THREE.MeshPhysicalMaterial;
  private edgeMaterial: THREE.LineBasicMaterial;

  /** Full turns across the whole scroll. */
  turns = 4;
  /** Lower = smoother / more lag behind the scroll. */
  smoothing = 0.045;
  /** Max Z tilt (radians) at the edges of the viewport. */
  tiltStrength = 0.5;

  private targetRotY = 0;
  private currentRotY = 0;

  private mouseX = 0;
  private targetTiltZ = 0;
  private currentTiltZ = 0;

  private onMouseMove = (e: MouseEvent) => {
    this.mouseX = (e.clientX / innerWidth) * 2 - 1;
  };

  constructor(canvas: HTMLCanvasElement, size = 28) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.setSize(size, size, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene.environment = createEnvironmentMap(this.renderer);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10);
    this.camera.position.set(0, 0, 3.4);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = createGlassMaterial();
    const mesh = new THREE.Mesh(geometry, this.material);

    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      this.edgeMaterial,
    );

    this.group.add(mesh, edges);
    this.scene.add(this.group);

    addEventListener("mousemove", this.onMouseMove, { passive: true });
  }

  update(elapsed: number, scrollProgress: number) {
    this.targetRotY = scrollProgress * Math.PI * 2 * this.turns;
    this.currentRotY += (this.targetRotY - this.currentRotY) * this.smoothing;
    this.group.rotation.y = this.currentRotY;

    // A whisper of idle tilt so it reads as 3D even when scroll is still.
    this.group.rotation.x = Math.sin(elapsed * 0.3) * 0.12;

    // A second, independent axis driven by the pointer's horizontal
    // position, eased the same way as the scroll-driven spin.
    this.targetTiltZ = this.mouseX * this.tiltStrength;
    this.currentTiltZ +=
      (this.targetTiltZ - this.currentTiltZ) * this.smoothing;
    this.group.rotation.z = this.currentTiltZ;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    removeEventListener("mousemove", this.onMouseMove);
    this.material.dispose();
    this.edgeMaterial.dispose();
    this.renderer.dispose();
  }
}
