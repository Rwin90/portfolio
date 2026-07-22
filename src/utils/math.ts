export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mapRange = (
  x: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => {
  return outMin + ((x - inMin) * (outMax - outMin)) / (inMax - inMin);
};
