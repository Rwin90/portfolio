import * as THREE from "three";
import type { Gui } from "../core/gui";
import type { FrameContext, Updatable } from "../core/frame-context";

type Shaft = {
  mesh: THREE.Mesh;
  speed: number;
  offset: number;
};

export class LightShafts implements Updatable {
  shafts: Shaft[] = [];

  private motionAmplitude = 15;
  private baseOpacity = 0.014;
  private flickerAmplitude = 0.05;
  private flickerSpeed = 0.4;
  private color = new THREE.Color(0.6, 29, 87);
  private visible = true;
  count: number;
  constructor(scene: THREE.Scene, count?: number, gui?: Gui) {
    const geometry = new THREE.PlaneGeometry(1, 140);
    this.count = count ?? 10;
    for (let i = 0; i < this.count; i++) {
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.6, 0.75, 1),
        transparent: true,
        opacity: 0.013 + Math.random() * 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.x = (Math.random() - 0.5) * 60;
      mesh.position.y = Math.random() * 40 - 20;
      mesh.position.z = -5 - Math.random() * 60;

      mesh.scale.x = 0.05 + Math.random() * 0.25;
      mesh.rotation.z = (Math.random() - 0.5) * 0.02;

      scene.add(mesh);

      this.shafts.push({
        mesh,
        speed: 0.02 + Math.random() * 0.06,
        offset: Math.random() * Math.PI * 2,
      });
    }

    if (gui) {
      const folder = gui.folder("Light Shafts");

      const params = {
        visible: this.visible,
        color: "#99bbff",

        motionAmplitude: this.motionAmplitude,

        baseOpacity: this.baseOpacity,
        flickerAmplitude: this.flickerAmplitude,
        flickerSpeed: this.flickerSpeed,

        depthWrite: false,

        posXMultiplier: 1,
        posYMultiplier: 1,
        posZMultiplier: 1,

        scaleXMultiplier: 1,

        rotZMultiplier: 1,

        speedMultiplier: 1,

        count: this.count,
      };

      folder.add(params, "visible").onChange((value: boolean) => {
        this.visible = value;
        for (const shaft of this.shafts) {
          shaft.mesh.visible = value;
        }
      });

      folder.addColor(params, "color").onChange((value: string) => {
        this.color.set(value);
        for (const shaft of this.shafts) {
          const material = shaft.mesh.material as THREE.MeshBasicMaterial;
          material.color.set(value);
        }
      });

      folder
        .add(params, "motionAmplitude", 0, 50, 0.001)
        .onChange((value: number) => {
          this.motionAmplitude = value;
        });

      folder
        .add(params, "baseOpacity", 0, 0.2, 0.0001)
        .onChange((value: number) => {
          this.baseOpacity = value;
        });

      folder
        .add(params, "flickerAmplitude", 0, 0.1, 0.0001)
        .onChange((value: number) => {
          this.flickerAmplitude = value;
        });

      folder
        .add(params, "flickerSpeed", 0, 10, 0.001)
        .onChange((value: number) => {
          this.flickerSpeed = value;
        });

      folder.add(params, "depthWrite").onChange((value: boolean) => {
        for (const shaft of this.shafts) {
          const material = shaft.mesh.material as THREE.MeshBasicMaterial;
          material.depthWrite = value;
          material.needsUpdate = true;
        }
      });

      folder
        .add(params, "posXMultiplier", -5, 5, 0.001)
        .onChange((value: number) => {
          for (const shaft of this.shafts) {
            shaft.mesh.position.x *= value;
          }
        });

      folder
        .add(params, "posYMultiplier", -5, 5, 0.001)
        .onChange((value: number) => {
          for (const shaft of this.shafts) {
            shaft.mesh.position.y *= value;
          }
        });

      folder
        .add(params, "posZMultiplier", -5, 5, 0.001)
        .onChange((value: number) => {
          for (const shaft of this.shafts) {
            shaft.mesh.position.z *= value;
          }
        });

      folder
        .add(params, "scaleXMultiplier", 0, 10, 0.001)
        .onChange((value: number) => {
          for (const shaft of this.shafts) {
            shaft.mesh.scale.x *= value;
          }
        });

      folder
        .add(params, "rotZMultiplier", -10, 10, 0.001)
        .onChange((value: number) => {
          for (const shaft of this.shafts) {
            shaft.mesh.rotation.z *= value;
          }
        });

      folder
        .add(params, "speedMultiplier", 0, 10, 0.001)
        .onChange((value: number) => {
          for (const shaft of this.shafts) {
            shaft.speed *= value;
          }
        });

      folder.add(params, "count").disable?.();
    }
  }

  update(ctx: FrameContext) {
    for (const shaft of this.shafts) {
      shaft.mesh.position.y =
        ctx.cameraPos.y +
        Math.sin(ctx.elapsed * shaft.speed + shaft.offset) *
          this.motionAmplitude;

      const material = shaft.mesh.material as THREE.MeshBasicMaterial;
      material.opacity =
        this.baseOpacity +
        Math.sin(ctx.elapsed * this.flickerSpeed + shaft.offset) *
          this.flickerAmplitude;
    }
  }

  dispose() {
    for (const shaft of this.shafts) {
      shaft.mesh.geometry.dispose();
      (shaft.mesh.material as THREE.Material).dispose();
      shaft.mesh.removeFromParent();
    }
    this.shafts.length = 0;
  }
}
