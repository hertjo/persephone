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

const PersistenceLandscape3D = dynamic(() => import("./PersistenceLandscape3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full grid place-items-center text-white/30 text-xs tracking-wider uppercase">
      conjuring landscape…
    </div>
  ),
});

export default function Studio() {
  const [sample, setSample] = useState<SampleKey>("hubble");
  const [field, setField] = useState<ImageField>(() => sampleRings());
  const [t, setT] = useState(0.5);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.25);

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

  const persistence: PersistenceResult = useMemo(
    () => computePersistence(field.values, field.width, field.height),
    [field],
  );

  const betti = useMemo(() => bettiCurves(persistence, 240), [persistence]);
  const landscape = useMemo(
    () => persistenceLandscape(persistence.pairs, persistence.min, persistence.max, 200, 14),
    [persistence],
  );

  // Recentre t when a new field changes the filtration range (state adjusted
  // during render, as React recommends instead of a setState effect).
  const [range, setRange] = useState<{ min: number; max: number } | null>(null);
  if (range === null || range.min !== persistence.min || range.max !== persistence.max) {
    setRange({ min: persistence.min, max: persistence.max });
    setT(persistence.min + (persistence.max - persistence.min) * 0.5);
  }

  const lastTs = useRef<number | null>(null);
  useEffect(() => {
    // Restart the clock whenever playback or the range changes.
    lastTs.current = null;
    if (!playing) return;
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

  const aliveH0 = persistence.h0.filter((p) => p.birth <= t && t < p.death).length;
  const aliveH1 = persistence.h1.filter((p) => p.birth <= t && t < p.death).length;

  return (
    <div className="w-full px-8 pb-4 grid grid-cols-12 gap-4">
      {/* Left rail */}
      <aside className="col-span-12 lg:col-span-3 flex flex-col gap-4">
        <Panel className="h-[112px] justify-center">
          <Legend />
        </Panel>
        <Panel className="flex-1">
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
        <Panel className="h-[176px]" title="reference">
          <Reference />
        </Panel>
      </aside>

      {/* Center */}
      <main className="col-span-12 lg:col-span-6 flex flex-col gap-4">
        <Panel
          className="aspect-[5/4]"
          title={
            <span className="flex items-baseline gap-2">
              <span>sublevel set</span>
              <span className="font-mono text-white/45 text-[12px]">
                {`{ f ≤ ${t.toFixed(3)} }`}
              </span>
            </span>
          }
          subtitle={field.label}
        >
          <Filtration values={field.values} width={field.width} height={field.height} t={tNorm} />
        </Panel>
        <Panel className="h-[136px]" title="topology over time">
          <BettiCurve
            ts={betti.ts}
            b0={betti.b0}
            b1={betti.b1}
            min={persistence.min}
            max={persistence.max}
            cursor={t}
          />
        </Panel>
        <Panel className="h-[244px]">
          <Barcode
            h0={persistence.h0}
            h1={persistence.h1}
            min={persistence.min}
            max={persistence.max}
            cursor={t}
          />
        </Panel>
      </main>

      {/* Right rail */}
      <aside className="col-span-12 lg:col-span-3 flex flex-col gap-4">
        <Panel className="h-[112px]">
          <Invariants
            aliveH0={aliveH0}
            aliveH1={aliveH1}
            pairs={persistence.pairs.length}
            field={field}
          />
        </Panel>
        <Panel className="aspect-[5/4]">
          <PersistenceDiagram
            h0={persistence.h0}
            h1={persistence.h1}
            min={persistence.min}
            max={persistence.max}
            cursor={t}
          />
        </Panel>
        <Panel className="flex-1 min-h-[260px]" title="persistence landscape" subtitle="λₖ(t) · bubenik 2015">
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
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative flex flex-col rounded-2xl border border-white/[0.08] bg-[#0a0c1a]/65 backdrop-blur-md p-4 overflow-hidden ${className}`}
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 0 rgba(0,0,0,0.4), 0 20px 50px -20px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at top left, rgba(86,224,255,0.05), transparent 70%)," +
            "radial-gradient(ellipse 80% 60% at bottom right, rgba(255,93,210,0.04), transparent 70%)",
        }}
      />
      {(title || subtitle) && (
        <header className="relative mb-2.5 flex items-baseline justify-between shrink-0">
          {title && (
            <h2 className="text-[13px] font-medium tracking-tight text-white/90">
              {title}
            </h2>
          )}
          {subtitle && (
            <span className="text-[10px] uppercase tracking-[0.24em] text-white/35">
              {subtitle}
            </span>
          )}
        </header>
      )}
      <div className="relative flex-1 min-h-0 min-w-0">{children}</div>
    </section>
  );
}

function Invariants({
  aliveH0,
  aliveH1,
  pairs,
  field,
}: {
  aliveH0: number;
  aliveH1: number;
  pairs: number;
  field: ImageField;
}) {
  const euler = aliveH0 - aliveH1;
  return (
    <div className="grid grid-cols-3 gap-3 h-full">
      <Metric label="β₀" value={aliveH0} accent="cyan" />
      <Metric label="β₁" value={aliveH1} accent="magenta" />
      <Metric label="χ" value={euler} hint="β₀ − β₁" />
      <Metric label="pairs" value={pairs} small />
      <Metric label="grid" value={`${field.width}×${field.height}`} small />
      <Metric label="field" value={field.label} small truncate />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-col gap-2.5">
      <LegendRow color="#56e0ff" symbol="H₀" text="connected components" />
      <LegendRow color="#ff5dd2" symbol="H₁" text="loops · Alexander dual" />
      <div className="text-[10.5px] text-white/45 leading-relaxed pt-0.5">
        Treats the image as a Morse function and tracks its topology under
        the sublevel set{" "}
        <span className="font-mono text-white/75">{`{f ≤ t}`}</span>.
      </div>
    </div>
  );
}

function LegendRow({ color, symbol, text }: { color: string; symbol: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
      />
      <span className="font-mono text-[12px]" style={{ color }}>
        {symbol}
      </span>
      <span className="text-[11px] text-white/55">{text}</span>
    </div>
  );
}

function Reference() {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[11px] h-full content-start">
      <RefRow term="{f ≤ t}" def="sublevel set" />
      <RefRow term="β₀, β₁" def="betti numbers (dim Hₖ)" />
      <RefRow term="χ" def="β₀ − β₁ (euler char.)" />
      <RefRow term="λₖ(t)" def="persistence landscape" />
      <RefRow term="(b, d)" def="birth-death pair" />
      <RefRow term="b ↗ d" def="lifetime  d − b" />
    </dl>
  );
}

function RefRow({ term, def }: { term: string; def: string }) {
  return (
    <>
      <dt className="font-mono text-white/80 tabular-nums">{term}</dt>
      <dd className="text-white/45 truncate">{def}</dd>
    </>
  );
}

function Metric({
  label,
  value,
  accent,
  hint,
  small,
  truncate,
}: {
  label: string;
  value: number | string;
  accent?: "cyan" | "magenta";
  hint?: string;
  small?: boolean;
  truncate?: boolean;
}) {
  const color =
    accent === "cyan"
      ? "text-cyan-300"
      : accent === "magenta"
      ? "text-fuchsia-300"
      : "text-white/90";
  return (
    <div className="flex flex-col justify-center min-w-0">
      <div className="text-[9.5px] tracking-[0.24em] uppercase text-white/35 flex items-baseline gap-1.5">
        <span>{label}</span>
        {hint && (
          <span className="text-white/25 normal-case tracking-normal font-mono text-[9px]">
            {hint}
          </span>
        )}
      </div>
      <div
        className={[
          small ? "text-[13px]" : "text-[20px]",
          "font-mono tabular-nums leading-tight mt-0.5",
          truncate ? "truncate" : "",
          color,
        ].join(" ")}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}
