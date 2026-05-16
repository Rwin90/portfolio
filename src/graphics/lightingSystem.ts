import * as THREE from "three";
import type { Gui } from "../core/gui";

export class LightingSystem {
  ambient: THREE.AmbientLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;

  constructor(scene: THREE.Scene, gui?: Gui) {
    //
    // AMBIENT BASE
    //
    this.ambient = new THREE.AmbientLight(0xffffff, 0.18);

    scene.add(this.ambient);

    //
    // MAIN KEY LIGHT
    //
    this.key = new THREE.DirectionalLight(0xaac8ff, 1.4);

    this.key.position.set(-6, 10, 8);

    scene.add(this.key);

    //
    // RIM LIGHT (DEPTH SEPARATION)
    //
    this.rim = new THREE.DirectionalLight(0x5577ff, 0.8);

    this.rim.position.set(6, -4, -8);

    scene.add(this.rim);

    //
    // EXTRA ATMOSPHERIC POINT LIGHT
    //
    const glow = new THREE.PointLight(0x88aaff, 1.5, 80);

    glow.position.set(0, 5, 10);

    scene.add(glow);
  }

  update(time: number) {
    //
    // subtle cinematic breathing
    //
    this.key.intensity = 1.35 + Math.sin(time * 0.2) * 0.1;

    this.rim.intensity = 0.7 + Math.sin(time * 0.15) * 0.08;
  }
}
