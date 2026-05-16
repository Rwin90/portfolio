import * as THREE from "three";
import type { Gui } from "../core/gui";

type CubeData = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  rotationalVelocity: THREE.Vector3;
  scale: number;
  settled: boolean;
  column: number;
  emissiveIntensity: number;
};

export class CubeField {
  mesh: THREE.InstancedMesh;

  edgeLines: THREE.LineSegments[] = [];

  cubes: CubeData[] = [];

  dummy = new THREE.Object3D();

  cursorWorld = new THREE.Vector3();

  cameraY = 0;

  count = 111;

  columns = 34;

  columnWidth = 6;

  gravity = -0.00112;

  worldHeight = 80;

  floorY = -80;

  interactionRadius = 2.5;

  constructor(scene: THREE.Scene, gui?: Gui) {
    //
    // FOG
    //
    scene.fog = new THREE.FogExp2("#02040a", 0.008);

    //
    // GEOMETRY
    //
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    //
    // MAIN GLASS MATERIAL
    //

    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ffffff"),
      roughness: 0.04,
      metalness: 0,
      transmission: 1,
      thickness: 1.2,
      ior: 1.45,
      clearcoat: 1,
      clearcoatRoughness: 0.06,

      // brighten glass edges
      attenuationColor: new THREE.Color("#bcd6ff"),
      attenuationDistance: 1.4,

      // key visual improvement
      envMapIntensity: 1.4,

      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    //
    // MAIN INSTANCED MESH
    //
    this.mesh = new THREE.InstancedMesh(geometry, material, this.count);

    //
    // INSTANCE COLORS
    //
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.count * 3),
      3,
    );

    scene.add(this.mesh);

    //
    // EDGE OVERLAY
    //
    const edgeGeometry = new THREE.EdgesGeometry(geometry);

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#e8f0ff"),

      transparent: true,

      opacity: 1.0,

      blending: THREE.AdditiveBlending,

      depthWrite: false,
    });

    for (let i = 0; i < this.count; i++) {
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);

      scene.add(edges);

      this.edgeLines.push(edges);
    }

    //
    // CREATE CUBES
    //
    for (let i = 0; i < this.count; i++) {
      this.cubes.push(this.createCube());
    }

    if (gui) {
      const folder = gui.folder("Cube Field");

      const fogFolder = folder.addFolder?.("Fog") ?? folder;
      const materialFolder = folder.addFolder?.("Glass Material") ?? folder;
      const edgeFolder = folder.addFolder?.("Edge Lines") ?? folder;
      const physicsFolder = folder.addFolder?.("Physics") ?? folder;
      const transformFolder = folder.addFolder?.("Transform") ?? folder;
      const debugFolder = folder.addFolder?.("Debug") ?? folder;

      const fogParams = {
        fogColor: "#02040a",
        fogDensity: 0.008,
      };

      const materialParams = {
        color: "#ffffff",
        roughness: material.roughness,
        metalness: material.metalness,
        transmission: material.transmission,
        thickness: material.thickness,
        ior: material.ior,
        clearcoat: material.clearcoat,
        clearcoatRoughness: material.clearcoatRoughness,
        attenuationColor: "#bcd6ff",
        attenuationDistance: material.attenuationDistance ?? 1.4,
        envMapIntensity: material.envMapIntensity,
        transparent: material.transparent,
        depthWrite: material.depthWrite,
        visible: this.mesh.visible,
      };

      const edgeParams = {
        visible: true,
        color: "#e8f0ff",
        opacity: edgeMaterial.opacity,
        depthWrite: edgeMaterial.depthWrite,
      };

      const physicsParams = {
        gravity: this.gravity,
        columnWidth: this.columnWidth,
        worldHeight: this.worldHeight,
        floorY: this.floorY,
        interactionRadius: this.interactionRadius,
      };

      const transformParams = {
        posX: this.mesh.position.x,
        posY: this.mesh.position.y,
        posZ: this.mesh.position.z,

        rotX: this.mesh.rotation.x,
        rotY: this.mesh.rotation.y,
        rotZ: this.mesh.rotation.z,

        scaleX: this.mesh.scale.x,
        scaleY: this.mesh.scale.y,
        scaleZ: this.mesh.scale.z,
      };

      const debugParams = {
        count: this.count,
        columns: this.columns,
        cameraY: this.cameraY,
        cursorX: this.cursorWorld.x,
        cursorY: this.cursorWorld.y,
        cursorZ: this.cursorWorld.z,
      };

      fogFolder.addColor(fogParams, "fogColor").onChange((value: string) => {
        const fog = scene.fog as THREE.FogExp2 | null;
        if (!fog) return;
        fog.color.set(value);
      });

      fogFolder
        .add(fogParams, "fogDensity", 0, 0.05, 0.0001)
        .onChange((value: number) => {
          const fog = scene.fog as THREE.FogExp2 | null;
          if (!fog) return;
          fog.density = value;
        });

      materialFolder
        .addColor(materialParams, "color")
        .onChange((value: string) => {
          material.color.set(value);
        });

      materialFolder
        .add(materialParams, "roughness", 0, 1, 0.001)
        .onChange((value: number) => {
          material.roughness = value;
        });

      materialFolder
        .add(materialParams, "metalness", 0, 1, 0.001)
        .onChange((value: number) => {
          material.metalness = value;
        });

      materialFolder
        .add(materialParams, "transmission", 0, 1, 0.001)
        .onChange((value: number) => {
          material.transmission = value;
        });

      materialFolder
        .add(materialParams, "thickness", 0, 10, 0.001)
        .onChange((value: number) => {
          material.thickness = value;
        });

      materialFolder
        .add(materialParams, "ior", 1, 2.5, 0.001)
        .onChange((value: number) => {
          material.ior = value;
        });

      materialFolder
        .add(materialParams, "clearcoat", 0, 1, 0.001)
        .onChange((value: number) => {
          material.clearcoat = value;
        });

      materialFolder
        .add(materialParams, "clearcoatRoughness", 0, 1, 0.001)
        .onChange((value: number) => {
          material.clearcoatRoughness = value;
        });

      materialFolder
        .addColor(materialParams, "attenuationColor")
        .onChange((value: string) => {
          material.attenuationColor?.set(value);
        });

      materialFolder
        .add(materialParams, "attenuationDistance", 0, 20, 0.001)
        .onChange((value: number) => {
          material.attenuationDistance = value;
        });

      materialFolder
        .add(materialParams, "envMapIntensity", 0, 10, 0.001)
        .onChange((value: number) => {
          material.envMapIntensity = value;
        });

      materialFolder
        .add(materialParams, "transparent")
        .onChange((value: boolean) => {
          material.transparent = value;
          material.needsUpdate = true;
        });

      materialFolder
        .add(materialParams, "depthWrite")
        .onChange((value: boolean) => {
          material.depthWrite = value;
          material.needsUpdate = true;
        });

      materialFolder
        .add(materialParams, "visible")
        .onChange((value: boolean) => {
          this.mesh.visible = value;
        });

      edgeFolder.add(edgeParams, "visible").onChange((value: boolean) => {
        for (const line of this.edgeLines) {
          line.visible = value;
        }
      });

      edgeFolder.addColor(edgeParams, "color").onChange((value: string) => {
        edgeMaterial.color.set(value);
      });

      edgeFolder
        .add(edgeParams, "opacity", 0, 5, 0.001)
        .onChange((value: number) => {
          edgeMaterial.opacity = value;
        });

      edgeFolder.add(edgeParams, "depthWrite").onChange((value: boolean) => {
        edgeMaterial.depthWrite = value;
        edgeMaterial.needsUpdate = true;
      });

      physicsFolder
        .add(physicsParams, "gravity", -0.02, 0.02, 0.00001)
        .onChange((value: number) => {
          this.gravity = value;
        });

      physicsFolder
        .add(physicsParams, "columnWidth", 0.1, 20, 0.001)
        .onChange((value: number) => {
          this.columnWidth = value;
        });

      physicsFolder
        .add(physicsParams, "worldHeight", 1, 300, 0.1)
        .onChange((value: number) => {
          this.worldHeight = value;
        });

      physicsFolder
        .add(physicsParams, "floorY", -200, 200, 0.1)
        .onChange((value: number) => {
          this.floorY = value;
        });

      physicsFolder
        .add(physicsParams, "interactionRadius", 0, 20, 0.001)
        .onChange((value: number) => {
          this.interactionRadius = value;
        });

      transformFolder
        .add(transformParams, "posX", -100, 100, 0.001)
        .onChange((value: number) => {
          this.mesh.position.x = value;
        });

      transformFolder
        .add(transformParams, "posY", -100, 100, 0.001)
        .onChange((value: number) => {
          this.mesh.position.y = value;
        });

      transformFolder
        .add(transformParams, "posZ", -100, 100, 0.001)
        .onChange((value: number) => {
          this.mesh.position.z = value;
        });

      transformFolder
        .add(transformParams, "rotX", -Math.PI, Math.PI, 0.001)
        .onChange((value: number) => {
          this.mesh.rotation.x = value;
        });

      transformFolder
        .add(transformParams, "rotY", -Math.PI, Math.PI, 0.001)
        .onChange((value: number) => {
          this.mesh.rotation.y = value;
        });

      transformFolder
        .add(transformParams, "rotZ", -Math.PI, Math.PI, 0.001)
        .onChange((value: number) => {
          this.mesh.rotation.z = value;
        });

      transformFolder
        .add(transformParams, "scaleX", 0.001, 20, 0.001)
        .onChange((value: number) => {
          this.mesh.scale.x = value;
        });

      transformFolder
        .add(transformParams, "scaleY", 0.001, 20, 0.001)
        .onChange((value: number) => {
          this.mesh.scale.y = value;
        });

      transformFolder
        .add(transformParams, "scaleZ", 0.001, 20, 0.001)
        .onChange((value: number) => {
          this.mesh.scale.z = value;
        });

      debugFolder.add(debugParams, "count").disable?.();
      debugFolder.add(debugParams, "columns").disable?.();
      debugFolder.add(debugParams, "cameraY").listen?.();
      debugFolder.add(debugParams, "cursorX").listen?.();
      debugFolder.add(debugParams, "cursorY").listen?.();
      debugFolder.add(debugParams, "cursorZ").listen?.();
    }
  }

  //
  // CREATE SINGLE CUBE
  //
  createCube(): CubeData {
    const column = Math.floor(Math.random() * this.columns);

    const x = (column - this.columns / 2) * this.columnWidth;

    return {
      position: new THREE.Vector3(
        x,

        Math.random() * this.worldHeight + 20,

        -20 - Math.random() * 30,
      ),

      velocity: new THREE.Vector3(),

      rotation: new THREE.Euler(),

      rotationalVelocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.002,

        (Math.random() - 0.5) * 0.002,

        (Math.random() - 0.5) * 0.002,
      ),

      scale: 0.8 + Math.random() * 1.2,

      settled: false,

      emissiveIntensity: 0.2 + Math.random() * 0.4,

      column,
    };
  }

  //
  // OPTIONAL MOUSE INTERACTION
  //
  setCursorWorld(x: number, y: number) {
    this.cursorWorld.set(x, y, 0);
  }

  //
  // CAMERA Y
  //
  setCameraY(y: number) {
    this.cameraY = y;
  }

  //
  // UPDATE LOOP
  //
  update() {
    const radiusSq = this.interactionRadius * this.interactionRadius;

    for (let i = 0; i < this.count; i++) {
      const cube = this.cubes[i];

      //
      // FALLING
      //
      if (!cube.settled) {
        cube.velocity.y += this.gravity;

        cube.position.add(cube.velocity);

        cube.velocity.multiplyScalar(0.985);

        //
        // ROTATION
        //
        cube.rotation.x += cube.rotationalVelocity.x;

        cube.rotation.y += cube.rotationalVelocity.y;

        cube.rotation.z += cube.rotationalVelocity.z;

        //
        // SUBTLE CURSOR FORCE
        //
        const col = (this.columns / 2) * this.columnWidth;
        const dx =
          mapRange(cube.position.x, -col, col, -1, 1) - this.cursorWorld.x;
        const dy =
          mapRange(cube.position.y, -80, 60, -1, 1) - this.cursorWorld.y;

        const distSq = dx * dx + dy * dy;

        if (distSq < radiusSq) {
          const force = 1 - distSq / radiusSq;

          cube.velocity.x += dx * force * 0.0006;

          cube.velocity.y += dy * force * 0.0006;
        }

        //
        // FLOOR COLLISION
        //
        if (cube.position.y <= this.floorY) {
          cube.position.y = this.floorY;

          cube.settled = true;

          cube.velocity.set(0, 0, 0);
        }
      }

      //
      // SETTLED STATE
      //
      else {
        cube.rotation.x += 0.0001;

        cube.rotation.y += 0.00015;
      }

      //
      // MATRIX
      //
      this.dummy.position.copy(cube.position);

      this.dummy.rotation.copy(cube.rotation);

      //
      // SLIGHT VERTICAL STRETCH
      //
      this.dummy.scale.set(
        cube.scale,

        cube.scale * 1.15,

        cube.scale,
      );

      this.dummy.updateMatrix();

      //
      // APPLY MATRICES
      //
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      this.edgeLines[i].position.copy(cube.position);

      this.edgeLines[i].rotation.copy(cube.rotation);

      this.edgeLines[i].scale.set(cube.scale, cube.scale * 1.15, cube.scale);
    }

    //
    // UPDATE FLAGS
    //
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

function mapRange(x, inMin, inMax, outMin, outMax) {
  return outMin + ((x - inMin) * (outMax - outMin)) / (inMax - inMin);
}
