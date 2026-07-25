import * as THREE from "three";
import type { Gui } from "../core/gui";
import type { FrameContext, Updatable } from "../core/frame-context";
import { WORLD } from "../core/world-constants";
import {
  createGlassMaterial,
  createEdgeMaterial,
  EdgeInstanceBuffers,
  EDGE_INNER,
  EDGE_OUTER,
} from "./glass-material";

type CubeData = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  rotationalVelocity: THREE.Vector3;
  scale: number;
  parked: boolean;
};

export class CubeField implements Updatable {
  mesh: THREE.InstancedMesh;
  material: THREE.MeshPhysicalMaterial;
  edgeMaterialInner: THREE.ShaderMaterial;
  edgeMaterialOuter: THREE.ShaderMaterial;

  private shellInner: THREE.LineSegments;
  private shellOuter: THREE.LineSegments;
  private edgeBuffers: EdgeInstanceBuffers;

  cubes: CubeData[] = [];
  private dummy = new THREE.Object3D();

  // World-space rain: spread over the whole box height, so the count is the
  // TOTAL, not what's on screen. At any scroll position only a couple sit in
  // the ~40-unit visible band. Lower this for fewer, raise for more.
  count = 16;
  gravity = -0.0015;
  drag = 0.99;

  constructor(scene: THREE.Scene, gui?: Gui) {
    const geometry = new THREE.BoxGeometry(2, 2, 2, 2, 2, 2);

    this.material = createGlassMaterial();
    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.count);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    // Two edge shells, sharing one set of per-instance transform buffers so
    // each cube's transform is written once per frame, not twice.
    this.edgeBuffers = new EdgeInstanceBuffers(this.count);
    const edgeSource = new THREE.EdgesGeometry(geometry, 20);

    this.edgeMaterialInner = createEdgeMaterial(EDGE_INNER);
    this.edgeMaterialOuter = createEdgeMaterial(EDGE_OUTER);

    this.shellInner = new THREE.LineSegments(
      this.edgeBuffers.attachTo(edgeSource, this.count),
      this.edgeMaterialInner,
    );
    this.shellOuter = new THREE.LineSegments(
      this.edgeBuffers.attachTo(edgeSource, this.count),
      this.edgeMaterialOuter,
    );
    this.shellInner.frustumCulled = false;
    this.shellOuter.frustumCulled = false;
    scene.add(this.shellInner, this.shellOuter);

    edgeSource.dispose();

    for (let i = 0; i < this.count; i++) {
      this.cubes.push(this.createCube());
    }

    this.setupGui(gui);
  }

  private randomX() {
    // Spawn only in the left/right bands, never the central third, so the rain
    // never sits behind the reading column in the middle of the screen.
    const side = Math.random() < 0.5 ? -1 : 1;
    const inner = WORLD.WIDTH * 0.18; // edge of the clear central gap
    const outer = WORLD.WIDTH * 0.5; // box edge
    return side * (inner + Math.random() * (outer - inner));
  }

  private randomZ() {
    // Pressed right up against the back wall, as far from the camera as the box
    // allows, so the rain reads as distant depth rather than debris.
    return WORLD.BACK_Z + 2 + Math.random() * (WORLD.DEPTH * 0.1);
  }

  /** Sends a cube back above the top of the box to fall again — world-space,
   *  independent of where the camera is. */
  private respawn(cube: CubeData) {
    cube.position.set(
      this.randomX(),
      WORLD.TOP_Y + Math.random() * 40,
      this.randomZ(),
    );
    cube.velocity.set(0, 0, 0);
    cube.scale = 0.32 + Math.random() * 0.4;
  }

  private createCube(): CubeData {
    const cube: CubeData = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      rotation: new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      ),
      rotationalVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.6,
      ),
      scale: 0.32 + Math.random() * 0.4,
      parked: false,
    };
    this.respawn(cube);
    // Spread the initial fill across the whole fall so some are already in view.
    cube.position.y =
      WORLD.RAIN_CLEAR_Y + Math.random() * (WORLD.TOP_Y - WORLD.RAIN_CLEAR_Y);
    return cube;
  }

  update(ctx: FrameContext) {
    const time = ctx.elapsed;
    // Physics tuned in per-frame units at 60fps; scale by real delta so it is
    // frame-rate independent.
    const step = Math.min(ctx.delta, 0.1) * 60;

    // The only scroll-driven behaviour: once the camera starts arcing over the
    // pyramid at the end, hide the rain so the reveal stays clean. During the
    // whole descent the cubes fall in world space, untouched by scrolling.
    const raining = ctx.scrollProgress < ctx.splitT - 0.02;

    for (let i = 0; i < this.count; i++) {
      const cube = this.cubes[i];

      if (!raining) {
        if (!cube.parked) {
          this.dummy.position.copy(cube.position);
          this.dummy.scale.setScalar(0);
          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(i, this.dummy.matrix);
          this.edgeBuffers.write(i, this.dummy);
          cube.parked = true;
        }
        continue;
      }
      cube.parked = false;

      cube.velocity.y += this.gravity * step;
      cube.position.addScaledVector(cube.velocity, step);
      cube.velocity.multiplyScalar(this.drag);

      cube.rotation.x += cube.rotationalVelocity.x * 0.01 * step;
      cube.rotation.y += cube.rotationalVelocity.y * 0.01 * step;
      cube.rotation.z += cube.rotationalVelocity.z * 0.01 * step;

      // Winks out above the pyramid and falls again from the top.
      if (cube.position.y < WORLD.RAIN_CLEAR_Y) this.respawn(cube);

      this.dummy.position.copy(cube.position);
      this.dummy.rotation.copy(cube.rotation);
      this.dummy.scale.set(cube.scale, cube.scale * 1.15, cube.scale);
      this.dummy.updateMatrix();

      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.edgeBuffers.write(i, this.dummy);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.edgeBuffers.markDirty();

    this.edgeMaterialInner.uniforms.uTime.value = time;
    this.edgeMaterialOuter.uniforms.uTime.value = time * 0.7;
  }

  private setupGui(gui?: Gui) {
    if (!gui) return;

    const folder = gui.folder("Cube Field");
    const materialFolder = folder.addFolder("Glass Material");
    const edgeFolder = folder.addFolder("Edge Lines");
    const physicsFolder = folder.addFolder("Physics");

    const m = this.material;

    materialFolder
      .addColor({ c: "#6906ec" }, "c")
      .name("color")
      .onChange((v: string) => m.color.set(v));
    materialFolder.add(m, "roughness", 0, 1, 0.001);
    materialFolder.add(m, "metalness", 0, 1, 0.001);
    materialFolder.add(m, "transmission", 0, 1, 0.001);
    materialFolder.add(m, "thickness", 0, 10, 0.001);
    materialFolder.add(m, "ior", 1, 2.5, 0.001);
    materialFolder.add(m, "clearcoat", 0, 1, 0.001);
    materialFolder.add(m, "clearcoatRoughness", 0, 1, 0.001);
    materialFolder.add(m, "envMapIntensity", 0, 4, 0.01);
    materialFolder.add(this.mesh, "visible").name("cubes visible");

    for (const [name, mat] of [
      ["Inner", this.edgeMaterialInner],
      ["Outer", this.edgeMaterialOuter],
    ] as const) {
      const sub = edgeFolder.addFolder(name);
      sub
        .addColor({ c: mat.uniforms.uColor.value.getHexString() }, "c")
        .name("color")
        .onChange((v: string) => mat.uniforms.uColor.value.set(v));
      sub.add(mat.uniforms.uBaseGlow, "value", 0, 3, 0.01).name("base glow");
      sub
        .add(mat.uniforms.uPulseStrength, "value", 0, 3, 0.01)
        .name("pulse strength");
      sub
        .add(mat.uniforms.uPulseSpeed, "value", 0.1, 3, 0.01)
        .name("pulse speed");
      sub
        .add(mat.uniforms.uEdgeScale, "value", 0.9, 1.8, 0.001)
        .name("edge scale");
    }

    physicsFolder.add(this, "gravity", -0.05, 0, 0.0005).name("gravity");
    physicsFolder.add(this, "drag", 0.9, 1, 0.001).name("drag");
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();

    this.shellInner.geometry.dispose();
    this.shellOuter.geometry.dispose();
    this.edgeMaterialInner.dispose();
    this.edgeMaterialOuter.dispose();
    this.shellInner.removeFromParent();
    this.shellOuter.removeFromParent();
  }
}
