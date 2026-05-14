import * as THREE from "three";
import { Renderer } from "./renderer";
import { Camera } from "./camera";
import { Sizes } from "./sizes";
import { Time } from "./time";

export class Experience {
  public scene: THREE.Scene;
  public renderer: Renderer;
  public camera: Camera;
  public sizes: Sizes;
  public time: Time;

  constructor() {
    this.scene = new THREE.Scene();

    this.sizes = new Sizes();
    this.time = new Time();

    this.camera = new Camera(this);
    this.renderer = new Renderer(this);

    this.time.on("tick", this.update.bind(this));

    this.sizes.on("resize", this.resize.bind(this));
  }

  resize() {
    this.camera.resize();
    this.renderer.resize();
  }

  update() {
    this.camera.update();
    this.renderer.update();
  }
}
