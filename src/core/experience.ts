import * as THREE from "three";

import { SceneManager } from "./scene-manager";
import { CameraManager } from "./camera-manager";
import { RendererManager } from "./renderer-manager";

import { LightingSystem } from "../graphics/lightingSystem";
import { PostProcessing } from "../graphics/postProcessing";

import { Mouse } from "./mouse";
import { ScrollController } from "../interactions/scrollController";

import { CubeField } from "../graphics/falling-cube";
import { DebugWorld } from "./debugger";
import { LightShafts } from "../graphics/light-shaft";
import { BackgroundPlane } from "../graphics/background-plane";
import { Beam } from "../graphics/beam";
import { Gui } from "./gui";
import { CursorLight } from "../graphics/cursor-light";
import { createEnvironmentMap } from "../graphics/createEnviormentMap";

export class Experience {
  scene: THREE.Scene;
  debug: DebugWorld;
  gui?: Gui;
  camera: CameraManager;
  beams: Beam;
  renderer: RendererManager;
  cursorLight: CursorLight;
  cubes: CubeField;

  lighting: LightingSystem;

  post: PostProcessing;

  mouse: Mouse;
  bg: BackgroundPlane;
  scroll: ScrollController;
  shafts: LightShafts;
  clock = new THREE.Clock();

  constructor() {
    this.scene = new SceneManager().scene;
    // this.debug = new DebugWorld(this.scene);

    this.camera = new CameraManager();

    // IMPORTANT:
    // add camera group instead of only camera
    this.scene.add(this.camera.group);

    this.renderer = new RendererManager(this.scene, this.camera.camera);
    this.scene.environment = createEnvironmentMap(this.renderer.renderer);
    this.mouse = new Mouse();

    this.scroll = new ScrollController();

    if (import.meta.env.DEV) {
      this.gui = new Gui();
    }

    this.bg = new BackgroundPlane(this.scene, this.gui);
    this.lighting = new LightingSystem(this.scene, this.gui);
    this.cursorLight = new CursorLight(this.scene, this.gui);
    this.cubes = new CubeField(this.scene, this.gui);
    this.shafts = new LightShafts(this.scene, 12, this.gui);
    this.beams = new Beam(this.scene, 12, this.gui);
    this.post = new PostProcessing(
      this.renderer.renderer,
      this.scene,
      this.camera.camera,
      this.gui,
    );

    this.setupScene();

    this.animate();
  }

  setupScene() {
    this.camera.camera.position.set(0, 8, 22);
    this.camera.camera.lookAt(0, 0, -20);
    // this.scene.background = new THREE.Color("#ffffff");
  }

  animate = (time = 0) => {
    requestAnimationFrame(this.animate);

    const elapsed = this.clock.getElapsedTime();

    // LENIS UPDATE
    this.scroll.update(time);

    // CINEMATIC CAMERA UPDATE
    const cameraWorldPos = new THREE.Vector3();
    this.camera.camera.getWorldPosition(cameraWorldPos);

    // Unproject mouse position
    const vector = new THREE.Vector3(
      this.mouse.normalized.x,
      this.mouse.normalized.y,
      0.5,
    );
    vector.unproject(this.camera.camera);

    // Calculate direction from camera to unprojected point
    const direction = vector.sub(cameraWorldPos).normalize();

    // Find intersection with desired Z plane (e.g., Z = -15)
    const targetZ = -15;
    const distance = (targetZ - cameraWorldPos.z) / direction.z;
    const finalPosition = cameraWorldPos
      .clone()
      .add(direction.multiplyScalar(distance));
    this.cursorLight.update(finalPosition, elapsed);

    // LIGHTING
    this.lighting.update(elapsed);

    this.cubes.setCameraY(this.camera.camera.position.y);
    this.cubes.setCursorWorld(this.mouse.normalized.x, this.mouse.normalized.y);
    // CUBES
    this.cubes.update();

    // LIGHT SHAFTS
    this.shafts.update(elapsed, this.camera.camera.position.y);
    this.beams.update(elapsed, this.mouse);
    // POSTPROCESSING
    // this.post.render();

    //NO PP
    this.renderer.renderer.render(this.scene, this.camera.camera);
  };
}
