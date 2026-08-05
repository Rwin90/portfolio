import * as THREE from "three";

import { RendererManager } from "./renderer-manager";

import { TetrisWorld, type CameraPathMode } from "./tetris-world";
import { LogoCube } from "../graphics/logo-cube";
import { createEnvironmentMap } from "../graphics/createEnviormentMap";

import { ScrollController } from "../interactions/scrollController";
import { Sizes } from "../interactions/sizes";

import type { FrameContext } from "./frame-context";
import { Gui } from "./gui";

export class Experience {
  renderer: RendererManager;
  world: TetrisWorld;
  logoCube: LogoCube;

  scroll: ScrollController;
  sizes: Sizes;
  clock = new THREE.Clock();
  gui?: Gui;

  private frameHandle = 0;

  private ctx: FrameContext;

  /** Fired once, after the first frame has actually rendered. */
  private onReady?: () => void;
  private hasRendered = false;

  whenReady(callback: () => void) {
    this.onReady = callback;
    if (this.hasRendered) callback();
  }

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new RendererManager(canvas);

    this.world = new TetrisWorld(this.renderer.renderer, {
      mode: "descend",
      bloom: 0.55,
      ambientFall: true,
    });

    this.world.scene.environment = createEnvironmentMap(this.renderer.renderer);

    this.scroll = new ScrollController();

    this.sizes = new Sizes();
    this.sizes.on("resize", this.onResize);

    if (import.meta.env.DEV) {
      this.gui = new Gui();
      this.setupGui(this.gui);
    }

    const logoCanvas = document.getElementById("logo-cube") as HTMLCanvasElement;
    this.logoCube = new LogoCube(logoCanvas);
    if (this.gui) this.setupLogoCubeGui(this.gui, this.logoCube);

    this.ctx = {
      elapsed: 0,
      delta: 0,
      scrollProgress: 0,
    };

    this.animate();
  }

  private setupGui(gui: Gui) {
    const cameraFolder = gui.folder("Camera");
    cameraFolder
      .add({ path: "descend" }, "path", {
        Journey: "journey",
        Descend: "descend",
        Orbit: "orbit",
        Forward: "forward",
      })
      .onChange((value: CameraPathMode) => {
        this.world.setMode(value);
      });

    const bloomFolder = gui.folder("Bloom");
    bloomFolder
      .add({ strength: 0.55 }, "strength", 0, 3, 0.01)
      .onChange((value: number) => this.world.setBloomStrength(value));

    const pyramidFolder = gui.folder("Pyramid");
    pyramidFolder
      .add({ ambientFall: true }, "ambientFall")
      .onChange((value: boolean) => this.world.setAmbientFallEnabled(value));
  }

  private setupLogoCubeGui(gui: Gui, logoCube: LogoCube) {
    const folder = gui.folder("Logo Cube");
    folder.add(logoCube, "turns", 0, 6, 0.1).name("turns / scroll");
    folder.add(logoCube, "smoothing", 0.01, 0.3, 0.005).name("smoothing");
    folder.add(logoCube, "tiltStrength", 0, 1.5, 0.05).name("mouseX tilt");
  }

  onResize = (width: number, height: number, pixelRatio: number) => {
    this.renderer.resize(width, height, pixelRatio);
    this.world.resize(width, height);
  };

  dispose() {
    cancelAnimationFrame(this.frameHandle);

    this.logoCube.dispose();
    this.world.dispose();
    this.scroll.dispose();
    this.sizes.dispose();
    this.renderer.dispose();
  }

  // Lenis is driven by gsap.ticker inside ScrollController, so this loop only
  // has to advance the scene.
  animate = () => {
    this.frameHandle = requestAnimationFrame(this.animate);

    const ctx = this.ctx;
    ctx.delta = Math.min(this.clock.getDelta(), 0.1);
    ctx.elapsed = this.clock.getElapsedTime();
    ctx.scrollProgress = this.scroll.progress;

    this.world.update(ctx.elapsed, ctx.delta);
    this.logoCube.update(ctx.elapsed, ctx.scrollProgress);

    // renderer.info.autoReset is false, so the counters have to be reset by
    // hand each frame or they accumulate and read as millions of draw calls.
    this.renderer.renderer.info.reset();

    this.world.render();
    this.logoCube.render();

    // First frame is on screen — shaders are compiled, buffers warm. Now it's
    // safe to lift the loading screen without exposing a compile stall.
    if (!this.hasRendered) {
      this.hasRendered = true;
      this.onReady?.();
    }
  };
}
