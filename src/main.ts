import "./styles/app.css";
import "./styles/hero.css";

import { Experience } from "./core/experience";
import { MagneticButton } from "./interactions/magnetic/MagneticButton";
import { UIAnimations } from "./animation/ui-animation";
const canvas = document.querySelector<HTMLCanvasElement>("#webgl");

if (!canvas) throw new Error("Canvas missing");
new UIAnimations();
new Experience(canvas);
document.querySelectorAll(".magnetic-btn").forEach((el) => {
  new MagneticButton(el as HTMLElement);
});
