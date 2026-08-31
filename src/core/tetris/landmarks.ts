import * as THREE from "three";

import type { CubeFactory } from "./shapes";

/** The two decorative landmarks: a wireframe next-piece hologram on a beam
 * pedestal, and a jagged "game-over" stack of columns climbing too high. */
export class Landmarks {
  private holo: THREE.Group;
  private ringGeo: THREE.RingGeometry;
  private ringMat: THREE.Material;
  private beamGeo: THREE.CylinderGeometry;
  private beamMat: THREE.Material;
  private holoEdgesGeo: THREE.EdgesGeometry;
  private holoMat: THREE.LineBasicMaterial;

  constructor(scene: THREE.Scene, cubeFactory: CubeFactory) {
    const box = new THREE.BoxGeometry(1, 1, 1);
    const edgesGeo = new THREE.EdgesGeometry(box);
    box.dispose();
    this.holoEdgesGeo = edgesGeo;

    const holo = new THREE.Group();
    const holoMat = new THREE.LineBasicMaterial({
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    this.holoMat = holoMat;
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
    holo.scale.setScalar(1.5);
    holo.position.set(-26, 8, -20);
    scene.add(holo);
    this.holo = holo;

    const ringGeo = new THREE.RingGeometry(3.4, 4.2, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7d97ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ringGeo = ringGeo;
    this.ringMat = ringMat;
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-26, 0.1, -20);
    scene.add(ring);

    const beamGeo = new THREE.CylinderGeometry(2.6, 3.8, 15, 24, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x6f8cff,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.beamGeo = beamGeo;
    this.beamMat = beamMat;
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(-26, 7.5, -20);
    scene.add(beam);

    // landmark: game-over stack — jagged columns climbing too high
    const goStack = new THREE.Group();
    [11, 9, 13, 8, 10, 7].forEach((h, ci) => {
      for (let y = 0; y < h; y++) {
        if (Math.random() < 0.14) continue;
        const c = cubeFactory.cube(Math.random() < 0.12);
        c.position.set(ci * 1.05 - 2.6, y + 0.5, 0);
        goStack.add(c);
      }
    });
    goStack.scale.setScalar(1.6);
    goStack.position.set(34, 0, 16);
    goStack.rotation.y = -0.5;
    scene.add(goStack);
  }

  update(elapsed: number, dt: number) {
    this.holo.rotation.y += dt * 0.55;
    this.holo.position.y = 8 + Math.sin(elapsed * 1.1) * 0.6;
  }

  dispose() {
    this.holoEdgesGeo.dispose();
    this.holoMat.dispose();
    this.ringGeo.dispose();
    this.ringMat.dispose();
    this.beamGeo.dispose();
    this.beamMat.dispose();
  }
}
