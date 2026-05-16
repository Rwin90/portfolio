import * as THREE from "three";

type CubeData = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;

  rotation: THREE.Euler;
  rotationalVelocity: THREE.Vector3;

  scale: number;

  settled: boolean;

  targetY: number;

  column: number;
};

export class CubeField {
  mesh: THREE.InstancedMesh;

  cubes: CubeData[] = [];

  dummy = new THREE.Object3D();

  readonly count = 45;

  readonly columns = 24;

  readonly columnWidth = 1.2;

  readonly columnHeights: number[] = [];

  readonly gravity = -0.0018;

  readonly floorY = -22;

  readonly interactionRadius = 1;

  cursorWorld = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const material = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      transparent: true,
      opacity: 0.58,
      roughness: 0.2,
      metalness: 1,
      transmission: 0.3,
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, this.count);

    scene.add(this.mesh);

    for (let i = 0; i < this.columns; i++) {
      this.columnHeights[i] = this.floorY;
    }

    for (let i = 0; i < this.count; i++) {
      const column = Math.floor(Math.random() * this.columns);

      const x = (column - this.columns / 2) * this.columnWidth;

      const cube: CubeData = {
        position: new THREE.Vector3(
          x,
          8 + Math.random() * 20,
          -20 + (Math.random() - 0.5) * 8,
        ),

        velocity: new THREE.Vector3(0, 0, 0),

        rotation: new THREE.Euler(),

        rotationalVelocity: new THREE.Vector3(
          Math.random() * 0.01,
          Math.random() * 0.01,
          Math.random() * 0.01,
        ),

        scale: 0.6 + Math.random() * 1.4,

        settled: false,

        targetY: this.floorY,

        column,
      };

      this.cubes.push(cube);
    }
  }

  setCursorWorld(x: number, y: number) {
    this.cursorWorld.set(x, y, 0);
  }

  update() {
    const radiusSq = this.interactionRadius * this.interactionRadius;

    for (let i = 0; i < this.count; i++) {
      const cube = this.cubes[i];

      if (!cube.settled) {
        cube.velocity.y += this.gravity;

        const dx = cube.position.x - this.cursorWorld.x;

        const dy = cube.position.y - this.cursorWorld.y;

        const distanceSq = dx * dx + dy * dy;

        if (distanceSq < radiusSq) {
          const force = 1 - distanceSq / radiusSq;

          cube.velocity.x += dx * force * 0.002;

          cube.velocity.y += dy * force * 0.002;
        }

        cube.position.add(cube.velocity);

        cube.velocity.multiplyScalar(0.96);

        cube.rotation.x += cube.rotationalVelocity.x;

        cube.rotation.y += cube.rotationalVelocity.y;

        const stackHeight = this.columnHeights[cube.column];

        if (cube.position.y <= stackHeight) {
          cube.position.y = stackHeight;

          cube.settled = true;

          this.columnHeights[cube.column] += cube.scale;
        }
      } else {
        cube.rotation.x += 0.0008;
        cube.rotation.y += 0.0006;
      }

      this.dummy.position.copy(cube.position);

      this.dummy.rotation.copy(cube.rotation);

      this.dummy.scale.setScalar(cube.scale);

      this.dummy.updateMatrix();

      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
