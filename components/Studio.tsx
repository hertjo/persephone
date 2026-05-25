"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { SampleKey } from "@/lib/image";
import { loadImageToField, resolveSample, sampleRings, type ImageField } from "@/lib/image";
import {
  bettiCurves,
  computePersistence,
  persistenceLandscape,
  type PersistenceResult,
} from "@/lib/persistence";
import Filtration from "./Filtration";
import PersistenceDiagram from "./PersistenceDiagram";
import Barcode from "./Barcode";
import BettiCurve from "./BettiCurve";
import Controls from "./Controls";

// Three.js needs to be client-only.
const PersistenceLandscape3D = dynamic(() => import("./PersistenceLandscape3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full grid place-items-center text-white/40 text-sm">
      conjuring landscape…
    </div>
  ),
});

export default function Studio() {
  const [sample, setSample] = useState<SampleKey>("hubble");
  // Seed with a cheap procedural field so the first frame has something to
  // render while the Hubble JPEG decodes.
  const [field, setField] = useState<ImageField>(() => sampleRings());
  const [t, setT] = useState(0.5);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.25);

  // Resolve the field when the chosen sample changes. Procedural samples
  // resolve synchronously; the Hubble asset and any future remote field load
  // asynchronously through resolveSample().
  useEffect(() => {
    let cancelled = false;
    resolveSample(sample)
      .then((f) => {
        if (!cancelled) setField(f);
      })
      .catch((e) => console.error("sample load failed", e));
    return () => {
      cancelled = true;
    };
  }, [sample]);

  // Persistent homology — recomputed when the field changes.
  const persistence: PersistenceResult = useMemo(
    () => computePersistence(field.values, field.width, field.height),
    [field],
  );

  const betti = useMemo(() => bettiCurves(persistence, 240), [persistence]);
  const landscape = useMemo(
    () => persistenceLandscape(persistence.pairs, persistence.min, persistence.max, 200, 14),
    [persistence],
  );

  // Animated sweep.
  const lastTs = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) {
      lastTs.current = null;
      return;
    }
    let raf = 0;
    const tick = (ms: number) => {
      const span = persistence.max - persistence.min || 1;
      if (lastTs.current != null) {
        const dt = (ms - lastTs.current) / 1000;
        setT((prev) => {
          let next = prev + dt * speed * span;
          if (next > persistence.max) next = persistence.min;
          return next;
        });
      }
      lastTs.current = ms;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, persistence.min, persistence.max]);

  // Snap t back into [min, max] when the field changes.
  useEffect(() => {
    setT(persistence.min + (persistence.max - persistence.min) * 0.5);
    lastTs.current = null;
  }, [persistence.min, persistence.max]);

  const handleUpload = async (file: File) => {
    try {
      const fld = await loadImageToField(file);
      setField(fld);
    } catch (e) {
      console.error(e);
    }
  };

  const tNorm = useMemo(() => {
    const span = persistence.max - persistence.min || 1;
    return (t - persistence.min) / span;
  }, [t, persistence.min, persistence.max]);

  return (
    <div className="min-h-screen w-full p-6 grid grid-cols-12 gap-4">
      {/* Left rail */}
      <aside className="col-span-12 lg:col-span-3 space-y-4">
        <Panel title="persephone" subtitle="persistent homology engine">
          <div className="text-xs text-white/55 leading-relaxed">
            Treats the image as a discrete Morse function and watches its
            topology evolve under the sublevel-set filtration
            <span className="font-mono text-white/80"> {`{f ≤ t}`}</span>.
            <span className="text-cyan-300"> Cyan</span> dots are H₀ features
            (connected components),
            <span className="text-fuchsia-300"> magenta</span> dots are H₁
            features (loops, via Alexander duality).
          </div>
        </Panel>
        <Panel>
          <Controls
            sample={sample}
            onSample={setSample}
            onUpload={handleUpload}
            t={t}
            onT={setT}
            min={persistence.min}
            max={persistence.max}
            playing={playing}
            onTogglePlay={() => setPlaying((p) => !p)}
            speed={speed}
            onSpeed={setSpeed}
          />
        </Panel>
        <Panel title="invariants" subtitle="snapshot at current t">
          <Stats persistence={persistence} t={t} field={field} />
        </Panel>
      </aside>

      {/* Center: filtration sweep + Betti curves + barcode */}
      <main className="col-span-12 lg:col-span-6 space-y-4 flex flex-col">
        <Panel
          className="aspect-square lg:aspect-[5/4]"
          title={`sublevel set  {f ≤ ${t.toFixed(3)}}`}
          subtitle={field.label}
        >
          <Filtration values={field.values} width={field.width} height={field.height} t={tNorm} />
        </Panel>
        <Panel title="topology over time">
          <BettiCurve
            ts={betti.ts}
            b0={betti.b0}
            b1={betti.b1}
            min={persistence.min}
            max={persistence.max}
            cursor={t}
          />
        </Panel>
        <Panel className="h-72">
          <Barcode
            h0={persistence.h0}
            h1={persistence.h1}
            min={persistence.min}
            max={persistence.max}
            cursor={t}
          />
        </Panel>
      </main>

      {/* Right rail: persistence diagram + 3D landscape */}
      <aside className="col-span-12 lg:col-span-3 space-y-4">
        <Panel className="h-[380px]">
          <PersistenceDiagram
            h0={persistence.h0}
            h1={persistence.h1}
            min={persistence.min}
            max={persistence.max}
            cursor={t}
          />
        </Panel>
        <Panel className="h-[440px]" title="persistence landscape" subtitle="Bubenik 2015 · λₖ(t)">
          <PersistenceLandscape3D
            layers={landscape.layers}
            ts={landscape.ts}
            cursor={t}
            min={persistence.min}
            max={persistence.max}
          />
        </Panel>
      </aside>
    </div>
  );
}

function Panel({
  children,
  title,
  subtitle,
  className = "",
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <section
      className={`relative flex flex-col rounded-2xl border border-white/10 bg-[#0a0c1a]/70 backdrop-blur p-4 overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background:
            "radial-gradient(ellipse at top left, rgba(86,224,255,0.07), transparent 60%), radial-gradient(ellipse at bottom right, rgba(255,93,210,0.06), transparent 60%)",
        }}
      />
      {(title || subtitle) && (
        <header className="relative mb-2 flex items-baseline justify-between shrink-0">
          {title && (
            <h2 className="text-sm font-medium tracking-wide text-white/85">
              {title}
            </h2>
          )}
          {subtitle && (
            <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
              {subtitle}
            </span>
          )}
        </header>
      )}
      <div className="relative flex-1 min-h-0 min-w-0">{children}</div>
    </section>
  );
}

function Stats({
  persistence,
  t,
  field,
}: {
  persistence: PersistenceResult;
  t: number;
  field: ImageField;
}) {
  const aliveH0 = persistence.h0.filter((p) => p.birth <= t && t < p.death).length;
  const aliveH1 = persistence.h1.filter((p) => p.birth <= t && t < p.death).length;
  const euler = aliveH0 - aliveH1;
  return (
    <dl className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs font-mono">
      <Stat label="β₀ (now)" value={aliveH0} accent="cyan" />
      <Stat label="β₁ (now)" value={aliveH1} accent="magenta" />
      <Stat label="χ = β₀ − β₁" value={euler} />
      <Stat label="|dgm|" value={persistence.pairs.length} />
      <Stat label="grid" value={`${field.width}×${field.height}`} />
      <Stat label="range" value={`${persistence.min.toFixed(2)}…${persistence.max.toFixed(2)}`} />
    </dl>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "cyan" | "magenta";
}) {
  const color =
    accent === "cyan" ? "text-cyan-300" : accent === "magenta" ? "text-fuchsia-300" : "text-white/85";
  return (
    <>
      <dt className="text-white/40">{label}</dt>
      <dd className={`text-right ${color}`}>{value}</dd>
    </>
  );
}
