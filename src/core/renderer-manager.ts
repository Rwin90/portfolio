import * as THREE from "three";

export class RendererManager {
  renderer: THREE.WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,

      powerPreference: "high-performance",
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // The scene renders straight, no post-processing tone-mapping pass.
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.renderer.shadowMap.enabled = false;

    this.renderer.setClearColor(0x04060c, 1);

    this.renderer.sortObjects = true;

    // PERFORMANCE
    this.renderer.info.autoReset = false;

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
