import * as THREE from "three";

export function createEnvironmentMap(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);

  const scene = new THREE.Scene();

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const geo = new THREE.PlaneGeometry(20, 20);

  const topLight = new THREE.Mesh(geo, material);
  topLight.position.y = 10;
  topLight.rotateX(-Math.PI / 2);
  scene.add(topLight);

  const sideLight = new THREE.Mesh(geo, material);
  sideLight.position.x = -10;
  sideLight.rotateY(Math.PI / 2);
  scene.add(sideLight);

  const envMap = pmrem.fromScene(scene).texture;

  return envMap;
}
