# Persephone

Persephone computes the persistent homology of an image in the browser and shows it while it changes. A grayscale image is
read as a function on the pixel grid, `f: Ω ⊂ ℤ² → ℝ`. A threshold `t` sweeps from `min f` to `max f`. At each value of
`t` the studio draws the sublevel set `{f ≤ t}` and the connected components and holes it has at that point. It also
shows when each of them appears and disappears.

![Persephone studio with the Poincaré sample](./public/demo.gif)

## Features

- **Filtration canvas.** The sublevel set `X_t = {f ≤ t}`, rendered by a WebGL fragment shader. A glow along the level
  set `{f = t}` widens where the gradient is small.
- **Persistence diagram and barcode.** Every pair `(b, d)` of `H₀` (components) and `H₁` (holes), as points above the
  diagonal and as bars `[b, d]`.
- **Betti curves.** `β₀(t)` and `β₁(t)` over the whole filtration range.
- **Persistence landscape.** A 3D view of the Bubenik landscape `λ_k(t)` for `k = 1, …, 14`, drawn with Three.js and
  additive bloom.
- **Live invariants.** `β₀`, `β₁`, the Euler characteristic `χ = β₀ − β₁`, the number of pairs and the grid size at the
  current threshold.
- **Sweep controls.** Scrub `t` by hand, or play the sweep at an adjustable speed.
- **Samples and upload.** Two photographs and four procedural fields are built in, and you can upload any image. Images
  are scaled down so that the longer side is at most 240 pixels.

All computation runs on the client in TypeScript. No server is needed.

## Running it

Requires Node.js 20 or later.

```bash
npm install
npm run dev        # http://localhost:3000
```

For a production build:

```bash
npm run build
npm start
```

## The algorithm

1. **Sublevel filtration.** The pixels are sorted by value (ties broken by index). Adding them in this order builds the
   filtration `X_t = {f ≤ t}` on the 4-connected pixel grid.
2. **`H₀` by union-find with the elder rule.** Each new pixel either starts a component or joins the components of its
   neighbours that are already present. When two components meet, the younger one (the one with the higher minimum)
   dies at the current value. This gives a pair `(birth, death)`, and the global minimum is the one class that never
   dies.
3. **`H₁` by Alexander duality.** On the sphere `S² = ℝ² ∪ {∞}`, the holes of `{f ≤ t}` correspond to the bounded
   components of `{f > t}`. The same union-find sweep therefore runs again in descending order over the superlevel sets,
   and each pair it produces is read back as a hole of the sublevel filtration with birth and death swapped.
4. **Summaries.** The Betti curves and the persistence landscape are evaluated from the pairs on a uniform grid of
   threshold values.

After the initial `O(N log N)` sort, both sweeps run in `O(N α(N))` time, where `N` is the number of pixels and `α` is the
inverse Ackermann function (union-find with path compression and union by rank).

The [mathematical companion](./public/persephone-math.pdf) (14 pages) states the construction and gives full proofs. Its
LaTeX source is [`latex/persephone-math.tex`](./latex/persephone-math.tex).

## Samples

- Hubble eXtreme Deep Field (default). NASA/ESA/STScI, public domain.
- Henri Poincaré portrait from *Popular Science Monthly*, Vol. 82. Public domain, via Wikimedia Commons.
- Procedural fields:
  - Gaussian blobs, which give many `H₀` classes.
  - Concentric annuli, which give many `H₁` classes.
  - A Morse terrain.
  - A figure-eight with two `H₁` loops.

## Project layout

```
app/                    Next.js entry point (layout, page, global styles)
components/
  Studio.tsx            state, sweep loop and panel layout
  Controls.tsx          sample picker, upload, threshold slider, play and speed
  Filtration.tsx        WebGL sublevel-set canvas
  PersistenceDiagram.tsx, Barcode.tsx, BettiCurve.tsx
  PersistenceLandscape3D.tsx
lib/
  persistence.ts        union-find sweeps, H₀ and H₁ pairs, Betti curves, landscapes
  image.ts              image loading, downscaling and procedural samples
  colormap.ts           colour maps and accents
latex/                  source of the mathematical companion
public/                 demo GIF, sample images, companion PDF
```

Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, Three.js, `@react-three/fiber` and
`@react-three/postprocessing`.

### Rebuilding the companion PDF

```bash
tectonic latex/persephone-math.tex --outdir public
```

## References

- H. Edelsbrunner and J. Harer. *Computational Topology: An Introduction*. AMS, 2010.
- A. Zomorodian and G. Carlsson. Computing persistent homology. *Discrete Comput. Geom.* 33 (2005), 249–274.
- D. Cohen-Steiner, H. Edelsbrunner and J. Harer. Stability of persistence diagrams. *Discrete Comput. Geom.* 37 (2007),
  103–120.
- G. Carlsson. Topology and data. *Bull. Amer. Math. Soc.* 46 (2009), 255–308.
- P. Bubenik. Statistical topological data analysis using persistence landscapes. *J. Mach. Learn. Res.* 16 (2015),
  77–102.

## License

MIT, see [LICENSE](./LICENSE). The sample images are in the public domain.
