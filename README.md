# persephone

> Persistent Homology Engine for Spatial Vision

A real-time topological data analysis playground for computer vision. Treats
any grayscale image as a discrete Morse function `f: Ω ⊂ ℤ² → ℝ` and
visualizes the persistent homology of its sublevel-set filtration `{f ≤ t}` as
`t` sweeps from min to max.

## what you see

- **Filtration canvas** — the image with an animated level-set tide rising
  through it. A custom GLSL fragment shader draws the "tide front" with a
  gradient-magnitude-aware band thickness, so the boundary glows.
- **Persistence diagram** — birth/death pairs above the diagonal.
  <span style="color:#56e0ff">●</span> H₀ (components),
  <span style="color:#ff5dd2">●</span> H₁ (loops).
- **Persistence barcode** — one bar per topological feature, sorted by birth.
- **Betti curves** — `β₀(t), β₁(t)` flowing as the filtration parameter moves.
- **3D persistence landscape** — Bubenik's `λₖ(t)` rendered as a glowing
  wireframe terrain with additive bloom (the "wow" centerpiece).

## the math

Persistent homology over a cubical complex, computed via:

- **H₀ (sublevel)** — union–find with the elder rule.
- **H₁ (sublevel)** — recovered through Alexander duality on `S²`: on the
  one-point compactification, `H₁({f ≤ t}) ≅ H̃₀({f > t})`. We re-run the
  same union–find in descending order and re-interpret births/deaths.

References: Edelsbrunner & Harer, *Computational Topology* (2010); Carlsson,
*Topology and Data* (2009); Bubenik, *Statistical Topological Data Analysis
using Persistence Landscapes* (2015).

## stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Three.js (`@react-three/fiber`)
with bloom post-processing · WebGL fragment shader for the filtration sweep.

## run it

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Click a sample field (Blobs / Annuli / Terrain / Figure-8) or upload your own
image, then hit ▶ to watch the topology breathe.
