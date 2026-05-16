import * as THREE from "three";
import type { Gui } from "../core/gui";

export class BackgroundPlane {
  private readonly material: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene, gui?: Gui) {
    const geometry = new THREE.PlaneGeometry(200, 200);

    const params = {
      topColor: "#270d63",
      bottomColor: "#160134",
    };

    this.material = new THREE.ShaderMaterial({
      lights: true,

      depthWrite: false,
      depthTest: false,

      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib["lights"],
        {
          uTopColor: { value: new THREE.Color(params.topColor) },
          uBottomColor: { value: new THREE.Color(params.bottomColor) },

          // Increased to be visible but still premium subtle
          uLightStrength: { value: 0.9 },

          // Lower = wider softer glow
          uAtmosphereSoftness: { value: 0.08 },
        },
      ]),

      vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;

      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

      fragmentShader: `
    precision highp float;

    uniform vec3 uTopColor;
    uniform vec3 uBottomColor;
    uniform float uLightStrength;
    uniform float uAtmosphereSoftness;

    varying vec2 vUv;
    varying vec3 vWorldPosition;

    #include <common>
    #include <lights_pars_begin>

    void main() {

      // --------------------------------------------------
      // 1. Atmospheric Vertical Gradient (Design System)
      // --------------------------------------------------

      float gradient = smoothstep(0.0, 1.0, vUv.y);

      vec3 baseColor = mix(
        uBottomColor,
        uTopColor,
        gradient
      );

      // --------------------------------------------------
      // 2. Cursor Light Atmospheric Glow
      // --------------------------------------------------
      // Distance-based radial glow.
      // This creates depth without overpowering hierarchy.
      // More cinematic than Lambert diffuse.

      vec3 glowAccum = vec3(0.0);

      #if NUM_POINT_LIGHTS > 0
        for (int i = 0; i < NUM_POINT_LIGHTS; i++) {

          vec3 lightPos = pointLights[i].position;

          float dist = distance(vWorldPosition, lightPos);

          // Radial falloff (physically inspired but art-directed)
          float glow = 1.0 / (1.0 + dist * dist * uAtmosphereSoftness);

          // Shape the highlight for premium softness
          glow = pow(glow, 1.6);

          glowAccum += pointLights[i].color * glow;
        }
      #endif

      // --------------------------------------------------
      // 3. Subtle Center Vignette (Layered Depth)
      // --------------------------------------------------
      // Supports:
      // - strong visual hierarchy (design-direction.md)
      // - layered depth
      // - strong focal points (ui-ux.md)

      float vignette = smoothstep(0.8, 0.2, length(vUv - 0.5));
      baseColor *= vignette;

      // --------------------------------------------------
      // 4. Final Blend
      // --------------------------------------------------

      vec3 finalColor = baseColor + glowAccum * uLightStrength;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
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
