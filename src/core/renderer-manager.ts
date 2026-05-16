import * as THREE from "three";

export class RendererManager {
  renderer: THREE.WebGLRenderer;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    const canvas = document.querySelector(".webgl") as HTMLCanvasElement;

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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

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

    window.addEventListener("resize", this.onResize);
  }

  onResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  };
}
