import * as THREE from "three";
import type { Gui } from "../core/gui";
import type { FrameContext, Updatable } from "../core/frame-context";
import { WORLD } from "../core/world-constants";
import {
  createEdgeMaterial,
  EdgeInstanceBuffers,
  EDGE_INNER,
  EDGE_OUTER,
} from "./glass-material";

const LEVELS = 6;
const BASE = 6;
const STEP = 4.2;
const SIZE = 4;

// Assembly window, in scroll progress. The pyramid stays hidden until the
// camera is arcing over it, then builds bottom-up as a payoff.
const ASSEMBLE_START = 0.78;
const LEVEL_STAGGER = 0.022;
const LEVEL_DURATION = 0.09;

type Block = {
  position: THREE.Vector3;
  level: number;
  phase: number;
};

function easeOutBack(x: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
}

/**
 * The stepped glass pyramid at the far end of the box, revealed by the
 * top-down arc. Shares the falling cubes' glass and edge look — the same
 * MeshPhysicalMaterial instance is passed in, so one GUI folder tunes both.
 *
 * 6 levels: 36+25+16+9+4+1 = 91 blocks. Static for most of the page (zero
 * per-frame cost), then it assembles level by level as you arc over.
 */
export class Pyramid implements Updatable {
  mesh: THREE.InstancedMesh;
  private edgeMaterialInner: THREE.ShaderMaterial;
  private edgeMaterialOuter: THREE.ShaderMaterial;
  private shellInner: THREE.LineSegments;
  private shellOuter: THREE.LineSegments;
  private edgeBuffers: EdgeInstanceBuffers;

  private blocks: Block[] = [];
  private dummy = new THREE.Object3D();
  private count: number;

  microFloat = true;

  constructor(
    scene: THREE.Scene,
    glassMaterial: THREE.MeshPhysicalMaterial,
    gui?: Gui,
  ) {
    this.layout();
    this.count = this.blocks.length;

    const geometry = new THREE.BoxGeometry(SIZE, SIZE, SIZE, 2, 2, 2);
    this.mesh = new THREE.InstancedMesh(geometry, glassMaterial, this.count);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

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
    this.shellInner.position.y =
      this.shellOuter.position.y =
      this.mesh.position.y =
        20;
    scene.add(this.shellInner, this.shellOuter);

    edgeSource.dispose();

    // Start fully assembled off-screen, so the very first frame is valid.
    this.writeAll(1);

    if (gui) {
      const folder = gui.folder("Pyramid");
      folder.add(this, "microFloat").name("micro float");
      folder
        .add(this.mesh.position, "y", -20, 20, 0.5)
        .name("lift")
        .onChange(
          () =>
            (this.shellInner.position.y = this.shellOuter.position.y =
              this.mesh.position.y),
        );
    }
  }

  private layout() {
    for (let level = 0; level < LEVELS; level++) {
      const n = BASE - level; // 6,5,4,3,2,1
      const y = WORLD.FLOOR_Y + SIZE / 2 + level * STEP;

      for (let a = 0; a < n; a++) {
        for (let c = 0; c < n; c++) {
          const x = WORLD.PYRAMID.x + (a - (n - 1) / 2) * STEP;
          const z = WORLD.PYRAMID.z + (c - (n - 1) / 2) * STEP;

          this.blocks.push({
            position: new THREE.Vector3(x, y, z),
            level,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    }
  }

  /** Per-level assembly progress at a given scroll position, 0 → 1. */
  private levelProgress(level: number, t: number) {
    const start = ASSEMBLE_START + level * LEVEL_STAGGER;
    return THREE.MathUtils.clamp((t - start) / LEVEL_DURATION, 0, 1);
  }

  private writeAll(t: number, elapsed = 0) {
    for (let i = 0; i < this.count; i++) {
      const block = this.blocks[i];
      const lp = this.levelProgress(block.level, t);
      // easeOutBack runs 0 → 1 with a slight overshoot; geometry is already
      // SIZE, so the instance scale is just the eased factor.
      const scale = Math.max(easeOutBack(lp), 0.0001);

      this.dummy.position.copy(block.position);

      if (this.microFloat && lp >= 1) {
        // Amplitude well under the 4.2 spacing so the stack never reads loose.
        this.dummy.position.y += Math.sin(elapsed * 0.4 + block.phase) * 0.06;
        this.dummy.rotation.set(
          0,
          Math.sin(elapsed * 0.15 + block.phase) * 0.03,
          0,
        );
      } else {
        this.dummy.rotation.set(0, 0, 0);
      }

      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();

      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.edgeBuffers.write(i, this.dummy);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    this.edgeBuffers.markDirty();
  }

  update(ctx: FrameContext) {
    // Idle until the assembly window is in reach; zero cost for 70% of the page.
    const assembling =
      ctx.scrollProgress > ASSEMBLE_START - 0.05 &&
      this.levelProgress(LEVELS - 1, ctx.scrollProgress) < 1;

    const settled = ctx.scrollProgress >= ASSEMBLE_START && this.microFloat;

    if (assembling || settled) {
      this.writeAll(ctx.scrollProgress, ctx.elapsed);
    }

    this.edgeMaterialInner.uniforms.uTime.value = ctx.elapsed;
    this.edgeMaterialOuter.uniforms.uTime.value = ctx.elapsed * 0.7;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.removeFromParent();
    this.shellInner.geometry.dispose();
    this.shellOuter.geometry.dispose();
    this.edgeMaterialInner.dispose();
    this.edgeMaterialOuter.dispose();
    this.shellInner.removeFromParent();
    this.shellOuter.removeFromParent();
  }
}
