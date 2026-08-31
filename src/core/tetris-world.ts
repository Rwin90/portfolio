import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import { createCubeFactory, clamp, type CubeFactory } from "./tetris/shapes";
import { RainField } from "./tetris/rain-field";
import { Pyramid } from "./tetris/pyramid";
import { Landmarks } from "./tetris/landmarks";
import { Environment } from "./tetris/environment";
import { cameraPathAt, type CameraPathMode } from "./tetris/camera-path";

export type { CameraPathMode } from "./tetris/camera-path";

/**
 * The tetris well: fog, rain-in pieces, a self-building step pyramid, a
 * floor + backdrop, a next-piece hologram, and a game-over stack. A
 * near-verbatim port of the design's `tetris-scene.js` custom element,
 * restructured as a plain class so `Experience` stays the single owner of
 * the render loop and resize handling.
 *
 * The scene's individual concerns live in `./tetris/*` — this class wires
 * them together and owns the render pipeline (camera, composer, bloom).
 */
export class TetrisWorld {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;

  private bloom: UnrealBloomPass;

  private mode: CameraPathMode;

  private cubeFactory: CubeFactory;
  private rainField: RainField;
  private pyramid: Pyramid;
  private landmarks: Landmarks;
  private environment: Environment;

  private mouse = { x: 0, y: 0 };
  private onMouseMove = (e: MouseEvent) => {
    this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
    this.mouse.y = (e.clientY / innerHeight) * 2 - 1;
  };

  private camPos = new THREE.Vector3(0, 60, 26);
  private camLook = new THREE.Vector3(0, 54, 0);
  private smoothT = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    options: {
      mode?: CameraPathMode;
      bloom?: number;
      ambientFall?: boolean;
    } = {},
  ) {
    this.mode = options.mode ?? "journey";

    const scene = new THREE.Scene();
    this.scene = scene;
    scene.fog = new THREE.FogExp2(0x04060c, 0.019);

    const camera = new THREE.PerspectiveCamera(
      50,
      innerWidth / innerHeight,
      0.1,
      300,
    );
    camera.position.set(0, 60, 26);
    this.camera = camera;
    // The camera itself must be in the scene graph, or anything parented to
    // it (the corner cube) never gets traversed by the renderer at all.
    scene.add(camera);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      options.bloom ?? 0.55,
      0.55,
      0.22,
    );
    composer.addPass(bloom);
    this.composer = composer;
    this.bloom = bloom;

    this.cubeFactory = createCubeFactory();
    this.rainField = new RainField(scene, this.cubeFactory);
    this.pyramid = new Pyramid(scene, this.cubeFactory, options.ambientFall ?? true);
    this.landmarks = new Landmarks(scene, this.cubeFactory);
    this.environment = new Environment(scene);

    addEventListener("mousemove", this.onMouseMove, { passive: true });
  }

  setMode(mode: CameraPathMode) {
    this.mode = mode;
  }

  setBloomStrength(v: number) {
    this.bloom.strength = v;
  }

  setAmbientFallEnabled(v: boolean) {
    this.pyramid.setAmbientFallEnabled(v);
  }

  // Renderer itself is resized by RendererManager; this only resizes what
  // TetrisWorld owns.
  resize(width: number, height: number) {
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.composer.render();
  }

  /** Advances the whole scene by one frame. Call render() separately. */
  update(elapsed: number, dt: number) {
    const se = document.scrollingElement!;
    const max = Math.max(1, se.scrollHeight - innerHeight);
    const prog = clamp(se.scrollTop / max, 0, 1);
    // Same smoothing feel as the source: ease toward the raw scroll progress.
    this.smoothT += (prog - this.smoothT) * Math.min(1, dt * 5);
    const t = this.smoothT;

    const { pos, look } = cameraPathAt(this.mode, t);
    pos.x += this.mouse.x * 1.6;
    pos.y += this.mouse.y * 1.0;
    this.camPos.lerp(pos, Math.min(1, dt * 3.5));
    this.camLook.lerp(look, Math.min(1, dt * 3.5));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    this.rainField.update(t, dt);
    this.pyramid.update(dt);
    this.landmarks.update(elapsed, dt);
    this.environment.update(elapsed, dt);

    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).density =
        this.mode === "journey"
          ? 0.019 * (1 - 0.72 * clamp((t - 0.84) / 0.16, 0, 1))
          : 0.019;
    }
  }

  dispose() {
    removeEventListener("mousemove", this.onMouseMove);
    this.composer.dispose();
    this.landmarks.dispose();
    this.environment.dispose();
    this.cubeFactory.dispose();
  }
}
