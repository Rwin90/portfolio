import * as THREE from "three";
import type { Gui } from "../core/gui";
import type { FrameContext, Updatable } from "../core/frame-context";

export class LightingSystem implements Updatable {
  ambient: THREE.AmbientLight;
  key: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  glow: THREE.PointLight;

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
    this.glow = new THREE.PointLight(0x88aaff, 1.5, 80);

    this.glow.position.set(0, 5, 10);

    scene.add(this.glow);

    this.setupGui(gui);
  }

  setupGui(gui?: Gui) {
    if (!gui) return;

    const folder = gui.folder("Lighting");

    folder.add(this.ambient, "intensity", 0, 2, 0.01).name("ambient");
    folder.add(this.key, "intensity", 0, 4, 0.01).name("key");
    folder.add(this.rim, "intensity", 0, 4, 0.01).name("rim");
    folder.add(this.glow, "intensity", 0, 6, 0.01).name("glow");
    folder.add(this.glow, "distance", 0, 300, 1).name("glow distance");
  }

  update(ctx: FrameContext) {
    //
    // subtle cinematic breathing
    //
    this.key.intensity = 1.35 + Math.sin(ctx.elapsed * 0.2) * 0.1;

    this.rim.intensity = 0.7 + Math.sin(ctx.elapsed * 0.15) * 0.08;
  }
}
