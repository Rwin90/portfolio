import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
  ChromaticAberrationEffect,
  SMAAEffect,
  ToneMappingEffect,
  BlendFunction,
  ToneMappingMode,
} from "postprocessing";

import * as THREE from "three";
import type { Gui } from "../core/gui";

export class PostProcessing {
  composer: EffectComposer;

  bloom: BloomEffect;

  vignette: VignetteEffect;

  noise: NoiseEffect;

  chromaticAberration: ChromaticAberrationEffect;

  toneMapping: ToneMappingEffect;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    gui?: Gui,
  ) {
    //
    // COMPOSER
    //
    // HalfFloat: without an HDR buffer the scene is clamped to [0,1] before
    // bloom runs, which makes the luminanceThreshold meaningless and is the
    // main reason bloom looked weak. This matters more than tone mapping.
    this.composer = new EffectComposer(renderer, {
      multisampling: 0,
      frameBufferType: THREE.HalfFloatType,
    });

    //
    // BASE RENDER
    //
    this.composer.addPass(new RenderPass(scene, camera));

    //
    // BLOOM
    // critical for glass/crystal look
    //
    this.bloom = new BloomEffect({
      blendFunction: BlendFunction.SCREEN,

      intensity: 1.8,

      luminanceThreshold: 0.08,

      luminanceSmoothing: 0.22,

      mipmapBlur: true,
    });

    //
    // VIGNETTE
    //
    this.vignette = new VignetteEffect({
      offset: 0.22,

      darkness: 0.48,
    });

    //
    // NOISE
    //
    this.noise = new NoiseEffect({
      blendFunction: BlendFunction.SOFT_LIGHT,

      premultiply: true,
    });

    this.noise.blendMode.opacity.value = 0.08;

    //
    // CHROMATIC ABERRATION
    //
    this.chromaticAberration = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.00065, 0.00065),

      radialModulation: true,

      modulationOffset: 0.15,
    });

    this.chromaticAberration.blendMode.opacity.value = 0.35;

    //
    // TONE MAPPING
    //
    this.toneMapping = new ToneMappingEffect({
      blendFunction: BlendFunction.NORMAL,

      mode: ToneMappingMode.ACES_FILMIC,
    });

    //
    // SMAA
    //
    const smaa = new SMAAEffect();

    //
    // MAIN PASS
    // Tone mapping LAST: bloom must run on the HDR scene, then the whole
    // result is tone-mapped to display range. The old order tone-mapped first
    // and bloomed an already-clamped image. (ColorAverage removed — it fully
    // desaturated a deliberately purple/blue scene.)
    // Chromatic aberration is its own pass below (it's a convolution effect).
    //
    this.composer.addPass(
      new EffectPass(
        camera,

        this.bloom,

        this.vignette,

        this.noise,

        smaa,

        this.toneMapping,
      ),
    );

    //
    // CHROMATIC PASS
    // separate because convolution effect
    //
    this.composer.addPass(
      new EffectPass(
        camera,

        this.chromaticAberration,
      ),
    );

    //
    // GUI
    //
    if (gui) {
      const folder = gui.folder("Post Processing");

      //
      // BLOOM
      //
      const bloomFolder = folder.addFolder?.("Bloom") ?? folder;

      const bloomParams = {
        intensity: this.bloom.intensity,

        threshold: this.bloom.luminanceMaterial.threshold,

        smoothing: this.bloom.luminanceMaterial.smoothing,
      };

      bloomFolder
        .add(bloomParams, "intensity", 0, 5, 0.001)
        .onChange((v: number) => {
          this.bloom.intensity = v;
        });

      bloomFolder
        .add(bloomParams, "threshold", 0, 2, 0.001)
        .onChange((v: number) => {
          this.bloom.luminanceMaterial.threshold = v;
        });

      bloomFolder
        .add(bloomParams, "smoothing", 0, 1, 0.001)
        .onChange((v: number) => {
          this.bloom.luminanceMaterial.smoothing = v;
        });

      //
      // VIGNETTE
      //
      const vignetteFolder = folder.addFolder?.("Vignette") ?? folder;

      const vignetteParams = {
        offset: 0.22,

        darkness: 0.48,
      };

      vignetteFolder
        .add(vignetteParams, "offset", 0, 1, 0.001)
        .onChange((v: number) => {
          this.vignette.uniforms.get("offset")!.value = v;
        });

      vignetteFolder
        .add(vignetteParams, "darkness", 0, 2, 0.001)
        .onChange((v: number) => {
          this.vignette.uniforms.get("darkness")!.value = v;
        });

      //
      // CHROMATIC
      //
      const chromaFolder = folder.addFolder?.("Chromatic Aberration") ?? folder;

      const chromaParams = {
        x: 0.00065,

        y: 0.00065,

        opacity: 0.35,
      };

      chromaFolder.add(chromaParams, "x", 0, 0.01, 0.00001).onChange(() => {
        this.chromaticAberration.offset.set(chromaParams.x, chromaParams.y);
      });

      chromaFolder.add(chromaParams, "y", 0, 0.01, 0.00001).onChange(() => {
        this.chromaticAberration.offset.set(chromaParams.x, chromaParams.y);
      });

      chromaFolder
        .add(chromaParams, "opacity", 0, 1, 0.001)
        .onChange((v: number) => {
          this.chromaticAberration.blendMode.opacity.value = v;
        });

      //
      // NOISE
      //
      const noiseFolder = folder.addFolder?.("Noise") ?? folder;

      const noiseParams = {
        opacity: 0.08,
      };

      noiseFolder
        .add(noiseParams, "opacity", 0, 1, 0.001)
        .onChange((v: number) => {
          this.noise.blendMode.opacity.value = v;
        });

      //
      // EXPOSURE
      //
      const rendererFolder = folder.addFolder?.("Renderer") ?? folder;

      const rendererParams = {
        exposure: renderer.toneMappingExposure,
      };

      rendererFolder
        .add(rendererParams, "exposure", 0, 3, 0.001)
        .onChange((v: number) => {
          renderer.toneMappingExposure = v;
          // toneMappingExposure only uploads on a material refresh, so nudge
          // the tone-mapping pass to re-upload immediately.
          const pass = this.composer.passes[1] as EffectPass;
          const mat = (pass as unknown as { fullscreenMaterial?: THREE.Material })
            .fullscreenMaterial;
          if (mat) mat.needsUpdate = true;
        });
    }
  }

  // Driven by Sizes — the app's single resize listener. Without this the
  // composer keeps its original buffer size and the composite stretches.
  resize(width: number, height: number) {
    this.composer.setSize(width, height);
  }

  render(delta?: number) {
    this.composer.render(delta);
  }

  dispose() {
    this.composer.dispose();
  }
}
