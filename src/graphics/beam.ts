import * as THREE from "three";

import vertexShader from "../shaders/lightShaft.vert.glsl";
import fragmentShader from "../shaders/lightShaft.frag.glsl";
import type { Mouse } from "../core/mouse";
import type { Gui } from "../core/gui";

export class Beam {
  private mesh: THREE.InstancedMesh;
  private material: THREE.ShaderMaterial;
  private count: number;

  constructor(scene: THREE.Scene, count: number = 55, gui?: Gui) {
    this.count = count;

    const geometry = new THREE.PlaneGeometry(0.2, Math.random() * 95, 64, 64);

    const offsets = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;

      offsets[i3 + 0] = (Math.random() - 0.5) * 32;
      offsets[i3 + 1] = (Math.random() - 0.5) * 30;
      offsets[i3 + 2] = (Math.random() - 0.5) * -20;
    }

    geometry.setAttribute(
      "instanceOffset",
      new THREE.InstancedBufferAttribute(offsets, 3),
    );

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,

      transparent: true,
      depthWrite: false,
      depthTest: true,

      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3() },
        uRadius: { value: 1.5 },
      },
    });

    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.count);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.count; i++) {
      dummy.position.set(0, 0, 0);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }

    this.mesh.frustumCulled = false;

    // scene.add(this.mesh);

    //
    // GUI
    //
    if (gui) {
      const folder = gui.folder("Beams");

      folder
        .add(this.material.uniforms.uRadius, "value", 0.1, 10)
        .name("interactionRadius");

      folder.add(this.material, "transparent");

      folder.add(this.material, "depthWrite");

      folder.add(this.material, "depthTest");

      folder.add(this.mesh, "frustumCulled");
    }
  }

  update(time: number, mouse: Mouse) {
    this.material.uniforms.uTime.value = time;

    const smoothMouse = new THREE.Vector3();

    smoothMouse.lerp(
      new THREE.Vector3(mouse.normalized.x, mouse.normalized.y, 0),
      0.08,
    );

    this.material.uniforms.uMouse.value.copy(smoothMouse);
  }
}
