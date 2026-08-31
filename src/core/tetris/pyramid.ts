import * as THREE from "three";

import type { CubeFactory } from "./shapes";

interface PyramidSlot {
  x: number;
  z: number;
  y: number;
  row: number;
}

/** The self-building square step pyramid: fills one slot at a time, a block
 * falling in from above, until every layer is complete. */
export class Pyramid {
  private group = new THREE.Group();
  private slots: PyramidSlot[] = [];
  private nextSlot = 0;
  private drop: THREE.Group | null = null;
  private dropData: { landY: number } | null = null;
  private dropTimer = 1.5;
  private ambientFall: boolean;
  private cubeFactory: CubeFactory;

  constructor(scene: THREE.Scene, cubeFactory: CubeFactory, ambientFall: boolean) {
    this.cubeFactory = cubeFactory;
    this.ambientFall = ambientFall;

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

    scene.add(this.group);
    while (this.nextSlot < layers[0] * layers[0])
      this.placeCube(this.slots[this.nextSlot++]); // base layer pre-built
  }

  private placeCube(slot: PyramidSlot) {
    const c = this.cubeFactory.cube(slot.row >= 3 || Math.random() < 0.3);
    c.scale.setScalar(2.05);
    c.position.set(slot.x, slot.y, slot.z);
    this.group.add(c);
    return c;
  }

  setAmbientFallEnabled(v: boolean) {
    this.ambientFall = v;
  }

  update(dt: number) {
    if (!this.drop && this.nextSlot >= this.slots.length) return;

    if (this.ambientFall) {
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
}
