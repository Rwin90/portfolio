import * as THREE from "three";
import { Experience } from "./experience";

export class Camera {
  private experience: Experience;
  public instance: THREE.PerspectiveCamera;

  constructor(experience: Experience) {
    this.experience = experience;

    this.instance = new THREE.PerspectiveCamera(
      35,
      this.experience.sizes.width / this.experience.sizes.height,
      0.1,
      100,
    );

    this.instance.position.set(0, 0, 8);

    this.experience.scene.add(this.instance);
  }

  resize() {
    this.instance.aspect =
      this.experience.sizes.width / this.experience.sizes.height;

    this.instance.updateProjectionMatrix();
  }

  update() {}
}
