import "./styles/app.css";
import "./components/loading-screen/loading-screen.css";

import { Experience } from "./core/experience";
import { MagneticButton } from "./interactions/magnetic/MagneticButton";
import { UIAnimations } from "./animation/ui-animation";
import { LoadingScreen } from "./components/loading-screen/loading-screen";

const canvas = document.querySelector<HTMLCanvasElement>("#webgl");

if (!canvas) throw new Error("Canvas missing");

const loader = new LoadingScreen();

new UIAnimations();
const experience = new Experience(canvas);

// Hold scroll until the first frame is on screen, so the intro isn't scrolled
// past behind the loading screen and the shader-compile stall stays hidden.
experience.scroll.lenis.stop();
experience.whenReady(() => {
  loader.setProgress(1);
  experience.scroll.lenis.start();
});

document.querySelectorAll(".magnetic-btn").forEach((el) => {
  new MagneticButton(el as HTMLElement);
});

if (import.meta.env.DEV) {
  (window as any).experience = experience;
}
