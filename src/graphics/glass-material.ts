import * as THREE from "three";

/**
 * The glass look, in one place, so the falling cubes and the pyramid share
 * one material instance — one shader program, and one GUI folder that tunes
 * both at once.
 */
export function createGlassMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#6906ec"),

    metalness: 0,

    roughness: 0.203,

    transmission: 1,

    thickness: 1.8,

    ior: 1.45,

    clearcoat: 1,
    clearcoatRoughness: 0.67,

    attenuationColor: new THREE.Color("#bcd6ff"),
    attenuationDistance: 20.0,

    // With transmission at 1 the environment map is the only source of
    // specular highlights, so zeroing this made the glass read flat.
    envMapIntensity: 1.0,

    transparent: true,

    depthWrite: false,
  });
}

export type EdgeOptions = {
  color: string;
  baseGlow: number;
  pulseStrength: number;
  pulseSpeed: number;
  edgeScale: number;
};

export const EDGE_INNER: EdgeOptions = {
  color: "#eceafa",
  baseGlow: 0.45,
  pulseStrength: 1.0,
  pulseSpeed: 0.8,
  edgeScale: 1.2,
};

export const EDGE_OUTER: EdgeOptions = {
  color: "#d5d5d5",
  baseGlow: 1.55,
  pulseStrength: 1.2,
  pulseSpeed: 0.8,
  edgeScale: 1.0,
};

/**
 * Glowing edge shell drawn around each cube.
 *
 * Instanced by hand rather than via InstancedMesh: the look depends on drawing
 * actual line segments (EdgesGeometry), and InstancedMesh only renders
 * triangles. Three still instance-renders a LineSegments whose geometry is an
 * InstancedBufferGeometry, so the per-instance transform is supplied as
 * iPosition / iQuat / iScale attributes and composed in the vertex shader.
 *
 * EdgesGeometry carries only positions (no normals), and every one of its
 * vertices is a cube corner, so the original shader's normal-based offset,
 * edge mask and facing terms were all inert — dropped here. What actually
 * shaped the look was uEdgeScale (pushing the wireframe out from the cube
 * center) plus the color/glow/pulse, which is all that remains.
 */
export function createEdgeMaterial(options: EdgeOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,

    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(options.color) },
      uBaseGlow: { value: options.baseGlow },
      uPulseStrength: { value: options.pulseStrength },
      uPulseSpeed: { value: options.pulseSpeed },
      uEdgeScale: { value: options.edgeScale },
    },

    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uEdgeScale;

      attribute vec3 iPosition;
      attribute vec4 iQuat;
      attribute vec3 iScale;

      vec3 applyQuat(vec3 v, vec4 q) {
        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
      }

      void main() {
        vec3 pos = position;

        // subtle atmospheric motion (animation-systems.md)
        pos.y += sin(uTime * 0.7 + position.x * 10.0) * 0.02;

        // push the wireframe out from the cube center for an elegant halo
        pos *= uEdgeScale;

        // per-instance transform
        vec3 worldOffset = applyQuat(pos * iScale, iQuat);
        vec4 mvPosition = modelViewMatrix * vec4(iPosition + worldOffset, 1.0);

        gl_Position = projectionMatrix * mvPosition;
      }
    `,

    fragmentShader: /* glsl */ `
      uniform vec3 uColor;

      uniform float uTime;
      uniform float uBaseGlow;
      uniform float uPulseStrength;
      uniform float uPulseSpeed;

      void main() {
        // microinteraction breathing
        float pulse = sin(uTime * uPulseSpeed * 2.0) * 0.5 + 0.5;

        // layered timing (animation-systems.md)
        float envelope =
          smoothstep(0.6, 1.0, sin(uTime * uPulseSpeed) * 0.5 + 0.5);

        float intensity =
          uBaseGlow + envelope * pulse * uPulseStrength;

        vec3 color = uColor * intensity;

        gl_FragColor = vec4(color, intensity);
      }
    `,
  });
}

/**
 * Per-instance transform buffers for the edge shells, shared by both shells so
 * each cube's transform is written once per frame rather than once per shell.
 */
export class EdgeInstanceBuffers {
  readonly position: THREE.InstancedBufferAttribute;
  readonly quaternion: THREE.InstancedBufferAttribute;
  readonly scale: THREE.InstancedBufferAttribute;

  constructor(count: number) {
    this.position = new THREE.InstancedBufferAttribute(
      new Float32Array(count * 3),
      3,
    );
    this.quaternion = new THREE.InstancedBufferAttribute(
      new Float32Array(count * 4),
      4,
    );
    this.scale = new THREE.InstancedBufferAttribute(
      new Float32Array(count * 3),
      3,
    );
  }

  write(index: number, object: THREE.Object3D) {
    this.position.setXYZ(
      index,
      object.position.x,
      object.position.y,
      object.position.z,
    );
    this.quaternion.setXYZW(
      index,
      object.quaternion.x,
      object.quaternion.y,
      object.quaternion.z,
      object.quaternion.w,
    );
    this.scale.setXYZ(index, object.scale.x, object.scale.y, object.scale.z);
  }

  markDirty() {
    this.position.needsUpdate = true;
    this.quaternion.needsUpdate = true;
    this.scale.needsUpdate = true;
  }

  /** Builds an instanced geometry from a source geometry, sharing these buffers. */
  attachTo(source: THREE.BufferGeometry, count: number) {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.instanceCount = count;

    geometry.setAttribute("position", source.getAttribute("position"));
    if (source.getAttribute("normal")) {
      geometry.setAttribute("normal", source.getAttribute("normal"));
    }
    if (source.index) geometry.setIndex(source.index);

    geometry.setAttribute("iPosition", this.position);
    geometry.setAttribute("iQuat", this.quaternion);
    geometry.setAttribute("iScale", this.scale);

    return geometry;
  }
}
