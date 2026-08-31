import * as THREE from "three";

export const SHAPES = [
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

export const TOP = 62;

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));

export interface PieceUserData {
  baseY: number;
  rev: number;
  rotSpd: number;
  baseScale?: number;
}

export interface CubeFactory {
  cube(bright: boolean): THREE.Group;
  makePiece(scale?: number): THREE.Group;
  dispose(): void;
}

/** Shared box geometry + face/edge materials used by rain pieces, the pyramid,
 * and the landmark groups — one set of GPU resources for every cube in the scene. */
export function createCubeFactory(): CubeFactory {
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

  return {
    cube,
    makePiece,
    dispose() {
      box.dispose();
      edgesGeo.dispose();
      faceMat.dispose();
      edgeMat.dispose();
      edgeBright.dispose();
    },
  };
}
