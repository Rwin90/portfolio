import * as THREE from "three";

/** The glass look used by the corner cube. */
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
