import * as THREE from "three";

import { SceneManager } from "./scene-manager";
import { CameraManager } from "./camera-manager";
import { RendererManager } from "./renderer-manager";

import { LightingSystem } from "../graphics/lightingSystem";
import { PostProcessing } from "../graphics/postProcessing";

import { Mouse } from "../interactions/mouse";
import { ScrollController } from "../interactions/scrollController";
import { Sizes } from "../interactions/sizes";

import { CubeField } from "../graphics/falling-cube";
import { Pyramid } from "../graphics/pyramid";
import { CornerCube } from "../graphics/corner-cube";
import { DebugWorld } from "./debugger";
import type { FrameContext, Updatable } from "./frame-context";
import { LightShafts } from "../graphics/light-shaft";
import { BackgroundPlane } from "../graphics/background-plane";
import { BoxShell } from "../graphics/box-shell";
import { WORLD } from "./world-constants";
import { Gui } from "./gui";
import { CursorLight } from "../graphics/cursor-light";
import { createEnvironmentMap } from "../graphics/createEnviormentMap";

export class Experience {
  scene: THREE.Scene;
  gui?: Gui;
  camera: CameraManager;
  renderer: RendererManager;

  bg: BackgroundPlane;
  shell: BoxShell;
  cursorLight: CursorLight;
  cubes: CubeField;
  pyramid: Pyramid;
  cornerCube: CornerCube;
  lighting: LightingSystem;
  shafts: LightShafts;
  post: PostProcessing;

  mouse: Mouse;
  scroll: ScrollController;
  sizes: Sizes;
  clock = new THREE.Clock();
  debug?: DebugWorld;

  readout = {
    t: 0,
    splitT: 0,
    camX: 0,
    camY: 0,
    camZ: 0,
    arcBlend: 0,
    drawCalls: 0,
    fps: 0,
  };

  private frames = 0;
  private lastFpsAt = performance.now();

  /** A/B and fps escape hatch for the post-processing chain. */
  usePost = true;

  /** Fired once, after the first frame has actually rendered. */
  private onReady?: () => void;
  private hasRendered = false;

  /**
   * Run a callback once the first frame is on screen. Fires immediately if
   * that already happened — the render loop starts inside the constructor, so
   * a caller wiring this up afterwards can otherwise miss the first frame.
   */
  whenReady(callback: () => void) {
    this.onReady = callback;
    if (this.hasRendered) callback();
  }

  /**
   * Everything that advances per frame, in registration order.
   * Order matters: the camera must come first because the rest read
   * ctx.cameraPos, which the camera publishes during its own update.
   */
  private updatables: Updatable[] = [];

  private frameHandle = 0;

  /** Allocated once, mutated in place each frame. */
  private ctx: FrameContext;

  private register<T extends Updatable>(updatable: T): T {
    this.updatables.push(updatable);
    return updatable;
  }

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new SceneManager().scene;

    this.camera = new CameraManager();

    this.scene.add(this.camera.camera);

    this.renderer = new RendererManager(canvas);
    this.scene.environment = createEnvironmentMap(this.renderer.renderer);
    this.mouse = new Mouse();

    this.scroll = new ScrollController();

    this.sizes = new Sizes();
    this.sizes.on("resize", this.onResize);

    if (import.meta.env.DEV) {
      this.gui = new Gui();

      // ?orbit — draw the world bounds and hand the camera to OrbitControls,
      // for inspecting the box without the scroll path moving it.
      if (new URLSearchParams(location.search).has("orbit")) {
        this.debug = new DebugWorld(this.scene);
        this.camera.enabled = false;
      }
    }

    this.bg = new BackgroundPlane(this.scene, this.gui);
    this.shell = new BoxShell(this.scene, this.gui);
    this.lighting = new LightingSystem(this.scene, this.gui);
    this.cursorLight = new CursorLight(this.scene, this.bg, this.gui);
    this.cubes = new CubeField(this.scene, this.gui);
    // Shares the cube field's glass material so one GUI folder tunes both.
    this.pyramid = new Pyramid(this.scene, this.cubes.material, this.gui);
    this.cornerCube = new CornerCube(this.camera.camera, this.gui);
    this.shafts = new LightShafts(this.scene, 12, this.gui);
    this.post = new PostProcessing(
      this.renderer.renderer,
      this.scene,
      this.camera.camera,
      this.gui,
    );

    this.ctx = {
      elapsed: 0,
      delta: 0,
      scrollProgress: 0,
      scrollVelocity: 0,
      splitT: this.scroll.splitT,
      mouse: { x: 0, y: 0 },
      cameraPos: new THREE.Vector3(),
      camera: this.camera.camera,
    };

    // ORDER IS LOAD-BEARING: camera first — it publishes ctx.cameraPos, which
    // the cursor light, cubes and shafts all read in the same frame.
    this.register(this.camera);
    this.register(this.lighting);
    this.register(this.cursorLight);
    this.register(this.cubes);
    this.register(this.pyramid);
    this.register(this.cornerCube);
    // this.register(this.shafts);

    this.setupScene();
    this.setupDebugReadout();

    this.animate();
  }

  /**
   * Live read-only readout of the values that drive the whole experience.
   * Scroll progress and splitT in particular are hard to reason about without
   * seeing them move.
   */
  setupDebugReadout() {
    if (!this.gui) return;

    const folder = this.gui.folder("Scroll / Camera");

    folder.add(this.readout, "t").listen().disable();
    folder.add(this.readout, "splitT").listen().disable();
    folder.add(this.readout, "camX").listen().disable();
    folder.add(this.readout, "camY").listen().disable();
    folder.add(this.readout, "camZ").listen().disable();
    folder.add(this.readout, "arcBlend").listen().disable();
    folder.add(this.readout, "drawCalls").listen().disable();
    folder.add(this.readout, "fps").listen().disable();
    folder.add(this, "usePost").name("post processing");
  }

  updateDebugReadout() {
    if (!this.gui) return;

    const pos = this.camera.camera.position;

    this.readout.t = +this.scroll.progress.toFixed(4);
    this.readout.splitT = +this.scroll.splitT.toFixed(4);
    this.readout.camX = +pos.x.toFixed(2);
    this.readout.camY = +pos.y.toFixed(2);
    this.readout.camZ = +pos.z.toFixed(2);
    this.readout.arcBlend = +this.camera.arcBlend.toFixed(3);
    this.readout.drawCalls = this.renderer.renderer.info.render.calls;

    const now = performance.now();
    this.frames++;
    if (now - this.lastFpsAt >= 500) {
      this.readout.fps = Math.round(
        (this.frames * 1000) / (now - this.lastFpsAt),
      );
      this.frames = 0;
      this.lastFpsAt = now;
    }
  }

  setupScene() {
    // Top of the camera rail: facing the back wall, at the top of the box.
    // The scroll path takes over from here.
    this.camera.camera.position.set(
      WORLD.CAM_X,
      WORLD.CAM_Y_START,
      WORLD.CAM_Z,
    );
    this.camera.camera.lookAt(WORLD.CAM_X, WORLD.CAM_Y_START, WORLD.BACK_Z);

    this.debug?.addOrbit(this.camera.camera, this.renderer.renderer.domElement);
  }

  onResize = (width: number, height: number, pixelRatio: number) => {
    this.renderer.resize(width, height, pixelRatio);
    this.camera.resize(width, height);
    this.post.resize(width, height);
  };

  dispose() {
    cancelAnimationFrame(this.frameHandle);

    for (const updatable of this.updatables) {
      updatable.dispose?.();
    }
    this.updatables.length = 0;

    this.scroll.dispose();
    this.sizes.dispose();
    this.post.dispose();
    this.renderer.dispose();
  }

  // Lenis is driven by gsap.ticker inside ScrollController, so this loop only
  // has to advance the scene.
  animate = () => {
    this.frameHandle = requestAnimationFrame(this.animate);

    this.debug?.updateControl();

    // Refresh the shared frame context, then let every subsystem read from it.
    const ctx = this.ctx;
    ctx.delta = Math.min(this.clock.getDelta(), 0.1);
    ctx.elapsed = this.clock.getElapsedTime();
    ctx.scrollProgress = this.scroll.progress;
    ctx.scrollVelocity = this.scroll.velocity;
    ctx.splitT = this.scroll.splitT;
    ctx.mouse.x = this.mouse.normalized.x;
    ctx.mouse.y = this.mouse.normalized.y;

    // The camera is registered first, so by the time anything else runs,
    // ctx.cameraPos already holds this frame's position.
    for (const updatable of this.updatables) {
      updatable.update(ctx);
    }

    // renderer.info.autoReset is false, so the counters have to be reset by
    // hand each frame or they accumulate and read as millions of draw calls.
    this.renderer.renderer.info.reset();

    if (this.usePost) {
      this.post.render(ctx.delta);
    } else {
      this.renderer.renderer.render(this.scene, this.camera.camera);
    }

    // First frame is on screen — shaders are compiled, buffers warm. Now it's
    // safe to lift the loading screen without exposing a compile stall.
    if (!this.hasRendered) {
      this.hasRendered = true;
      this.onReady?.();
    }

    this.updateDebugReadout();
  };
}
