/**
 * Persistent homology of a 2D grayscale image, treated as a discrete Morse
 * function f: Ω ⊂ ℤ² → ℝ on a cubical complex.
 *
 *   H₀ of the sublevel-set filtration { f ≤ t } is computed directly via
 *   union-find with the elder rule (Edelsbrunner & Harer, 2010).
 *
 *   H₁ of the sublevel filtration is recovered through Alexander duality:
 *   on the 2-sphere compactification, H₁({f ≤ t}) ≅ H̃₀({f > t}).
 *   Concretely, we run the same union-find in the descending direction over
 *   pixels and re-interpret births/deaths in the original (ascending) frame.
 */

export type Pair = {
  birth: number;
  death: number;
  lifetime: number;
  birthIdx: number;
  deathIdx: number;
  dim: 0 | 1;
};

export type PersistenceResult = {
  pairs: Pair[];
  h0: Pair[];
  h1: Pair[];
  min: number;
  max: number;
  width: number;
  height: number;
};

const NEIGHBOR_OFFSETS_4 = [-1, 1] as const;

function neighborsOf(p: number, w: number, h: number, out: number[]): number {
  const x = p % w;
  const y = (p - x) / w;
  let n = 0;
  if (x > 0) out[n++] = p - 1;
  if (x < w - 1) out[n++] = p + 1;
  if (y > 0) out[n++] = p - w;
  if (y < h - 1) out[n++] = p + w;
  return n;
  void NEIGHBOR_OFFSETS_4;
}

function makeUnionFind(n: number) {
  const parent = new Int32Array(n);
  const rank = new Uint8Array(n);
  const birthSite = new Int32Array(n);
  const active = new Uint8Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;

  function find(x: number): number {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) {
      const next = parent[x];
      parent[x] = r;
      x = next;
    }
    return r;
  }

  return { parent, rank, birthSite, active, find };
}

/**
 * Sweep the pixel grid in a given order, building up the sublevel set,
 * recording H₀ births and deaths under the elder rule.
 *
 * If `descending` is true the same procedure runs on the superlevel set,
 * producing the dual diagram that, by Alexander duality, encodes H_1.
 */
function sweepH0(
  values: Float32Array,
  w: number,
  h: number,
  order: Int32Array,
): { pairs: Array<Omit<Pair, "dim" | "lifetime">>; essentialBirthIdx: number } {
  const n = values.length;
  const uf = makeUnionFind(n);
  const pairs: Array<Omit<Pair, "dim" | "lifetime">> = [];
  const nbrBuf: number[] = [0, 0, 0, 0];
  let essentialBirthIdx = order[0];

  for (let k = 0; k < n; k++) {
    const p = order[k];
    uf.active[p] = 1;
    uf.birthSite[p] = p;
    const v = values[p];

    const nNbr = neighborsOf(p, w, h, nbrBuf);
    let myRoot = p;
    for (let i = 0; i < nNbr; i++) {
      const q = nbrBuf[i];
      if (!uf.active[q]) continue;
      const qRoot = uf.find(q);
      if (qRoot === myRoot) continue;

      const myBirthIdx = uf.birthSite[myRoot];
      const qBirthIdx = uf.birthSite[qRoot];
      const myBirthVal = values[myBirthIdx];
      const qBirthVal = values[qBirthIdx];

      let survivor: number;
      let dying: number;
      let dyingBirthIdx: number;
      if (myBirthVal < qBirthVal || (myBirthVal === qBirthVal && myBirthIdx < qBirthIdx)) {
        survivor = myRoot;
        dying = qRoot;
        dyingBirthIdx = qBirthIdx;
      } else {
        survivor = qRoot;
        dying = myRoot;
        dyingBirthIdx = myBirthIdx;
      }

      pairs.push({
        birth: values[dyingBirthIdx],
        death: v,
        birthIdx: dyingBirthIdx,
        deathIdx: p,
      });

      // Union by rank.
      if (uf.rank[survivor] < uf.rank[dying]) {
        uf.parent[survivor] = dying;
        uf.birthSite[dying] = uf.birthSite[survivor];
        myRoot = dying;
      } else {
        uf.parent[dying] = survivor;
        if (uf.rank[survivor] === uf.rank[dying]) uf.rank[survivor]++;
        myRoot = survivor;
      }
    }
  }

  // The remaining essential class.
  for (let i = 0; i < n; i++) {
    if (uf.parent[i] === i && uf.active[i]) {
      essentialBirthIdx = uf.birthSite[i];
      break;
    }
  }

  return { pairs, essentialBirthIdx };
}

export function computePersistence(
  values: Float32Array,
  width: number,
  height: number,
): PersistenceResult {
  const n = width * height;
  if (values.length !== n) {
    throw new Error(`values.length ${values.length} != ${width}*${height}`);
  }

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min) || !isFinite(max)) {
    min = 0;
    max = 1;
  }

  // Ascending order for sublevel H₀.
  const asc = new Int32Array(n);
  for (let i = 0; i < n; i++) asc[i] = i;
  // Stable sort with tiebreak on index for determinism.
  const ascArr = Array.from(asc).sort((a, b) => {
    const dv = values[a] - values[b];
    return dv !== 0 ? dv : a - b;
  });
  const ascSorted = Int32Array.from(ascArr);

  const sub = sweepH0(values, width, height, ascSorted);

  const h0: Pair[] = sub.pairs.map((p) => ({
    ...p,
    dim: 0,
    lifetime: p.death - p.birth,
  }));
  h0.push({
    birth: values[sub.essentialBirthIdx],
    death: max,
    lifetime: max - values[sub.essentialBirthIdx],
    birthIdx: sub.essentialBirthIdx,
    deathIdx: -1,
    dim: 0,
  });

  // Descending order for superlevel H₀ ≅ H₁ of sublevel (Alexander duality).
  const descArr = ascArr.slice().reverse();
  const descSorted = Int32Array.from(descArr);
  const sup = sweepH0(values, width, height, descSorted);

  // Re-express each (b, d) from the superlevel sweep as a sublevel H₁ pair:
  // the hole is "born" when the superlevel component first separates (at the
  // larger value = the saddle / death in the descending sweep) and "dies"
  // when the surrounding region fills in (at the smaller value = birth in
  // the descending sweep). We drop the global essential class.
  const h1: Pair[] = sup.pairs.map((p) => ({
    birth: p.death,
    death: p.birth,
    lifetime: p.birth - p.death,
    birthIdx: p.deathIdx,
    deathIdx: p.birthIdx,
    dim: 1 as const,
  }));

  // Filter out vanishing pairs.
  const eps = 1e-9;
  const h0Clean = h0.filter((p) => p.lifetime > eps);
  const h1Clean = h1.filter((p) => p.lifetime > eps);

  const pairs = [...h0Clean, ...h1Clean].sort((a, b) => b.lifetime - a.lifetime);

  return {
    pairs,
    h0: h0Clean,
    h1: h1Clean,
    min,
    max,
    width,
    height,
  };
}

/**
 * Betti numbers β₀(t), β₁(t) sampled on a uniform grid of filtration values.
 * A pair (b, d) contributes +1 to β_k on [b, d).
 */
export function bettiCurves(
  result: PersistenceResult,
  samples = 200,
): { ts: Float32Array; b0: Float32Array; b1: Float32Array } {
  const { min, max, h0, h1 } = result;
  const ts = new Float32Array(samples);
  const b0 = new Float32Array(samples);
  const b1 = new Float32Array(samples);
  const span = max - min || 1;
  for (let i = 0; i < samples; i++) {
    ts[i] = min + (i / (samples - 1)) * span;
  }
  for (const p of h0) {
    for (let i = 0; i < samples; i++) {
      if (ts[i] >= p.birth && ts[i] < p.death) b0[i]++;
    }
  }
  for (const p of h1) {
    for (let i = 0; i < samples; i++) {
      if (ts[i] >= p.birth && ts[i] < p.death) b1[i]++;
    }
  }
  return { ts, b0, b1 };
}

/**
 * Bubenik (2015) persistence landscape: the family of functions
 *
 *     λ_k(t) = k-th largest value of  Λ_(b,d)(t) = max(0, min(t-b, d-t))
 *
 * sampled on a uniform grid. Returns a stack of layers, each a Float32Array
 * of length `samples`, sorted by overall amplitude.
 */
export function persistenceLandscape(
  pairs: Pair[],
  min: number,
  max: number,
  samples = 256,
  maxLayers = 16,
): { ts: Float32Array; layers: Float32Array[] } {
  const ts = new Float32Array(samples);
  const span = max - min || 1;
  for (let i = 0; i < samples; i++) {
    ts[i] = min + (i / (samples - 1)) * span;
  }
  const layerCount = Math.min(maxLayers, pairs.length || 1);
  const layers: Float32Array[] = [];
  for (let k = 0; k < layerCount; k++) layers.push(new Float32Array(samples));

  const valuesAtT = new Float64Array(pairs.length);
  for (let i = 0; i < samples; i++) {
    const t = ts[i];
    let count = 0;
    for (let j = 0; j < pairs.length; j++) {
      const p = pairs[j];
      if (!isFinite(p.death) || !isFinite(p.birth)) continue;
      const v = Math.max(0, Math.min(t - p.birth, p.death - t));
      if (v > 0) valuesAtT[count++] = v;
    }
    // Partial sort to get the top `layerCount` values descending.
    const sliceArr = Array.from(valuesAtT.slice(0, count)).sort((a, b) => b - a);
    for (let k = 0; k < layerCount; k++) {
      layers[k][i] = k < sliceArr.length ? sliceArr[k] : 0;
    }
  }
  return { ts, layers };
}
