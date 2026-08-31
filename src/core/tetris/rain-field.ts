import * as THREE from "three";

import { clamp, rand, TOP, type CubeFactory, type PieceUserData } from "./shapes";

/**
 * The descending clusters of tetromino pieces that reveal as the page
 * scrolls, plus the scattered pieces settled on the floor and out toward the
 * walls that read as background clutter.
 */
export class RainField {
  private pieces: { group: THREE.Group; data: PieceUserData }[] = [];

  constructor(scene: THREE.Scene, cubeFactory: CubeFactory) {
    const world = new THREE.Group();
    scene.add(world);

    // stacked landscape: clusters at descending heights
    const levels = [50, 36, 22];
    levels.forEach((h) => {
      // Opposite sides of the well rather than two fully random x positions
      // — otherwise they'd occasionally land on top of each other.
      for (let i = 0; i < 2; i++) {
        const p = cubeFactory.makePiece(rand(0.8, 1.6));
        const side = i === 0 ? -1 : 1;
        p.position.set(
          side * rand(6, 15),
          h + rand(-2.5, 3.5),
          rand(-10, 4),
        );
        const data: PieceUserData = {
          baseY: p.position.y,
          rev: clamp(1 - p.position.y / TOP, 0, 0.9),
          rotSpd: rand(-0.05, 0.05),
        };
        this.pieces.push({ group: p, data });
        world.add(p);
      }
    });

    // scattered settled pieces on the floor around the pyramid
    for (let i = 0; i < 22; i++) {
      const p = cubeFactory.makePiece(rand(1.1, 1.9));
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

    // a few more out toward the walls, reading as distant background clutter
    for (let i = 0; i < 12; i++) {
      const p = cubeFactory.makePiece(rand(0.8, 1.4));
      const ang = rand(0, Math.PI * 2);
      const r = rand(50, 78);
      p.position.set(Math.cos(ang) * r, rand(0.5, 1.2), Math.sin(ang) * r);
      p.rotation.set(
        0,
        rand(0, Math.PI * 2),
        Math.random() < 0.3 ? Math.PI / 2 : 0,
      );
      world.add(p);
    }
  }

  update(t: number, dt: number) {
    for (const { group: p, data: u } of this.pieces) {
      const pr = clamp((t - (u.rev - 0.14)) / 0.12, 0, 1);
      const e = 1 - Math.pow(1 - pr, 3);
      p.visible = pr > 0.001;
      p.position.y = u.baseY + (1 - e) * 16;
      const s = u.baseScale ?? (u.baseScale = p.scale.x);
      p.scale.setScalar(s * (0.5 + 0.5 * e));
      if (u.rotSpd) p.rotation.y += u.rotSpd * dt;
    }
  }
}
