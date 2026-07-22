import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { WORLD } from "./world-constants";

/**
 * DEV-only scaffolding: draws the bounds of the box and landmarks along its
 * length so you can tell at a glance whether the camera is where you think.
 */
export class DebugWorld {
  controls?: OrbitControls;

  private objects: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene) {
    // BOX BOUNDS
    const box = new THREE.Box3(
      new THREE.Vector3(WORLD.X_MIN, WORLD.FLOOR_Y, WORLD.BACK_Z),
      new THREE.Vector3(WORLD.X_MAX, WORLD.TOP_Y, WORLD.FRONT_Z),
    );
    this.add(scene, new THREE.Box3Helper(box, new THREE.Color(0x2244aa)));

    // FLOOR GRID at the bottom of the box
    const grid = new THREE.GridHelper(
      WORLD.WIDTH,
      WORLD.WIDTH / 10,
      0x444444,
      0x222222,
    );
    grid.position.set(0, WORLD.FLOOR_Y + 0.05, WORLD.BACK_Z + WORLD.DEPTH / 2);
    this.add(scene, grid);

    // ORIGIN AXES
    this.add(scene, new THREE.AxesHelper(30));

    // LANDMARKS DOWN THE CAMERA RAIL
    for (let y = WORLD.FLOOR_Y; y <= WORLD.TOP_Y; y += 60) {
      this.createMarker(scene, y);
    }

    // PYRAMID SITE
    this.createMarker(scene, WORLD.FLOOR_Y, 0xff8844);
  }

  private add(scene: THREE.Scene, object: THREE.Object3D) {
    scene.add(object);
    this.objects.push(object);
  }

  addOrbit(camera: THREE.Camera, element: HTMLCanvasElement) {
    this.controls = new OrbitControls(camera, element);

    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, WORLD.HEIGHT / 2, WORLD.BACK_Z);
  }

  updateControl() {
    this.controls?.update();
  }

  createMarker(scene: THREE.Scene, y: number, color = 0x5555ff) {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshBasicMaterial({ color, wireframe: true });

    const marker = new THREE.Mesh(geometry, material);
    marker.position.set(WORLD.X_MIN - 3, y, WORLD.BACK_Z + 6);

    this.add(scene, marker);
  }

  dispose() {
    this.controls?.dispose();
    for (const object of this.objects) object.removeFromParent();
    this.objects.length = 0;
  }
}
