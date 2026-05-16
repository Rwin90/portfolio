import * as THREE from "three";
import type { Gui } from "../core/gui";

export class BackgroundPlane {
  private readonly material: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene, gui?: Gui) {
    const geometry = new THREE.PlaneGeometry(2, 2);

    const params = {
      topColor: "#0f172a",
      bottomColor: "#020617",
    };

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(params.topColor) },
        uBottomColor: { value: new THREE.Color(params.bottomColor) },
      },
      vertexShader: `
        void main() {
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;

        void main() {
          float mixStrength = gl_FragCoord.y / 1080.0;
          vec3 color = mix(uBottomColor, uTopColor, mixStrength);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.frustumCulled = false;

    scene.add(mesh);

    const folder = gui?.folder("Background");

    folder?.addColor(params, "topColor").onChange((v: string) => {
      this.material.uniforms.uTopColor.value.set(v);
    });

    folder?.addColor(params, "bottomColor").onChange((v: string) => {
      this.material.uniforms.uBottomColor.value.set(v);
    });
  }
}
