import "./styles/app.css";
import "./components/loading-screen/loading-screen.css";

import { Experience } from "./core/experience";
import { MagneticButton } from "./interactions/magnetic/MagneticButton";
import { CustomCursor } from "./interactions/cursor";
import { UIAnimations } from "./animation/ui-animation";
import { LoadingScreen } from "./components/loading-screen/loading-screen";
import { fitQuoteCardWidths } from "./utils/fit-quote-cards";

// Fake minimum loading time: the real experience is usually ready almost
// instantly, which would cut the loader off before its tetromino loop reads
// as an animation at all.
const MIN_LOADING_MS = 2500;

const canvas = document.querySelector<HTMLCanvasElement>("#webgl");

if (!canvas) throw new Error("Canvas missing");

const loader = new LoadingScreen();
const loadStartedAt = performance.now();

new UIAnimations();
new CustomCursor();
const experience = new Experience(canvas);

// Hold scroll until the first frame is on screen, so the intro isn't scrolled
// past behind the loading screen and the shader-compile stall stays hidden.
experience.scroll.lenis.stop();
experience.whenReady(() => {
  const remaining = Math.max(0, MIN_LOADING_MS - (performance.now() - loadStartedAt));
  setTimeout(() => {
    loader.setProgress(1);
    experience.scroll.lenis.start();
  }, remaining);
});

document.querySelectorAll(".magnetic-btn").forEach((el) => {
  new MagneticButton(el as HTMLElement);
});

// Waits for the real font metrics — measuring against a fallback font would
// size every card wrong until the swap.
document.fonts.ready.then(fitQuoteCardWidths);

if (import.meta.env.DEV) {
  (window as any).experience = experience;
}
