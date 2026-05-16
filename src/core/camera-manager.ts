import * as THREE from "three";

import { Mouse } from "./mouse";

export class CameraManager {
  camera: THREE.PerspectiveCamera;

  group = new THREE.Group();

  lookAtTarget = new THREE.Vector3();

  currentLookAt = new THREE.Vector3();

  targetRotationX = 0;

  targetRotationY = 0;

  currentRotationX = 0;

  currentRotationY = 0;

  currentScrollY = 0;

  targetScrollY = 0;

  baseZ = 42;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      1500,
    );

    this.camera.position.set(0, 8, this.baseZ);

    this.group.add(this.camera);

    window.addEventListener("resize", this.onResize);
  }

  update(
    mouse: Mouse,
    scrollProgress: number,
    scrollVelocity: number,
    worldHeight: number,
  ) {
    this.updateScroll(scrollProgress, worldHeight);

    this.updateMouseParallax(mouse);

    this.updateCameraMotion(scrollVelocity);

    this.updateLookAt();
  }

  updateScroll(scrollProgress: number, worldHeight: number) {
    this.targetScrollY = 8 - scrollProgress * 80;

    this.currentScrollY += (this.targetScrollY - this.currentScrollY) * 0.045;

    this.camera.position.y = this.currentScrollY;
  }

  updateMouseParallax(mouse: Mouse) {
    this.targetRotationX = mouse.normalized.y * 0.08;

    this.targetRotationY = mouse.normalized.x * 0.12;

    this.currentRotationX +=
      (this.targetRotationX - this.currentRotationX) * 0.04;

    this.currentRotationY +=
      (this.targetRotationY - this.currentRotationY) * 0.04;
  }

  updateCameraMotion(scrollVelocity: number) {
    const velocityInfluence = Math.min(Math.abs(scrollVelocity), 40);

    this.camera.position.z = this.baseZ + velocityInfluence * 0.045;

    this.camera.rotation.z = scrollVelocity * 0.00025;

    // this.camera.rotation.x = this.currentRotationX;

    // this.camera.rotation.y = this.currentRotationY;

    this.group.position.x = Math.sin(performance.now() * 0.00008) * 0.6;

    this.group.position.y +=
      (Math.sin(performance.now() * 0.00012) * 0.4 - this.group.position.y) *
      0.02;
  }

  updateLookAt() {
    this.lookAtTarget.set(
      this.currentRotationY * 10,

      this.camera.position.y - 6 + this.currentRotationX * 8,

      -40,
    );

    this.currentLookAt.lerp(this.lookAtTarget, 0.035);

    this.camera.lookAt(this.currentLookAt);
  }

  onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;

    this.camera.updateProjectionMatrix();
  };
}
