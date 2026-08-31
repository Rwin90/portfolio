import * as THREE from "three";

export type CameraPathMode = "journey" | "descend" | "orbit" | "forward";

let jPos: THREE.CatmullRomCurve3 | undefined;
let jLook: THREE.CatmullRomCurve3 | undefined;

function journeyCurves() {
  if (!jPos) {
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    jPos = new THREE.CatmullRomCurve3(
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
    jLook = new THREE.CatmullRomCurve3(
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
  return { jPos, jLook: jLook! };
}

/** The camera position/look-at target for a given mode at scroll progress `t`. */
export function cameraPathAt(mode: CameraPathMode, t: number) {
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();

  if (mode === "journey") {
    const { jPos, jLook } = journeyCurves();
    pos.copy(jPos.getPoint(t));
    look.copy(jLook.getPoint(t));
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
