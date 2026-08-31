import * as THREE from "three";

import { createFloorShader, type HalftoneRenderer } from "../../graphics/halftone-shader";
import { rand } from "./shapes";

// Redraw the floor's shader texture every other frame — plenty smooth for a
// slowly drifting pattern, half the canvas/GPU cost of doing it every frame.
const FLOOR_REPAINT_INTERVAL = 2;

/** The tetris well's backdrop: the (flat, unshaded — it's never actually
 * visible behind the fog) back wall, the halftone-shaded floor, the glow
 * plane, light shafts, and drifting dust. */
export class Environment {
  private floorShader: HalftoneRenderer | null = null;
  private floorCtx!: CanvasRenderingContext2D;

  private wallGeo: THREE.CylinderGeometry;
  private wallMat: THREE.Material;
  private floorGeo: THREE.PlaneGeometry;
  private floorMat: THREE.Material;
  private floorTex!: THREE.CanvasTexture;
  private glowGeo: THREE.PlaneGeometry;
  private glowMat: THREE.Material;
  private glowTex: THREE.Texture;
  private shaftGeo: THREE.BufferGeometry;
  private shaftMat: THREE.Material;
  private dustGeo: THREE.BufferGeometry;
  private dustMat: THREE.Material;
  private dust: THREE.Points;

  private elapsed = 0;
  private frame = 0;

  constructor(scene: THREE.Scene) {
    // back wall — flat and unshaded: sits behind heavy fog in a near-black
    // scene and is never actually seen, so it isn't worth a shader/texture.
    this.wallGeo = new THREE.CylinderGeometry(85, 85, 130, 48, 1, true);
    this.wallMat = new THREE.MeshBasicMaterial({
      color: 0x2c3a66,
      side: THREE.BackSide,
    });
    const wall = new THREE.Mesh(this.wallGeo, this.wallMat);
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
    } else {
      tileTex = this.tileTexFallback();
      tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
      tileTex.repeat.set(30, 30);
      tileTex.anisotropy = 8;
    }
    this.floorTex = tileTex;
    this.floorGeo = new THREE.PlaneGeometry(320, 320);
    this.floorMat = new THREE.MeshBasicMaterial({ map: tileTex });
    const floor = new THREE.Mesh(this.floorGeo, this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    scene.add(floor);

    this.glowTex = this.radialTex();
    this.glowGeo = new THREE.PlaneGeometry(70, 70);
    this.glowMat = new THREE.MeshBasicMaterial({
      map: this.glowTex,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(this.glowGeo, this.glowMat);
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
    this.shaftGeo = new THREE.BufferGeometry();
    this.shaftGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(shaftPos, 3),
    );
    this.shaftMat = new THREE.LineBasicMaterial({
      color: 0x6f8cff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.LineSegments(this.shaftGeo, this.shaftMat));

    // dust points
    const pts: number[] = [];
    for (let i = 0; i < 300; i++)
      pts.push(rand(-50, 50), rand(0, 70), rand(-40, 20));
    this.dustGeo = new THREE.BufferGeometry();
    this.dustGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(pts, 3),
    );
    this.dustMat = new THREE.PointsMaterial({
      color: 0xaec4ff,
      size: 0.18,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.dust = new THREE.Points(this.dustGeo, this.dustMat);
    scene.add(this.dust);
  }

  update(elapsed: number, dt: number) {
    this.elapsed = elapsed;
    this.dust.rotation.y += dt * 0.01;

    if (this.floorShader && (this.frame = this.frame + 1) % FLOOR_REPAINT_INTERVAL === 0) {
      this.paintFloor();
      this.floorTex.needsUpdate = true;
    }
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
    this.wallGeo.dispose();
    this.wallMat.dispose();
    this.floorGeo.dispose();
    this.floorMat.dispose();
    this.floorTex.dispose();
    this.glowGeo.dispose();
    this.glowMat.dispose();
    this.glowTex.dispose();
    this.shaftGeo.dispose();
    this.shaftMat.dispose();
    this.dustGeo.dispose();
    this.dustMat.dispose();
  }
}
