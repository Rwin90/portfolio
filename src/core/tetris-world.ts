import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

import {
  createHalftone,
  createFloorShader,
  type HalftoneRenderer,
} from "../graphics/halftone-shader";

export type CameraPathMode = "journey" | "descend" | "orbit" | "forward";

const SHAPES = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
  ],
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
];
const TOP = 62;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

interface PieceUserData {
  baseY: number;
  rev: number;
  rotSpd: number;
  baseScale?: number;
}

interface PyramidSlot {
  x: number;
  z: number;
  y: number;
  row: number;
}

/**
 * The tetris well: fog, rain-in pieces, a self-building step pyramid, a
 * halftone-shaded wall + floor, a next-piece hologram, and a game-over
 * stack. A near-verbatim port of the design's `tetris-scene.js`
 * custom element, restructured as a plain class so `Experience` stays the
 * single owner of the render loop and resize handling.
 */
export class TetrisWorld {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;

  private bloom: UnrealBloomPass;

  private mode: CameraPathMode;
  private pieces: { group: THREE.Group; data: PieceUserData }[] = [];
  private cube!: (bright: boolean) => THREE.Group;
  private slots: PyramidSlot[] = [];
  private pyramid!: THREE.Group;
  private nextSlot = 0;
  private drop: THREE.Group | null = null;
  private dropData: { landY: number } | null = null;
  private dropTimer = 1.5;

  private holo!: THREE.Group;
  private dust!: THREE.Points;
  private ambientGroup!: THREE.Group;

  private halftone: HalftoneRenderer | null = null;
  private panelCtx!: CanvasRenderingContext2D;
  private wallTexRef!: THREE.CanvasTexture;
  private floorShader: HalftoneRenderer | null = null;
  private floorCtx!: CanvasRenderingContext2D;
  private floorTexRef!: THREE.CanvasTexture;

  private mouse = { x: 0, y: 0 };
  private onMouseMove = (e: MouseEvent) => {
    this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
    this.mouse.y = (e.clientY / innerHeight) * 2 - 1;
  };

  private camPos = new THREE.Vector3(0, 60, 26);
  private camLook = new THREE.Vector3(0, 54, 0);
  private jPos?: THREE.CatmullRomCurve3;
  private jLook?: THREE.CatmullRomCurve3;

  private elapsed = 0;
  private frame = 0;

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

    this.build(options.ambientFall ?? true);

    addEventListener("mousemove", this.onMouseMove, { passive: true });
  }

  private build(ambientFall: boolean) {
    const scene = this.scene;

    // shared geometry + materials
    const box = new THREE.BoxGeometry(1, 1, 1);
    const edgesGeo = new THREE.EdgesGeometry(box);
    const faceMat = new THREE.MeshBasicMaterial({
      color: 0x16244d,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x9db8ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const edgeBright = new THREE.LineBasicMaterial({
      color: 0xe4edff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });

    const cube = (bright: boolean) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(box, faceMat));
      g.add(new THREE.LineSegments(edgesGeo, bright ? edgeBright : edgeMat));
      return g;
    };
    this.cube = cube;

    const makePiece = (scale = 1) => {
      const g = new THREE.Group();
      const shape = SHAPES[(Math.random() * SHAPES.length) | 0];
      const bright = Math.random() < 0.25;
      shape.forEach(([x, y]) => {
        const c = cube(bright);
        c.position.set(x - 1, y - 0.5, 0);
        g.add(c);
      });
      g.rotation.set(
        (((Math.random() * 4) | 0) * Math.PI) / 2,
        (((Math.random() * 4) | 0) * Math.PI) / 2,
        (((Math.random() * 4) | 0) * Math.PI) / 2,
      );
      g.scale.setScalar(scale);
      return g;
    };

    // stacked landscape: clusters at descending heights
    const world = new THREE.Group();
    scene.add(world);
    const levels = [50, 36, 22];
    levels.forEach((h) => {
      for (let i = 0; i < 2; i++) {
        const p = makePiece(rand(0.8, 1.6));
        p.position.set(rand(-15, 15), h + rand(-2.5, 3.5), rand(-10, 4));
        const data: PieceUserData = {
          baseY: p.position.y,
          rev: clamp(1 - p.position.y / TOP, 0, 0.9),
          rotSpd: rand(-0.05, 0.05),
        };
        this.pieces.push({ group: p, data });
        world.add(p);
      }
    });

    // experience pyramid — square step pyramid, fills slot by slot over time
    const layers = [7, 5, 3, 1];
    layers.forEach((n, row) => {
      const cells: [number, number][] = [];
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) cells.push([i, j]);
      cells.sort(
        (a, b) =>
          Math.abs(a[0] - (n - 1) / 2) +
          Math.abs(a[1] - (n - 1) / 2) -
          (Math.abs(b[0] - (n - 1) / 2) + Math.abs(b[1] - (n - 1) / 2)),
      );
      cells.forEach(([i, j]) =>
        this.slots.push({
          x: (i - (n - 1) / 2) * 2.2,
          z: (j - (n - 1) / 2) * 2.2,
          y: 1.13 + row * 2.18,
          row,
        }),
      );
    });
    this.pyramid = new THREE.Group();
    scene.add(this.pyramid);
    while (this.nextSlot < layers[0] * layers[0])
      this.placeCube(this.slots[this.nextSlot++]); // base layer pre-built

    // scattered settled pieces on the floor around the pyramid
    for (let i = 0; i < 12; i++) {
      const p = makePiece(rand(1.1, 1.9));
      const ang = rand(0, Math.PI * 2);
      const r = rand(16, 42);
      p.position.set(Math.cos(ang) * r, rand(0.6, 1.4), Math.sin(ang) * r);
      p.rotation.set(
        0,
        rand(0, Math.PI * 2),
        Math.random() < 0.3 ? Math.PI / 2 : 0,
      );
      world.add(p);
    }

    // landmark: next-piece hologram — wireframe T-piece on a beam pedestal
    const holo = new THREE.Group();
    const holoMat = new THREE.LineBasicMaterial({
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ].forEach(([x, y]) => {
      const m = new THREE.LineSegments(edgesGeo, holoMat);
      m.position.set(x - 1, y + 0.5, 0);
      holo.add(m);
    });
    holo.scale.setScalar(2.4);
    holo.position.set(-26, 8, -20);
    scene.add(holo);
    this.holo = holo;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.4, 4.2, 40),
      new THREE.MeshBasicMaterial({
        color: 0x7d97ff,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-26, 0.1, -20);
    scene.add(ring);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 3.8, 15, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x6f8cff,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    beam.position.set(-26, 7.5, -20);
    scene.add(beam);

    // landmark: game-over stack — jagged columns climbing too high
    const goStack = new THREE.Group();
    [11, 9, 13, 8, 10, 7].forEach((h, ci) => {
      for (let y = 0; y < h; y++) {
        if (Math.random() < 0.14) continue;
        const c = cube(Math.random() < 0.12);
        c.position.set(ci * 1.05 - 2.6, y + 0.5, 0);
        goStack.add(c);
      }
    });
    goStack.scale.setScalar(1.6);
    goStack.position.set(34, 0, 16);
    goStack.rotation.y = -0.5;
    scene.add(goStack);

    // surrounding walls — halftone shader composited into panel blocks
    this.halftone = createHalftone(256, 256);
    let wallTex: THREE.CanvasTexture;
    if (this.halftone) {
      const pc = document.createElement("canvas");
      pc.width = 1024;
      pc.height = 512;
      this.panelCtx = pc.getContext("2d")!;
      this.paintPanels();
      wallTex = new THREE.CanvasTexture(pc);
      wallTex.wrapS = THREE.RepeatWrapping;
      wallTex.repeat.set(6, 1);
    } else {
      wallTex = this.wallTexFallback();
      wallTex.wrapS = THREE.RepeatWrapping;
      wallTex.repeat.set(12, 1);
    }
    this.wallTexRef = wallTex;
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(85, 85, 130, 48, 1, true),
      new THREE.MeshBasicMaterial({
        map: wallTex,
        side: THREE.BackSide,
        color: 0x2c3a66,
      }),
    );
    wall.position.y = 65;
    scene.add(wall);

    // tiled floor — halftone pattern shader composited per-tile
    this.floorShader = createFloorShader(256, 256);
    let tileTex: THREE.CanvasTexture;
    if (this.floorShader) {
      const fc = document.createElement("canvas");
      fc.width = 512;
      fc.height = 512;
      this.floorCtx = fc.getContext("2d")!;
      this.paintFloor();
      tileTex = new THREE.CanvasTexture(fc);
      tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
      tileTex.repeat.set(30, 30);
      tileTex.anisotropy = 8;
      this.floorTexRef = tileTex;
    } else {
      tileTex = this.tileTexFallback();
      tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
      tileTex.repeat.set(30, 30);
      tileTex.anisotropy = 8;
    }
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 320),
      new THREE.MeshBasicMaterial({ map: tileTex }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    const glowTex = this.radialTex();
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.05;
    scene.add(glow);

    // light shafts
    const shaftPos: number[] = [];
    for (let i = 0; i < 70; i++) {
      const x = rand(-48, 48);
      const z = rand(-34, 10);
      const y = rand(4, 68);
      const len = rand(6, 24);
      shaftPos.push(x, y, z, x, y + len, z);
    }
    const shaftGeo = new THREE.BufferGeometry();
    shaftGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(shaftPos, 3),
    );
    scene.add(
      new THREE.LineSegments(
        shaftGeo,
        new THREE.LineBasicMaterial({
          color: 0x6f8cff,
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );

    // dust points
    const pts: number[] = [];
    for (let i = 0; i < 300; i++)
      pts.push(rand(-50, 50), rand(0, 70), rand(-40, 20));
    const ptsGeo = new THREE.BufferGeometry();
    ptsGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    const dust = new THREE.Points(
      ptsGeo,
      new THREE.PointsMaterial({
        color: 0xaec4ff,
        size: 0.18,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(dust);
    this.dust = dust;

    // building animation toggle (ambient-fall)
    const amb = new THREE.Group();
    this.ambientGroup = amb;
    amb.visible = ambientFall;
    scene.add(amb);
  }

  private placeCube(slot: PyramidSlot) {
    const c = this.cube(slot.row >= 3 || Math.random() < 0.3);
    c.scale.setScalar(2.05);
    c.position.set(slot.x, slot.y, slot.z);
    this.pyramid.add(c);
    return c;
  }

  setMode(mode: CameraPathMode) {
    this.mode = mode;
  }

  setBloomStrength(v: number) {
    this.bloom.strength = v;
  }

  setAmbientFallEnabled(v: boolean) {
    this.ambientGroup.visible = v;
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
    this.elapsed = elapsed;

    const se = document.scrollingElement!;
    const max = Math.max(1, se.scrollHeight - innerHeight);
    const prog = clamp(se.scrollTop / max, 0, 1);
    // Same smoothing feel as the source: ease toward the raw scroll progress.
    this.smoothT += (prog - this.smoothT) * Math.min(1, dt * 5);
    const t = this.smoothT;

    const { pos, look } = this.pathAt(this.mode, t);
    pos.x += this.mouse.x * 1.6;
    pos.y += this.mouse.y * 1.0;
    this.camPos.lerp(pos, Math.min(1, dt * 3.5));
    this.camLook.lerp(look, Math.min(1, dt * 3.5));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // reveal / settle
    for (const { group: p, data: u } of this.pieces) {
      const pr = clamp((t - (u.rev - 0.14)) / 0.12, 0, 1);
      const e = 1 - Math.pow(1 - pr, 3);
      p.visible = pr > 0.001;
      p.position.y = u.baseY + (1 - e) * 16;
      const s = u.baseScale ?? (u.baseScale = p.scale.x);
      p.scale.setScalar(s * (0.5 + 0.5 * e));
      if (u.rotSpd) p.rotation.y += u.rotSpd * dt;
    }

    // pyramid builds itself: one block falls into the next slot
    if (this.drop || this.nextSlot < this.slots.length) {
      if (this.ambientGroup.visible) {
        if (this.drop && this.dropData) {
          this.drop.position.y -= 9.5 * dt;
          if (this.drop.position.y <= this.dropData.landY) {
            this.drop.position.y = this.dropData.landY;
            this.drop = null;
            this.dropData = null;
            this.dropTimer = 0.45;
          }
        } else {
          this.dropTimer -= dt;
          if (this.dropTimer <= 0 && this.nextSlot < this.slots.length) {
            const slot = this.slots[this.nextSlot++];
            const c = this.placeCube(slot);
            c.position.y = slot.y + 20;
            this.dropData = { landY: slot.y };
            this.drop = c;
          }
        }
      } else {
        if (this.drop && this.dropData) {
          this.drop.position.y = this.dropData.landY;
          this.drop = null;
          this.dropData = null;
        }
        while (this.nextSlot < this.slots.length)
          this.placeCube(this.slots[this.nextSlot++]);
      }
    }

    this.dust.rotation.y += dt * 0.01;
    this.holo.rotation.y += dt * 0.55;
    this.holo.position.y = 8 + Math.sin(elapsed * 1.1) * 0.6;

    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).density =
        this.mode === "journey"
          ? 0.019 * (1 - 0.72 * clamp((t - 0.84) / 0.16, 0, 1))
          : 0.019;
    }

    if (this.halftone && (this.frame = (this.frame || 0) + 1) % 2 === 0) {
      this.paintPanels();
      this.wallTexRef.needsUpdate = true;
      if (this.floorShader) {
        this.paintFloor();
        this.floorTexRef.needsUpdate = true;
      }
    }
  }

  private smoothT = 0;

  private pathAt(mode: CameraPathMode, t: number) {
    const pos = new THREE.Vector3();
    const look = new THREE.Vector3();

    if (mode === "journey") {
      if (!this.jPos) {
        const V = (x: number, y: number, z: number) =>
          new THREE.Vector3(x, y, z);
        this.jPos = new THREE.CatmullRomCurve3(
          [
            V(0, 58, 32),
            V(50, 44, 38),
            V(26, 32, -44),
            V(-38, 13, -32),
            V(-42, 16, 6),
            V(-10, 11, 42),
            V(8, 10, -14),
            V(30, 13, 28),
            V(6, 4.5, 26),
            V(0, 118, 76),
            V(0, 124, 79),
          ],
          false,
          "centripetal",
        );
        this.jLook = new THREE.CatmullRomCurve3(
          [
            V(0, 46, -30),
            V(80, 34, 16),
            V(-14, 12, -26),
            V(-26, 8, -20),
            V(-14, 8, -10),
            V(0, 7, 0),
            V(0, 9, -34),
            V(34, 10, 16),
            V(0, 5, 0),
            V(0, 6, 0),
            V(0, 6, 0),
          ],
          false,
          "centripetal",
        );
      }
      pos.copy(this.jPos.getPoint(t));
      look.copy(this.jLook!.getPoint(t));
    } else if (mode === "orbit") {
      const ang = -0.5 + t * 2.3;
      const r = 48 - t * 16;
      const h = 52 - t * 42;
      pos.set(Math.sin(ang) * r, h, Math.cos(ang) * r);
      look.set(0, 34 - t * 27, 0);
    } else if (mode === "forward") {
      pos.set(Math.sin(t * 5) * 5, 34 - t * 26, 72 - t * 96);
      look.set(0, 30 - t * 25, pos.z - 24);
    } else {
      // descend + slow orbit combined
      const ang = -0.55 + t * 2.5;
      const r = 30 - t * 4;
      pos.set(Math.sin(ang) * r, 62 - t * 55, Math.cos(ang) * r);
      look.set(0, 64 - t * 58, 0);
    }
    return { pos, look };
  }

  private paintFloor() {
    if (!this.floorShader) return;
    const x = this.floorCtx;
    const S = 512;
    const ts = 128;
    this.floorShader.render(this.elapsed * 0.25);
    x.fillStyle = "#020817";
    x.fillRect(0, 0, S, S);
    const src = this.floorShader.canvas;
    for (let i = 0; i < S / ts; i++)
      for (let j = 0; j < S / ts; j++) {
        x.save();
        x.translate(i * ts + ts / 2, j * ts + ts / 2);
        x.scale(i % 2 ? -1 : 1, j % 2 ? -1 : 1);
        x.drawImage(src, -ts / 2 + 2, -ts / 2 + 2, ts - 4, ts - 4);
        x.restore();
      }
    x.fillStyle = "rgba(2,1,10,0.45)";
    x.fillRect(0, 0, S, S);
    x.strokeStyle = "rgba(0,2,8,0.9)";
    x.lineWidth = 3;
    for (let k = 0; k <= S / ts; k++) {
      x.beginPath();
      x.moveTo(k * ts, 0);
      x.lineTo(k * ts, S);
      x.stroke();
      x.beginPath();
      x.moveTo(0, k * ts);
      x.lineTo(S, k * ts);
      x.stroke();
    }
  }

  private paintPanels() {
    if (!this.halftone) return;
    const x = this.panelCtx;
    const W = 1024;
    const H = 512;
    const bs = 128;
    this.halftone.render(this.elapsed * 0.25);
    x.fillStyle = "#04060c";
    x.fillRect(0, 0, W, H);
    const src = this.halftone.canvas;
    for (let i = 0; i < W / bs; i++)
      for (let j = 0; j < H / bs; j++) {
        x.save();
        x.translate(i * bs + bs / 2, j * bs + bs / 2);
        x.scale(i % 2 ? -1 : 1, j % 2 ? -1 : 1);
        x.drawImage(src, -bs / 2 + 3, -bs / 2 + 3, bs - 6, bs - 6);
        x.restore();
      }
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(0,0,3,0.95)");
    g.addColorStop(0.45, "rgba(4,6,13,0.55)");
    g.addColorStop(1, "rgba(4,6,13,0.15)");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.strokeStyle = "rgba(100,130,230,0.14)";
    x.lineWidth = 2;
    for (let k = 0; k <= W / bs; k++) {
      x.beginPath();
      x.moveTo(k * bs, 0);
      x.lineTo(k * bs, H);
      x.stroke();
    }
    for (let k = 0; k <= H / bs; k++) {
      x.beginPath();
      x.moveTo(0, k * bs);
      x.lineTo(W, k * bs);
      x.stroke();
    }
  }

  private wallTexFallback() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const x = c.getContext("2d")!;
    const bg = x.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, "#000003");
    bg.addColorStop(0.5, "#04060d");
    bg.addColorStop(1, "#070b16");
    x.fillStyle = bg;
    x.fillRect(0, 0, 512, 512);
    for (let k = 0; k < 14; k++) {
      const i = (Math.random() * 4) | 0;
      const j = 4 + ((Math.random() * 12) | 0);
      x.fillStyle = `rgba(110,140,255,${0.03 + Math.random() * 0.05})`;
      x.fillRect(i * 128 + 2, j * 32 + 2, 124, 28);
    }
    x.strokeStyle = "rgba(100,130,230,0.09)";
    x.lineWidth = 1;
    for (let k = 0; k <= 4; k++) {
      x.beginPath();
      x.moveTo(k * 128, 140);
      x.lineTo(k * 128, 512);
      x.stroke();
    }
    for (let k = 4; k <= 16; k++) {
      x.beginPath();
      x.moveTo(0, k * 32);
      x.lineTo(512, k * 32);
      x.stroke();
    }
    for (let k = 0; k < 3; k++) {
      const px = Math.random() * 512;
      const g = x.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "rgba(125,151,255,0)");
      g.addColorStop(0.6, `rgba(125,151,255,${0.1 + Math.random() * 0.12})`);
      g.addColorStop(1, "rgba(125,151,255,0.04)");
      x.fillStyle = g;
      x.fillRect(px, 0, 2, 512);
    }
    return new THREE.CanvasTexture(c);
  }

  private tileTexFallback() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const x = c.getContext("2d")!;
    x.fillStyle = "#04060c";
    x.fillRect(0, 0, 512, 512);
    const s = 128;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const v = 2.5 + Math.random() * 3;
        x.fillStyle = `rgb(${v | 0},${(v + 2) | 0},${(v * 2.2) | 0})`;
        x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
        const g = x.createLinearGradient(i * s, j * s, i * s + s, j * s + s);
        g.addColorStop(0, "rgba(120,150,255,0.025)");
        g.addColorStop(0.5, "rgba(0,0,0,0)");
        g.addColorStop(1, "rgba(120,150,255,0.015)");
        x.fillStyle = g;
        x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4);
      }
    x.strokeStyle = "rgba(100,130,230,0.09)";
    x.lineWidth = 2;
    for (let k = 0; k <= 4; k++) {
      x.beginPath();
      x.moveTo(k * s, 0);
      x.lineTo(k * s, 512);
      x.stroke();
      x.beginPath();
      x.moveTo(0, k * s);
      x.lineTo(512, k * s);
      x.stroke();
    }
    for (let k = 0; k < 900; k++) {
      x.fillStyle = `rgba(140,170,255,${Math.random() * 0.03})`;
      x.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
    }
    return new THREE.CanvasTexture(c);
  }

  private radialTex() {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d")!;
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(110,140,255,0.9)");
    g.addColorStop(0.4, "rgba(60,85,190,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  dispose() {
    removeEventListener("mousemove", this.onMouseMove);
    this.composer.dispose();
  }
}
