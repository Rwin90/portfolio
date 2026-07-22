import { gsap } from "gsap";

export class LoadingScreen {
  private container: HTMLElement;
  private logo: HTMLElement;

  private ready = false;

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "loading-screen";

    // Text mark rather than an image asset — self-contained, on-brand, and
    // nothing to 404 on.
    this.logo = document.createElement("div");
    this.logo.className = "loading-logo";
    this.logo.textContent = "Arwin";

    this.container.appendChild(this.logo);
    document.body.appendChild(this.container);

    this.animateIntro();
  }

  animateIntro() {
    gsap.fromTo(
      this.logo,
      { opacity: 0, scale: 0.8, y: 40, filter: "blur(8px)" },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.6,
        ease: "power3.out",
        onComplete: () => this.animatePulse(),
      },
    );
  }

  animatePulse() {
    gsap.to(this.logo, {
      scale: 1.06,
      filter: "drop-shadow(0 0 6px #bcd6ff)",
      yoyo: true,
      repeat: -1,
      duration: 1.8,
      ease: "sine.inOut",
    });
  }

  hide() {
    gsap.to(this.container, {
      opacity: 0,
      duration: 1.2,
      ease: "power2.inOut",
      onComplete: () => {
        this.container.remove();
      },
    });
  }

  setProgress(p: number) {
    // Optionally animate a radial or linear progress bar synced to asset loading.
    if (p >= 1.0 && !this.ready) {
      this.ready = true;
      this.animateOut();
    }
  }

  animateOut() {
    gsap.to(this.logo, {
      scale: 0.5,
      opacity: 0,
      filter: "blur(6px)",
      duration: 1.0,
      ease: "power4.in",
      onComplete: () => this.hide(),
    });
  }
}
