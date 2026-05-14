import * as THREE from "three";
import { Experience } from "./experience";

export class Renderer {
  private experience: Experience;
  public instance: THREE.WebGLRenderer;

  constructor(experience: Experience) {
    this.experience = experience;

    this.instance = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    this.instance.setSize(
      this.experience.sizes.width,
      this.experience.sizes.height,
    );

    this.instance.setPixelRatio(this.experience.sizes.pixelRatio);

    this.instance.outputColorSpace = THREE.SRGBColorSpace;

    document.body.appendChild(this.instance.domElement);
  }

  resize() {
    this.instance.setSize(
      this.experience.sizes.width,
      this.experience.sizes.height,
    );

    this.instance.setPixelRatio(this.experience.sizes.pixelRatio);
  }

  update() {
    this.instance.render(
      this.experience.scene,
      this.experience.camera.instance,
    );
  }
}
