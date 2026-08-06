import "./styles/app.css";
import "./components/loading-screen/loading-screen.css";

import { Experience } from "./core/experience";
import { CustomCursor } from "./interactions/cursor";
import { PortraitPixelFlip } from "./interactions/portrait-pixel-flip";
import { UIAnimations } from "./animation/ui-animation";
import { LoadingScreen } from "./components/loading-screen/loading-screen";
import { fitQuoteCardWidths } from "./utils/fit-quote-cards";

// Fake minimum loading time: the real experience is usually ready almost
// instantly, which would cut the loader off before its tetromino loop reads
// as an animation at all.
const MIN_LOADING_MS = 2500;

const canvas = document.querySelector<HTMLCanvasElement>("#webgl");
const logoCanvas = document.getElementById("logo-cube");

if (!canvas) throw new Error("Canvas missing");

const loader = new LoadingScreen();
const loadStartedAt = performance.now();

new UIAnimations();
new CustomCursor();

const portraitEl = document.querySelector<HTMLElement>(".portrait");
const portraitFrontImg = portraitEl?.querySelector<HTMLImageElement>(
  "img:not(.portrait__back-img)",
);
const portraitBackImg = portraitEl?.querySelector<HTMLImageElement>(
  ".portrait__back-img",
);
const portraitFlipPool = portraitEl?.querySelector<HTMLElement>(
  ".portrait-flip-pool",
);
if (portraitEl && portraitFrontImg && portraitBackImg && portraitFlipPool) {
  new PortraitPixelFlip(portraitEl, portraitFrontImg, portraitBackImg, portraitFlipPool);
}

// WebGL can fail to initialize (unsupported browser, exhausted contexts,
// driver issue) — fall back to the flat, 3D-free page instead of a blank
// screen stuck behind the loader forever.
let experience: Experience | null = null;
try {
  experience = new Experience(canvas);
} catch (error) {
  console.error("3D experience failed to start; showing the flat page.", error);
  canvas.style.display = "none";
  logoCanvas?.style.setProperty("display", "none");
}

if (experience) {
  // Hold scroll until the first frame is on screen, so the intro isn't
  // scrolled past behind the loading screen and the shader-compile stall
  // stays hidden.
  experience.scroll.lenis.stop();
  experience.whenReady(() => {
    const remaining = Math.max(0, MIN_LOADING_MS - (performance.now() - loadStartedAt));
    setTimeout(() => {
      loader.setProgress(1);
      experience!.scroll.lenis.start();
    }, remaining);
  });
} else {
  // No "first frame rendered" signal to wait on — just clear the loader
  // after the fake minimum.
  const remaining = Math.max(0, MIN_LOADING_MS - (performance.now() - loadStartedAt));
  setTimeout(() => loader.setProgress(1), remaining);
}

// Waits for the real font metrics — measuring against a fallback font would
// size every card wrong until the swap.
document.fonts.ready.then(fitQuoteCardWidths);

if (import.meta.env.DEV) {
  (window as any).experience = experience;
}
