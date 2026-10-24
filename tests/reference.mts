/**
 * Brute-force reference for the persistent homology of a small image.
 *
 * Convention (the one the engine implements): the sublevel set X_t = {f <= t}
 * is a union of pixels joined by 4-adjacency, and its complement is read with
 * 8-adjacency, so that the two are dual on the pixel grid. Everything outside
 * the image belongs to the complement.
 *
 *   beta0(t) = number of 4-connected components of X_t
 *   beta1(t) = number of 8-connected components of the complement of X_t
 *              that do not touch the image border (the bounded ones)
 *
 * Diagrams are recovered from the rank invariant
 *   r_k(s, t) = rank H_k(X_s) -> H_k(X_t),   s <= t,
 * evaluated directly on the sets, by inclusion-exclusion.
 */

export type RefPair = { birth: number; death: number };

const N4 = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const N8 = [...N4, [-1, -1], [1, -1], [-1, 1], [1, 1]];

/** Label connected components of `mask` (1 = inside). Returns labels (-1 outside the mask) and the count. */
function label(mask: Uint8Array, w: number, h: number, conn: number[][]): { lab: Int32Array; count: number } {
  const lab = new Int32Array(w * h).fill(-1);
  let count = 0;
  const stack: number[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || lab[s] !== -1) continue;
    lab[s] = count;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p - x) / w;
      for (const [dx, dy] of conn) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mask[q] && lab[q] === -1) {
          lab[q] = count;
          stack.push(q);
        }
      }
    }
    count++;
  }
  return { lab, count };
}

function sublevel(values: ArrayLike<number>, t: number): Uint8Array {
  const m = new Uint8Array(values.length);
  for (let i = 0; i < values.length; i++) m[i] = values[i] <= t ? 1 : 0;
  return m;
}

function isBorder(p: number, w: number, h: number): boolean {
  const x = p % w;
  const y = (p - x) / w;
  return x === 0 || y === 0 || x === w - 1 || y === h - 1;
}

/** Holes of X_t: labels of the bounded 8-components of the complement. */
function holes(values: ArrayLike<number>, w: number, h: number, t: number) {
  const X = sublevel(values, t);
  const C = X.map((v) => 1 - v);
  const { lab, count } = label(C, w, h, N8);
  const bounded = new Uint8Array(count).fill(1);
  for (let p = 0; p < w * h; p++) if (lab[p] >= 0 && isBorder(p, w, h)) bounded[lab[p]] = 0;
  return { lab, bounded };
}

export function betti(values: ArrayLike<number>, w: number, h: number, t: number): [number, number] {
  const b0 = label(sublevel(values, t), w, h, N4).count;
  const { bounded } = holes(values, w, h, t);
  let b1 = 0;
  for (const b of bounded) b1 += b;
  return [b0, b1];
}

/** rank H0(X_s) -> H0(X_t): components of X_t that meet X_s. */
function rank0(values: ArrayLike<number>, w: number, h: number, s: number, t: number): number {
  const { lab, count } = label(sublevel(values, t), w, h, N4);
  const hit = new Uint8Array(count);
  for (let p = 0; p < w * h; p++) if (values[p] <= s) hit[lab[p]] = 1;
  let r = 0;
  for (const v of hit) r += v;
  return r;
}

/**
 * rank H1(X_s) -> H1(X_t). By Alexander duality this is the rank of
 * H~0(X_t^c ∪ ∞) -> H~0(X_s^c ∪ ∞): the bounded components of X_s^c that
 * still contain a point of X_t^c.
 */
function rank1(values: ArrayLike<number>, w: number, h: number, s: number, t: number): number {
  const { lab, bounded } = holes(values, w, h, s);
  const hit = new Uint8Array(bounded.length);
  for (let p = 0; p < w * h; p++) if (values[p] > t && lab[p] >= 0 && bounded[lab[p]]) hit[lab[p]] = 1;
  let r = 0;
  for (const v of hit) r += v;
  return r;
}

/** Persistence diagram of dimension k; essential classes have death = Infinity. */
export function diagram(values: ArrayLike<number>, w: number, h: number, k: 0 | 1): RefPair[] {
  const vs = Array.from(new Set(Array.from(values))).sort((a, b) => a - b);
  const m = vs.length;
  const rank = k === 0 ? rank0 : rank1;
  // R[i][j] = rank(vs[i] -> vs[j]) for i <= j; out-of-range indices give 0.
  const R: number[][] = [];
  for (let i = 0; i < m; i++) {
    R.push([]);
    for (let j = 0; j < m; j++) R[i].push(j >= i ? rank(values, w, h, vs[i], vs[j]) : 0);
  }
  const r = (i: number, j: number) => (i < 0 || j >= m || i > j ? 0 : R[i][j]);
  const out: RefPair[] = [];
  for (let i = 0; i < m; i++) {
    for (let j = i + 1; j < m; j++) {
      // Classes born at vs[i] that die exactly at vs[j].
      const mult = r(i, j - 1) - r(i - 1, j - 1) - r(i, j) + r(i - 1, j);
      for (let c = 0; c < mult; c++) out.push({ birth: vs[i], death: vs[j] });
    }
    const ess = r(i, m - 1) - r(i - 1, m - 1);
    for (let c = 0; c < ess; c++) out.push({ birth: vs[i], death: Infinity });
  }
  return out;
}
