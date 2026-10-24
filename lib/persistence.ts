/**
 * Persistent homology of a 2D grayscale image, treated as a discrete Morse
 * function f: Ω ⊂ ℤ² → ℝ on a cubical complex.
 *
 *   H₀ of the sublevel-set filtration { f ≤ t } is computed directly via
 *   union-find with the elder rule (Edelsbrunner & Harer, 2010).
 *
 *   H₁ of the sublevel filtration is recovered through Alexander duality:
 *   on the 2-sphere compactification, H₁({f ≤ t}) ≅ H̃₀({f > t} ∪ {∞}).
 *   Concretely, we run the same union-find in the descending direction over
 *   pixels and re-interpret births/deaths in the original (ascending) frame.
 *
 *   Connectivity: sublevel sets use 4-adjacency, their complements (the
 *   superlevel sweep) use 8-adjacency. This is the complementary pair for
 *   which duality holds exactly on the pixel grid, so two pixels that touch
 *   only at a corner neither join a component nor close a loop. The region
 *   outside the image is a single virtual superlevel node touching every
 *   border pixel, so only bounded complement components count as holes.
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

/**
 * Sweep the pixel grid in the given order with union-find and the elder rule,
 * recording a (birth, death) pair whenever two components merge.
 *
 * `eight` selects 8-adjacency instead of 4-adjacency. `outside` adds a virtual
 * node (index n) for the region beyond the image: it is present from the start,
 * is older than every pixel, and touches every border pixel, so a component
 * dies as soon as it reaches the image border.
 *
 * The elder of two components is the one whose birth pixel came first in
 * `order`, so the same code is correct for ascending and descending sweeps.
 */
function sweep(
  values: Float32Array,
  w: number,
  h: number,
  order: Int32Array,
  eight: boolean,
  outside: boolean,
): { pairs: Array<Omit<Pair, "dim" | "lifetime">>; essentialBirthIdx: number } {
  const n = values.length;
  const size = outside ? n + 1 : n;
  const parent = new Int32Array(size);
  const rank = new Uint8Array(size);
  const birthSite = new Int32Array(size);
  const active = new Uint8Array(size);
  // pos[p] = position of pixel p in the sweep; the outside node is eldest.
  const pos = new Int32Array(size);
  for (let i = 0; i < size; i++) parent[i] = i;
  for (let k = 0; k < n; k++) pos[order[k]] = k;
  if (outside) {
    pos[n] = -1;
    birthSite[n] = n;
    active[n] = 1;
  }

  const find = (x: number): number => {
    let r = x;
    while (parent[r] !== r) r = parent[r];
    while (parent[x] !== r) {
      const next = parent[x];
      parent[x] = r;
      x = next;
    }
    return r;
  };

  const pairs: Array<Omit<Pair, "dim" | "lifetime">> = [];
  const nbr = new Int32Array(9);

  for (let k = 0; k < n; k++) {
    const p = order[k];
    active[p] = 1;
    birthSite[p] = p;
    const v = values[p];

    const x = p % w;
    const y = (p - x) / w;
    const l = x > 0;
    const r = x < w - 1;
    const u = y > 0;
    const d = y < h - 1;
    let m = 0;
    if (l) nbr[m++] = p - 1;
    if (r) nbr[m++] = p + 1;
    if (u) nbr[m++] = p - w;
    if (d) nbr[m++] = p + w;
    if (eight) {
      if (u && l) nbr[m++] = p - w - 1;
      if (u && r) nbr[m++] = p - w + 1;
      if (d && l) nbr[m++] = p + w - 1;
      if (d && r) nbr[m++] = p + w + 1;
    }
    if (outside && !(l && r && u && d)) nbr[m++] = n;

    let myRoot = p;
    for (let i = 0; i < m; i++) {
      const q = nbr[i];
      if (!active[q]) continue;
      const qRoot = find(q);
      if (qRoot === myRoot) continue;

      const myBirthIdx = birthSite[myRoot];
      const qBirthIdx = birthSite[qRoot];
      const myIsElder = pos[myBirthIdx] < pos[qBirthIdx];
      const survivorBirthIdx = myIsElder ? myBirthIdx : qBirthIdx;
      const dyingBirthIdx = myIsElder ? qBirthIdx : myBirthIdx;

      pairs.push({
        birth: values[dyingBirthIdx],
        death: v,
        birthIdx: dyingBirthIdx,
        deathIdx: p,
      });

      // Union by rank; the new root carries the elder's birth site.
      let root: number;
      let child: number;
      if (rank[myRoot] < rank[qRoot]) {
        root = qRoot;
        child = myRoot;
      } else {
        root = myRoot;
        child = qRoot;
        if (rank[myRoot] === rank[qRoot]) rank[myRoot]++;
      }
      parent[child] = root;
      birthSite[root] = survivorBirthIdx;
      myRoot = root;
    }
  }

  // Without the outside node exactly one class never dies: the one born first.
  return { pairs, essentialBirthIdx: order[0] };
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

  // H₀: 4-connected sublevel sets.
  const sub = sweep(values, width, height, ascSorted, false, false);

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

  // H₁ by Alexander duality. The holes of the 4-connected sublevel set
  // {f ≤ t} are the bounded 8-connected components of its complement {f > t}
  // (4- and 8-adjacency are the dual pair on the pixel grid). Sweeping in
  // descending order with 8-adjacency, and with a virtual node for the
  // unbounded region outside the image, gives one pair per bounded
  // superlevel component: it appears at its maximum b and dies at the value
  // d where it merges with an older component or reaches the border. In the
  // sublevel frame that is a hole alive on [d, b). The outside node itself
  // never dies and is not a hole.
  const descSorted = ascSorted.slice().reverse();
  const sup = sweep(values, width, height, descSorted, true, true);

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
 * A pair (b, d) contributes +1 to β_k on [b, d). The essential H₀ class
 * (deathIdx = -1) is plotted with death = max but never dies.
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
    const essential = p.deathIdx === -1;
    for (let i = 0; i < samples; i++) {
      if (ts[i] >= p.birth && (essential || ts[i] < p.death)) b0[i]++;
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
