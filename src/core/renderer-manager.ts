import * as THREE from "three";

export class RendererManager {
  renderer: THREE.WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,

      powerPreference: "high-performance",
    });

    // SIZE
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // PIXEL RATIO
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // COLOR MANAGEMENT
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // TONE MAPPING
    // The post-processing ToneMappingEffect owns tone mapping (ACES), so the
    // renderer must NOT also tone-map or the scene is mapped twice. Exposure
    // still lives here — the effect's ACES path reads toneMappingExposure via
    // three's <tonemapping_pars_fragment>.
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.renderer.toneMappingExposure = 0.65;

    // LIGHTING
    // this.renderer.physicallyCorrectLights = true;

    // SHADOWS
    this.renderer.shadowMap.enabled = false;

    // TRANSPARENCY
    this.renderer.setClearColor("#050505", 1);

    // BETTER GLASS RENDERING
    this.renderer.sortObjects = true;

    // PERFORMANCE
    this.renderer.info.autoReset = false;

    // OPTIONAL:
    // softer light gradients
    THREE.ColorManagement.enabled = true;
  }

  // Driven by Sizes — the app's single resize listener.
  resize(width: number, height: number, pixelRatio: number) {
    this.renderer.setSize(width, height);

    this.renderer.setPixelRatio(pixelRatio);
  }

  dispose() {
    this.renderer.dispose();
  }
}
