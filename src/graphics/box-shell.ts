import * as THREE from "three";
import type { Gui } from "../core/gui";
import { WORLD } from "../core/world-constants";

/**
 * The physical shell of the box: currently just the floor.
 *
 * Deliberately no ceiling (the cube rain has to fall from open sky) and no
 * side walls (they're never in frame at fov 35 looking down -Z, and each one
 * would add another surface to the glass transmission pass for no payoff).
 */
export class BoxShell {
  floor: THREE.Mesh;

  private readonly material: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, gui?: Gui) {
    const geometry = new THREE.PlaneGeometry(WORLD.WIDTH, WORLD.DEPTH);

    this.material = new THREE.MeshStandardMaterial({
      color: 0x0a0a12,
      roughness: 0.82,
      metalness: 0.15,
    });

    this.floor = new THREE.Mesh(geometry, this.material);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(
      0,
      WORLD.FLOOR_Y,
      WORLD.BACK_Z + WORLD.DEPTH / 2,
    );

    scene.add(this.floor);

    if (gui) {
      const folder = gui.folder("Box Shell");

      const params = { color: "#0a0a12", visible: true };

      folder.addColor(params, "color").onChange((v: string) => {
        this.material.color.set(v);
      });

      folder.add(this.material, "roughness", 0, 1, 0.01);
      folder.add(this.material, "metalness", 0, 1, 0.01);

      folder.add(params, "visible").onChange((v: boolean) => {
        this.floor.visible = v;
      });

      folder.add(this.floor.position, "y", -60, 20, 0.5).name("floorY");
    }
  }

  dispose() {
    this.floor.geometry.dispose();
    this.material.dispose();
    this.floor.removeFromParent();
  }
}
