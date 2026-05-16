import * as THREE from "three";
import type { Gui } from "../core/gui";

export class CursorLight {
  light: THREE.PointLight;

  private position = new THREE.Vector3();

  private smoothing = 0.42;

  private pulseAmplitude = 0.3;
  private pulseSpeed = 0.8;

  constructor(scene: THREE.Scene, gui?: Gui) {
    this.light = new THREE.PointLight(0x88aaff, 5, 30, 2);
    this.light.position.set(0, 0, 5);

    scene.add(this.light);
    const helper = new THREE.PointLightHelper(this.light, 0.5);
    scene.add(helper);

    if (gui) {
      const folder = gui.folder("Cursor Light");

      const params = {
        color: "#88aaff",

        intensity: this.light.intensity,
        distance: this.light.distance,
        decay: this.light.decay,

        smoothing: this.smoothing,

        pulseAmplitude: this.pulseAmplitude,
        pulseSpeed: this.pulseSpeed,

        posX: this.light.position.x,
        posY: this.light.position.y,
        posZ: this.light.position.z,

        visible: this.light.visible,
      };

      folder.addColor(params, "color").onChange((v: string) => {
        this.light.color.set(v);
      });

      folder.add(params, "intensity", 0, 20, 0.01).onChange((v: number) => {
        this.light.intensity = v;
      });

      folder.add(params, "distance", 1, 200, 0.1).onChange((v: number) => {
        this.light.distance = v;
      });

      folder.add(params, "decay", 0, 5, 0.01).onChange((v: number) => {
        this.light.decay = v;
      });

      folder
        .add(params, "smoothing", 0.01, 0.4, 0.001)
        .onChange((v: number) => {
          this.smoothing = v;
        });

      folder
        .add(params, "pulseAmplitude", 0, 2, 0.001)
        .onChange((v: number) => {
          this.pulseAmplitude = v;
        });

      folder.add(params, "pulseSpeed", 0, 5, 0.001).onChange((v: number) => {
        this.pulseSpeed = v;
      });

      folder.add(params, "visible").onChange((v: boolean) => {
        this.light.visible = v;
      });

      folder.add(params, "posZ", -50, 50, 0.01).onChange((v: number) => {
        this.light.position.z = v;
      });
    }
  }

  update(target: THREE.Vector3, time: number) {
    this.position.lerp(
      new THREE.Vector3(target.x, target.y, 35),
      //   target,
      this.smoothing,
    );

    // console.log(this.position);
    this.light.position.copy(this.position);

    const pulse = Math.sin(time * this.pulseSpeed) * this.pulseAmplitude;

    this.light.intensity += pulse * 0.02;
  }
}
