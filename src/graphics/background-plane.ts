import * as THREE from "three";
import type { Gui } from "../core/gui";
import { WORLD } from "../core/world-constants";

// How much farther behind the box's nominal back wall (WORLD.BACK_Z) the
// visual backdrop sits. Pushed back so it reads as distant atmosphere rather
// than a wall right behind the rain/pyramid.
const BG_Z_OFFSET = 80;

export class BackgroundPlane {
  readonly material: THREE.ShaderMaterial;
  private height: number = WORLD.HEIGHT * 1.5;
  // Wider than the box so the wall's side edges sit outside the frustum and
  // never show as dark vertical seams — sized for its distance (BACK_Z minus
  // the extra offset below), not just the box width, so it still fills the
  // frame despite sitting much farther back.
  private width: number = WORLD.WIDTH * 4;
  mesh: THREE.Mesh;
  constructor(scene: THREE.Scene, gui?: Gui) {
    const geometry = new THREE.PlaneGeometry(this.width, this.height);

    const params = {
      topColor: "#140042",
      bottomColor: "#0d041b",
      width: this.width,
      height: this.height,
    };

    this.material = new THREE.ShaderMaterial({
      // This is a physical wall now, not a backdrop: it has to occlude cubes
      // behind it, and glass transmission refracts against the depth buffer.
      depthWrite: true,
      depthTest: true,

      uniforms: {
        uTopColor: { value: new THREE.Color(params.topColor) },
        uBottomColor: { value: new THREE.Color(params.bottomColor) },

        // Increased to be visible but still premium subtle
        uLightStrength: { value: 0.9 },

        // Lower = wider softer glow. Tuned for a camera ~45 units off a
        // 360-wide wall; the old 0.08 was sized for a 200x200 plane at 40.
        uAtmosphereSoftness: { value: 0.02 },

        // The cursor light's painted spot, written each frame by CursorLight.
        // An explicit uniform rather than the lights UBO: the wall glow then
        // can't be broken by adding lights elsewhere, and there is exactly one
        // spot instead of one per PointLight in the scene.
        uPaintPos: {
          value: new THREE.Vector3(0, WORLD.HEIGHT / 2, WORLD.BACK_Z),
        },
        uPaintColor: { value: new THREE.Color("#2c4992") },
      },

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
      uniform vec3 uPaintPos;
      uniform vec3 uPaintColor;

      varying vec2 vUv;
      varying vec3 vWorldPosition;

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
        // Distance-based radial glow around the painted cursor spot.
        // More cinematic than Lambert diffuse; art-directed falloff.

        float dist = distance(vWorldPosition, uPaintPos);
        float glow = 1.0 / (1.0 + dist * dist * uAtmosphereSoftness);
        glow = pow(glow, 1.6);

        vec3 glowAccum = uPaintColor * glow;

        // --------------------------------------------------
        // 3. Horizontal Falloff (Layered Depth)
        // --------------------------------------------------
        // Fade the left/right edges only. The wall is tall and narrow, so a
        // falloff along its long (Y) axis would band; the screen-space
        // vignette in post-processing owns the top/bottom darkening.

        float falloff = smoothstep(1.0, 0.85, abs(vUv.x - 0.5) * 2.0);
        baseColor *= falloff;

        // --------------------------------------------------
        // 4. Final Blend
        // --------------------------------------------------

        vec3 finalColor = baseColor + glowAccum * uLightStrength;

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    });

    // this.material = new THREE.MeshStandardMaterial({
    //   color: 0x3b2a1f, // deep brown base
    //   roughness: 0.75, // wood is fairly rough
    //   metalness: 0.05, // almost non-metal
    // });
    this.mesh = new THREE.Mesh(geometry, this.material);
    // Centered on the box height, standing farther back than the box's own
    // back wall so it reads as a distant backdrop.
    this.mesh.position.set(0, WORLD.HEIGHT / 2, WORLD.BACK_Z - BG_Z_OFFSET);
    this.mesh.renderOrder = -1;

    scene.add(this.mesh);

    if (gui) {
      const folder = gui?.folder("Background");

      folder.add(this.mesh.position, "x", -100, 100, 1).name("posX");
      folder.add(this.mesh.position, "y", 0, 400, 1).name("posY");
      folder.add(this.mesh.position, "z", -250, 50, 1).name("posZ");
      folder.add(params, "width", 10, 200, 5).onChange((v: number) => {
        this.width = v;
        this.updateGeometry();
      });

      folder.add(params, "height", 10, 500, 5).onChange((v: number) => {
        this.height = v;
        this.updateGeometry();
      });

      folder
        .add(
          this.material.uniforms.uAtmosphereSoftness,
          "value",
          0.001,
          0.2,
          0.001,
        )
        .name("glow softness");

      folder
        .add(this.material.uniforms.uLightStrength, "value", 0, 4, 0.01)
        .name("glow strength");

      folder.addColor(params, "topColor").onChange((v: string) => {
        this.material.uniforms.uTopColor.value.set(v);
      });

      folder.addColor(params, "bottomColor").onChange((v: string) => {
        this.material.uniforms.uBottomColor.value.set(v);
      });
    }
  }

  /** Where the cursor light paints the wall. Written by CursorLight. */
  setPaintPosition(position: THREE.Vector3) {
    this.material.uniforms.uPaintPos.value.copy(position);
  }

  setPaintColor(color: THREE.Color) {
    this.material.uniforms.uPaintColor.value.copy(color);
  }

  updateGeometry() {
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.PlaneGeometry(this.width, this.height);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}
