import * as THREE from "three";

export class SceneManager {
  scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();

    this.scene.background = new THREE.Color("#02040a");

    // this.scene.fog = new THREE.FogExp2("#02040a", 0.008);
  }
}
