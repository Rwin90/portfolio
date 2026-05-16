import * as THREE from "three";

export class DebugWorld {
  constructor(scene: THREE.Scene) {
    // MAIN GRID
    const grid = new THREE.GridHelper(120, 60, 0x444444, 0x222222);

    grid.position.y = -80;

    scene.add(grid);

    // AXES
    const axes = new THREE.AxesHelper(30);
    axes.position.set(0, -80, 0);
    scene.add(axes);

    // VERTICAL DEPTH PLANES
    this.createDepthPlane(scene, -10);
    this.createDepthPlane(scene, -25);
    this.createDepthPlane(scene, -40);

    // SCROLL LANDMARKS
    this.createMarker(scene, 0, "TOP");
    this.createMarker(scene, -40, "MID");
    this.createMarker(scene, -80, "BOTTOM");
  }

  createDepthPlane(scene: THREE.Scene, z: number) {
    const geometry = new THREE.PlaneGeometry(160, 160, 40, 40);

    const material = new THREE.MeshBasicMaterial({
      color: 0x3333ff,

      wireframe: true,

      transparent: true,

      opacity: 0.001,
    });

    const plane = new THREE.Mesh(geometry, material);

    plane.position.z = z;

    scene.add(plane);
  }

  createMarker(scene: THREE.Scene, y: number, label: string) {
    const geometry = new THREE.BoxGeometry(4, 1, 4);

    const material = new THREE.MeshBasicMaterial({
      color: 0x5555ff,

      wireframe: true,
    });

    const marker = new THREE.Mesh(geometry, material);

    marker.position.set(0, y, -10);

    scene.add(marker);

    console.log(label, y);
  }
}
