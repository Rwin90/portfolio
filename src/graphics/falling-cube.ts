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
  /** Height at which this cube winks out and recycles to the top. */
  killY: number;
  parked: boolean;
};

// Cubes further than this from the camera along Y are frozen and scaled to
// zero — roughly 2x the visible height at fov 35, so nothing pops in-frame.
const CULL_DISTANCE = 60;

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

  count = 120;
  gravity = -0.001;
  drag = 0.99;

  /** Higher = rain clears higher above the pyramid; 0 = falls to the floor. */
  densityFalloff = 0.5;

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
      this.cubes.push(this.createCube(true));
    }

    this.setupGui(gui);
  }

  private randomX() {
    return WORLD.X_MIN + Math.random() * WORLD.WIDTH;
  }

  private randomZ() {
    // Kept close to the back wall, well away from the camera at CAM_Z, so the
    // rain reads as distant depth rather than debris near the lens.
    return WORLD.BACK_Z + 3 + Math.random() * (WORLD.DEPTH * 0.2);
  }

  /**
   * The height at which a cube winks out and recycles to the top.
   *
   * A cube exists between the top and its kill height. Kill heights are skewed
   * toward RAIN_CLEAR_Y (exponent > 1), so most cubes fall nearly the whole
   * way and the rain stays dense through the descent, thinning only in the
   * last stretch before it clears at RAIN_CLEAR_Y — leaving the pyramid's air
   * calm. Higher densityFalloff pulls the thinning band up, clearing sooner.
   */
  private sampleKillY(): number {
    const span = WORLD.TOP_Y - WORLD.RAIN_CLEAR_Y;
    const biased = Math.pow(Math.random(), 1 + this.densityFalloff * 4);
    return WORLD.RAIN_CLEAR_Y + biased * span;
  }

  private createCube(initial: boolean): CubeData {
    const killY = this.sampleKillY();
    return {
      position: new THREE.Vector3(
        this.randomX(),
        // Spread the initial fill over each cube's live range; recycled cubes
        // drop in from just above the top.
        initial
          ? killY + Math.random() * (WORLD.TOP_Y - killY)
          : WORLD.TOP_Y + Math.random() * 60,
        this.randomZ(),
      ),

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

      scale: 0.55 + Math.random() * 0.75,
      killY,
      parked: false,
    };
  }

  /** Sends a cube back to the top with a fresh column and kill height. */
  private recycle(cube: CubeData) {
    cube.killY = this.sampleKillY();
    cube.position.set(
      this.randomX(),
      WORLD.TOP_Y + Math.random() * 60,
      this.randomZ(),
    );
    cube.velocity.set(0, 0, 0);
    cube.scale = 0.55 + Math.random() * 0.75;
  }

  update(ctx: FrameContext) {
    const time = ctx.elapsed;
    const camY = ctx.cameraPos.y;
    // Physics tuned in per-frame units at 60fps; scale by real delta so it is
    // frame-rate independent.
    const step = Math.min(ctx.delta, 0.1) * 60;

    for (let i = 0; i < this.count; i++) {
      const cube = this.cubes[i];

      const active = Math.abs(cube.position.y - camY) < CULL_DISTANCE;

      if (!active) {
        // Park once (zero scale, no matrix churn) and skip physics until the
        // camera comes back into range.
        if (!cube.parked) {
          this.dummy.position.copy(cube.position);
          this.dummy.scale.setScalar(0);
          this.dummy.updateMatrix();
          this.mesh.setMatrixAt(i, this.dummy.matrix);
          this.edgeBuffers.write(i, this.dummy);
          cube.parked = true;
        }
        // Still advance the fall while parked, cheaply, so cubes don't freeze
        // just off-screen and reappear stalled.
        cube.velocity.y += this.gravity * step;
        cube.position.y += cube.velocity.y * step;
        cube.velocity.y *= this.drag;
        if (cube.position.y < cube.killY) this.recycle(cube);
        continue;
      }
      cube.parked = false;

      cube.velocity.y += this.gravity * step;
      cube.position.addScaledVector(cube.velocity, step);
      cube.velocity.multiplyScalar(this.drag);

      cube.rotation.x += cube.rotationalVelocity.x * 0.01 * step;
      cube.rotation.y += cube.rotationalVelocity.y * 0.01 * step;
      cube.rotation.z += cube.rotationalVelocity.z * 0.01 * step;

      // Wink out above the pyramid and fall again from the top.
      if (cube.position.y < cube.killY) this.recycle(cube);

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

    physicsFolder.add(this, "gravity", -0.1, 0, 0.001).name("gravity");
    physicsFolder.add(this, "drag", 0.9, 1, 0.001).name("drag");
    physicsFolder
      .add(this, "densityFalloff", 0, 1, 0.01)
      .name("density falloff");
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
