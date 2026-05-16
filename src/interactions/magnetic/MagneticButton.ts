import gsap from "gsap";

export class MagneticButton {
  el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;

    this.el.addEventListener("mousemove", this.onMove);

    this.el.addEventListener("mouseleave", this.onLeave);

    this.el.addEventListener("mousedown", this.onDown);

    this.el.addEventListener("mouseup", this.onUp);
  }

  onMove = (e: MouseEvent) => {
    const rect = this.el.getBoundingClientRect();

    const x = e.clientX - rect.left - rect.width / 2;

    const y = e.clientY - rect.top - rect.height / 2;

    gsap.to(this.el, {
      x: x * 0.2,
      y: y * 0.2,
      duration: 0.6,
      ease: "power3.out",
    });
  };

  onLeave = () => {
    gsap.to(this.el, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.8,
      ease: "elastic.out(1,0.5)",
    });
  };

  onDown = () => {
    gsap.to(this.el, {
      scale: 0.96,
      duration: 0.15,
    });
  };

  onUp = () => {
    gsap.to(this.el, {
      scale: 1,
      duration: 0.5,
      ease: "elastic.out(1,0.5)",
    });
  };
}
