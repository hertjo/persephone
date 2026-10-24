import { test } from "node:test";
import assert from "node:assert/strict";
import { bettiCurves, computePersistence, type Pair } from "../lib/persistence.ts";
import { betti, diagram, type RefPair } from "./reference.mts";

/** Deterministic PRNG so failures are reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function grid(rows: string[]): { values: Float32Array; w: number; h: number } {
  const h = rows.length;
  const w = rows[0].length;
  const values = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) values[y * w + x] = Number(rows[y][x]);
  return { values, w, h };
}

const key = (p: RefPair) => `${p.birth}:${p.death}`;
const sorted = (ps: RefPair[]) => ps.map(key).sort();
const asRef = (ps: Pair[]): RefPair[] =>
  ps.map((p) => ({ birth: p.birth, death: p.deathIdx === -1 ? Infinity : p.death }));

/** Betti numbers read off the engine's pairs: a pair (b, d) is alive on [b, d). */
function engineBetti(h0: RefPair[], h1: RefPair[], t: number): [number, number] {
  const alive = (ps: RefPair[]) => ps.filter((p) => p.birth <= t && t < p.death).length;
  return [alive(h0), alive(h1)];
}

function check(values: Float32Array, w: number, h: number, label: string) {
  const res = computePersistence(values, w, h);
  const h0 = asRef(res.h0);
  const h1 = asRef(res.h1);
  const ref0 = diagram(values, w, h, 0);
  const ref1 = diagram(values, w, h, 1);

  for (const t of new Set(values)) {
    assert.deepEqual(engineBetti(h0, h1, t), betti(values, w, h, t), `${label}: Betti numbers at t=${t}`);
  }
  assert.deepEqual(sorted(h0), sorted(ref0), `${label}: H0 diagram`);
  assert.deepEqual(sorted(h1), sorted(ref1), `${label}: H1 diagram`);

  // The sampled Betti curves the UI draws must agree with the reference too.
  const curves = bettiCurves(res, 64);
  for (let i = 0; i < curves.ts.length; i++) {
    const t = curves.ts[i];
    const [b0, b1] = betti(values, w, h, t);
    assert.equal(curves.b0[i], b0, `${label}: sampled beta0 at t=${t}`);
    assert.equal(curves.b1[i], b1, `${label}: sampled beta1 at t=${t}`);
  }
}

test("ring of low pixels encloses one hole", () => {
  const { values, w, h } = grid(["11111", "10001", "10201", "10001", "11111"]);
  check(values, w, h, "ring");
});

test("diagonal ring does not enclose a hole (4-connected sublevel, 8-connected complement)", () => {
  // At t = 0 the four 0-pixels touch only diagonally: four components, and the
  // centre leaks out through the diagonal gaps, so there is no hole.
  const { values, w, h } = grid(["11111", "11011", "10101", "11011", "11111"]);
  check(values, w, h, "diagonal ring");
  const { h1 } = computePersistence(values, w, h);
  assert.equal(h1.length, 0);
});

test("2x2 checkerboard", () => {
  const { values, w, h } = grid(["2222", "2012", "2102", "2222"]);
  check(values, w, h, "checkerboard");
});

test("diagonal gap closed later: the hole is born when the ring becomes 4-connected", () => {
  const { values, w, h } = grid(["33333", "30103", "31313", "30003", "33333"]);
  check(values, w, h, "late closure");
});

test("bright pixels touching the image border are not holes", () => {
  const { values, w, h } = grid(["200", "000", "001"]);
  check(values, w, h, "border peaks");
  assert.equal(computePersistence(values, w, h).h1.length, 0);
});

test("elder rule in the superlevel sweep: two interior peaks joined by a saddle", () => {
  const { values, w, h } = grid(["0000000", "0092300", "0000000", "0000000"]);
  check(values, w, h, "two peaks");
});

test("random small integer images (many ties)", () => {
  const rnd = mulberry32(1);
  for (let iter = 0; iter < 300; iter++) {
    const w = 6 + Math.floor(rnd() * 5);
    const h = 6 + Math.floor(rnd() * 5);
    const levels = 2 + Math.floor(rnd() * 4);
    const values = new Float32Array(w * h);
    for (let i = 0; i < values.length; i++) values[i] = Math.floor(rnd() * levels);
    check(values, w, h, `random int #${iter} (${w}x${h}, ${levels} levels)`);
  }
});

test("random small images with distinct values", () => {
  const rnd = mulberry32(2);
  for (let iter = 0; iter < 150; iter++) {
    const w = 6 + Math.floor(rnd() * 5);
    const h = 6 + Math.floor(rnd() * 5);
    const values = new Float32Array(w * h);
    for (let i = 0; i < values.length; i++) values[i] = Math.fround(rnd());
    check(values, w, h, `random real #${iter} (${w}x${h})`);
  }
});
