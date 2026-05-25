/**
 * Image utilities: load a File / HTMLImageElement into a normalized grayscale
 * Float32Array on the [0, 1] interval, and synthesize a few interesting test
 * fields whose persistent homology is mathematically interesting.
 */

export type ImageField = {
  values: Float32Array;
  width: number;
  height: number;
  label: string;
};

const MAX_SIDE = 240;

export async function loadImageToField(file: File): Promise<ImageField> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadHTMLImage(url);
    return rasterToField(img, file.name);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadFieldFromUrl(url: string, label: string): Promise<ImageField> {
  const img = await loadHTMLImage(url);
  return rasterToField(img, label);
}

function loadHTMLImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

function rasterToField(img: HTMLImageElement, label: string): ImageField {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const width = Math.max(2, Math.round(img.width * scale));
  const height = Math.max(2, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const values = new Float32Array(width * height);
  for (let i = 0; i < values.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    values[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return normalize({ values, width, height, label });
}

// ---------------------------------------------------------------------------
// Procedural sample fields.  Each is engineered to have a controlled topology.
// ---------------------------------------------------------------------------

const DEFAULT_W = 160;
const DEFAULT_H = 160;

export function sampleBlobs(seed = 1): ImageField {
  const w = DEFAULT_W;
  const h = DEFAULT_H;
  const values = new Float32Array(w * h);
  const rng = mulberry32(seed * 2654435761);
  const blobs = Array.from({ length: 7 }, () => ({
    cx: rng() * w,
    cy: rng() * h,
    sigma: 8 + rng() * 22,
    amp: 0.4 + rng() * 0.8,
  }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (const b of blobs) {
        const dx = x - b.cx;
        const dy = y - b.cy;
        v += b.amp * Math.exp(-(dx * dx + dy * dy) / (2 * b.sigma * b.sigma));
      }
      values[y * w + x] = v;
    }
  }
  return normalize({ values, width: w, height: h, label: "gaussian blobs" });
}

export function sampleRings(seed = 7): ImageField {
  const w = DEFAULT_W;
  const h = DEFAULT_H;
  const values = new Float32Array(w * h);
  const rng = mulberry32(seed);
  const rings = Array.from({ length: 4 }, () => ({
    cx: w * 0.25 + rng() * w * 0.5,
    cy: h * 0.25 + rng() * h * 0.5,
    r: 10 + rng() * 28,
    thickness: 3 + rng() * 4,
  }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (const r of rings) {
        const dx = x - r.cx;
        const dy = y - r.cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        v += Math.exp(-((d - r.r) ** 2) / (2 * r.thickness * r.thickness));
      }
      values[y * w + x] = v;
    }
  }
  return normalize({ values, width: w, height: h, label: "annuli (H₁ rich)" });
}

export function sampleTerrain(seed = 13): ImageField {
  const w = DEFAULT_W;
  const h = DEFAULT_H;
  const values = new Float32Array(w * h);
  const rng = mulberry32(seed);
  // Sum of low-frequency sines + a little fBm-ish noise.
  const sines = Array.from({ length: 6 }, () => ({
    kx: (rng() - 0.5) * 0.18,
    ky: (rng() - 0.5) * 0.18,
    phase: rng() * Math.PI * 2,
    amp: 0.5 + rng() * 0.8,
  }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (const s of sines) v += s.amp * Math.sin(s.kx * x + s.ky * y + s.phase);
      v += 0.4 * (rng() - 0.5);
      values[y * w + x] = v;
    }
  }
  smooth(values, w, h, 2);
  return normalize({ values, width: w, height: h, label: "morse terrain" });
}

export function sampleDigit(): ImageField {
  // A stylized "8" with two H_1 loops, useful as a pedagogical
  // example because students immediately predict β₁ = 2.
  const w = DEFAULT_W;
  const h = DEFAULT_H;
  const values = new Float32Array(w * h);
  const cx = w / 2;
  const top = h * 0.32;
  const bot = h * 0.68;
  const rOuter = Math.min(w, h) * 0.22;
  const stroke = 6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d1 = Math.abs(Math.hypot(x - cx, y - top) - rOuter);
      const d2 = Math.abs(Math.hypot(x - cx, y - bot) - rOuter);
      const d = Math.min(d1, d2);
      values[y * w + x] = Math.exp(-(d * d) / (2 * stroke * stroke));
    }
  }
  smooth(values, w, h, 1);
  return normalize({ values, width: w, height: h, label: "figure eight" });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(field: ImageField): ImageField {
  let min = Infinity;
  let max = -Infinity;
  for (const v of field.values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  for (let i = 0; i < field.values.length; i++) {
    field.values[i] = (field.values[i] - min) / span;
  }
  return field;
}

function smooth(buf: Float32Array, w: number, h: number, passes: number) {
  const tmp = new Float32Array(buf.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let s = 0;
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            s += buf[ny * w + nx];
            c++;
          }
        }
        tmp[y * w + x] = s / c;
      }
    }
    buf.set(tmp);
  }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type SampleSpec =
  | { kind: "procedural"; label: string; subtitle: string; build: () => ImageField }
  | { kind: "asset"; label: string; subtitle: string; url: string };

export const SAMPLES: Record<string, SampleSpec> = {
  hubble: {
    kind: "asset",
    label: "Hubble XDF",
    subtitle: "deepest view of the universe",
    url: "/hubble-xdf.jpg",
  },
  poincare: {
    kind: "asset",
    label: "Poincaré",
    subtitle: "founder of algebraic topology",
    url: "/poincare.png",
  },
  blobs: {
    kind: "procedural",
    label: "Blobs",
    subtitle: "gaussian sum · H₀ rich",
    build: sampleBlobs,
  },
  rings: {
    kind: "procedural",
    label: "Annuli",
    subtitle: "concentric rings · H₁ rich",
    build: sampleRings,
  },
  terrain: {
    kind: "procedural",
    label: "Terrain",
    subtitle: "morse landscape",
    build: sampleTerrain,
  },
  digit: {
    kind: "procedural",
    label: "Figure 8",
    subtitle: "two loops",
    build: sampleDigit,
  },
} as const;

export type SampleKey = keyof typeof SAMPLES;

export async function resolveSample(key: SampleKey): Promise<ImageField> {
  const spec = SAMPLES[key];
  if (spec.kind === "procedural") return spec.build();
  return loadFieldFromUrl(spec.url, spec.label);
}
