/**
 * Perceptually pleasant colormaps tuned for a dark background.
 *
 *   `viridis`  : the classic, used for the field itself.
 *   `magma`    : the level-set glow under the rising tide.
 *   `cyanFire` : accent for H_0 markers.
 *   `magenta`  : accent for H_1 markers.
 */

type RGB = readonly [number, number, number];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function rampStops(t: number, stops: RGB[]): RGB {
  if (t <= 0) return stops[0];
  if (t >= 1) return stops[stops.length - 1];
  const x = t * (stops.length - 1);
  const i = Math.floor(x);
  const u = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
}

const VIRIDIS: RGB[] = [
  [0.267, 0.005, 0.329],
  [0.281, 0.165, 0.471],
  [0.244, 0.288, 0.535],
  [0.190, 0.408, 0.555],
  [0.147, 0.520, 0.557],
  [0.121, 0.633, 0.531],
  [0.288, 0.788, 0.412],
  [0.626, 0.854, 0.221],
  [0.993, 0.906, 0.144],
];

const MAGMA: RGB[] = [
  [0.001, 0.000, 0.014],
  [0.080, 0.043, 0.221],
  [0.232, 0.060, 0.438],
  [0.412, 0.094, 0.502],
  [0.595, 0.149, 0.500],
  [0.792, 0.219, 0.420],
  [0.929, 0.378, 0.341],
  [0.992, 0.611, 0.387],
  [0.997, 0.831, 0.582],
];

export function viridis(t: number): RGB {
  return rampStops(t, VIRIDIS);
}

export function magma(t: number): RGB {
  return rampStops(t, MAGMA);
}

export const ACCENT_H0 = "#56e0ff";
export const ACCENT_H0_GLOW = "rgba(86, 224, 255, 0.55)";
export const ACCENT_H1 = "#ff5dd2";
export const ACCENT_H1_GLOW = "rgba(255, 93, 210, 0.55)";

export function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
