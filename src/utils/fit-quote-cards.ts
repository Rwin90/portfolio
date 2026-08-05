const TARGET_LINES = 8;
const MIN_WIDTH = 220;
const MAX_WIDTH = 560;
// Word-wrap never packs a line to exactly its container width, and every
// paragraph break leaves a ragged last line — this buffer keeps the
// estimate from running a line or two long.
const WIDTH_BUFFER = 1.12;
const LINES_LOST_PER_PARAGRAPH = 0.6;

/**
 * Sizes each testimonial's text block so its content wraps into roughly
 * TARGET_LINES lines — a dynamic width per card instead of a fixed one, so
 * a short quote doesn't leave empty space and a long one doesn't need to
 * scroll or split into columns.
 */
export function fitQuoteCardWidths() {
  const bodies = document.querySelectorAll<HTMLElement>(".quote-card__body");
  if (!bodies.length) return;

  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return;

  const sampleP = bodies[0].querySelector("p");
  const style = getComputedStyle(sampleP ?? bodies[0]);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

  bodies.forEach((body) => {
    const paragraphs = Array.from(body.querySelectorAll("p"));

    const totalWidth = paragraphs.reduce((sum, p) => {
      const text = (p.textContent ?? "").trim().replace(/\s+/g, " ");
      return sum + ctx.measureText(text).width;
    }, 0);

    const effectiveLines = Math.max(
      1,
      TARGET_LINES - (paragraphs.length - 1) * LINES_LOST_PER_PARAGRAPH,
    );

    const width = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, Math.ceil((totalWidth / effectiveLines) * WIDTH_BUFFER)),
    );

    body.style.width = `${width}px`;
  });
}
