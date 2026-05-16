import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
  ChromaticAberrationEffect,
  ColorAverageEffect,
  BlendFunction,
} from "postprocessing";

import * as THREE from "three";
import type { Gui } from "../core/gui";

export class PostProcessing {
  composer: EffectComposer;

  bloom: BloomEffect;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    gui?: Gui,
  ) {
    this.composer = new EffectComposer(renderer);

    // BASE RENDER
    this.composer.addPass(new RenderPass(scene, camera));

    // BLOOM
    this.bloom = new BloomEffect({
      intensity: 0.55,

      luminanceThreshold: 0.75,

      luminanceSmoothing: 0.2,

      mipmapBlur: true,
    });

    // VIGNETTE
    const vignette = new VignetteEffect({
      offset: 0.28,
      darkness: 0.42,
    });

    // FILM GRAIN
    const noise = new NoiseEffect({
      blendFunction: BlendFunction.SOFT_LIGHT,
      premultiply: true,
    });

    // CHROMATIC ABERRATION
    const chromaticAberration = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.00025, 0.00025),

      radialModulation: true,

      modulationOffset: 0.15,
    });
    // SUBTLE COLOR SOFTENING
    const colorAverage = new ColorAverageEffect();

    // MAIN EFFECT PASS
    this.composer.addPass(
      new EffectPass(
        camera,

        this.bloom,

        vignette,

        noise,

        chromaticAberration,

        colorAverage,
      ),
    );
  }

  render() {
    this.composer.render();
  }
}
