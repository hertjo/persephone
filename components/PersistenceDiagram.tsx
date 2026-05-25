"use client";

import { useMemo } from "react";
import type { Pair } from "@/lib/persistence";
import { ACCENT_H0, ACCENT_H0_GLOW, ACCENT_H1, ACCENT_H1_GLOW } from "@/lib/colormap";

type Props = {
  h0: Pair[];
  h1: Pair[];
  min: number;
  max: number;
  /** Current filtration cursor, in raw value units. */
  cursor: number;
};

const PAD = 36;
const SIZE = 320;

export default function PersistenceDiagram({ h0, h1, min, max, cursor }: Props) {
  const points = useMemo(() => {
    const span = max - min || 1;
    const project = (v: number) => PAD + ((v - min) / span) * (SIZE - PAD * 2);
    const projY = (v: number) => SIZE - PAD - ((v - min) / span) * (SIZE - PAD * 2);
    return {
      h0: h0.map((p) => ({
        x: project(p.birth),
        y: projY(Math.min(p.death, max)),
        life: p.lifetime,
        pair: p,
      })),
      h1: h1.map((p) => ({
        x: project(p.birth),
        y: projY(p.death),
        life: p.lifetime,
        pair: p,
      })),
      project,
      projY,
      span,
    };
  }, [h0, h1, min, max]);

  const cursorX = points.project(cursor);
  const cursorY = points.projY(cursor);

  // Persistence cells "alive" right now (birth ≤ cursor < death).
  const aliveH0 = h0.filter((p) => p.birth <= cursor && cursor < p.death).length;
  const aliveH1 = h1.filter((p) => p.birth <= cursor && cursor < p.death).length;

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <span className="text-[13px] font-medium tracking-tight text-white/90">
          persistence diagram
        </span>
        <span className="font-mono text-[11px] tabular-nums">
          <span style={{ color: ACCENT_H0 }}>β₀={aliveH0}</span>
          <span className="px-1.5 text-white/20">·</span>
          <span style={{ color: ACCENT_H1 }}>β₁={aliveH1}</span>
        </span>
      </div>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full flex-1 mt-1 min-h-0"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="persistence diagram"
      >
        <defs>
          <radialGradient id="h0-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACCENT_H0} stopOpacity="0.9" />
            <stop offset="60%" stopColor={ACCENT_H0_GLOW} stopOpacity="0.4" />
            <stop offset="100%" stopColor={ACCENT_H0} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="h1-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACCENT_H1} stopOpacity="0.9" />
            <stop offset="60%" stopColor={ACCENT_H1_GLOW} stopOpacity="0.4" />
            <stop offset="100%" stopColor={ACCENT_H1} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="diag-line" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>

        {/* Axes + diagonal */}
        <line x1={PAD} y1={SIZE - PAD} x2={SIZE - PAD} y2={SIZE - PAD} stroke="rgba(255,255,255,0.15)" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={SIZE - PAD} stroke="rgba(255,255,255,0.15)" />
        <line
          x1={PAD}
          y1={SIZE - PAD}
          x2={SIZE - PAD}
          y2={PAD}
          stroke="url(#diag-line)"
          strokeDasharray="4 4"
        />

        {/* Cursor crosshairs */}
        <line
          x1={cursorX}
          y1={PAD}
          x2={cursorX}
          y2={SIZE - PAD}
          stroke="rgba(255,255,255,0.18)"
        />
        <line
          x1={PAD}
          y1={cursorY}
          x2={SIZE - PAD}
          y2={cursorY}
          stroke="rgba(255,255,255,0.18)"
        />

        {/* H₁ glow halos */}
        {points.h1.map((p, i) => (
          <circle
            key={`h1g-${i}`}
            cx={p.x}
            cy={p.y}
            r={4 + Math.sqrt(p.life) * 22}
            fill="url(#h1-glow)"
          />
        ))}
        {/* H₀ glow halos */}
        {points.h0.map((p, i) => (
          <circle
            key={`h0g-${i}`}
            cx={p.x}
            cy={p.y}
            r={4 + Math.sqrt(p.life) * 22}
            fill="url(#h0-glow)"
          />
        ))}

        {/* Cores */}
        {points.h0.map((p, i) => {
          const alive = p.pair.birth <= cursor && cursor < p.pair.death;
          return (
            <circle
              key={`h0-${i}`}
              cx={p.x}
              cy={p.y}
              r={alive ? 4 : 2.2}
              fill={ACCENT_H0}
              opacity={alive ? 1 : 0.7}
            />
          );
        })}
        {points.h1.map((p, i) => {
          const alive = p.pair.birth <= cursor && cursor < p.pair.death;
          return (
            <circle
              key={`h1-${i}`}
              cx={p.x}
              cy={p.y}
              r={alive ? 4 : 2.2}
              fill={ACCENT_H1}
              opacity={alive ? 1 : 0.7}
            />
          );
        })}

        {/* Axis labels */}
        <text x={SIZE / 2} y={SIZE - 8} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={11}>
          birth
        </text>
        <text
          x={12}
          y={SIZE / 2}
          textAnchor="middle"
          transform={`rotate(-90, 12, ${SIZE / 2})`}
          fill="rgba(255,255,255,0.45)"
          fontSize={11}
        >
          death
        </text>
      </svg>
    </div>
  );
}
