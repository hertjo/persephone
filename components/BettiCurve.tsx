"use client";

import { useMemo } from "react";
import { ACCENT_H0, ACCENT_H1 } from "@/lib/colormap";

type Props = {
  ts: Float32Array;
  b0: Float32Array;
  b1: Float32Array;
  min: number;
  max: number;
  cursor: number;
};

const W = 520;
const H = 96;
const PAD = 8;

function pathFor(values: Float32Array, ts: Float32Array, peak: number, min: number, max: number) {
  if (values.length === 0) return "";
  const span = max - min || 1;
  const x = (v: number) => PAD + ((v - min) / span) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / peak) * (H - PAD * 2);
  let d = `M ${x(ts[0])} ${y(values[0])}`;
  for (let i = 1; i < values.length; i++) {
    d += ` L ${x(ts[i])} ${y(values[i])}`;
  }
  return d;
}

function fillFor(values: Float32Array, ts: Float32Array, peak: number, min: number, max: number) {
  const span = max - min || 1;
  const x = (v: number) => PAD + ((v - min) / span) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / peak) * (H - PAD * 2);
  if (values.length === 0) return "";
  let d = `M ${x(ts[0])} ${H - PAD}`;
  for (let i = 0; i < values.length; i++) d += ` L ${x(ts[i])} ${y(values[i])}`;
  d += ` L ${x(ts[ts.length - 1])} ${H - PAD} Z`;
  return d;
}

export default function BettiCurve({ ts, b0, b1, min, max, cursor }: Props) {
  const peak = useMemo(() => {
    let m = 1;
    for (let i = 0; i < b0.length; i++) m = Math.max(m, b0[i], b1[i]);
    return m;
  }, [b0, b1]);

  const span = max - min || 1;
  const cursorX = PAD + ((cursor - min) / span) * (W - PAD * 2);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-1 shrink-0">
        <span className="text-[10px] uppercase tracking-[0.24em] text-white/35">
          β₀(t)  ·  β₁(t)
        </span>
        <span className="font-mono text-[10px] tabular-nums text-white/35">
          peak {peak.toFixed(0)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full flex-1 min-h-0 block"
        role="img"
        aria-label="betti curves"
      >
        <defs>
          <linearGradient id="b0-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT_H0} stopOpacity="0.45" />
            <stop offset="100%" stopColor={ACCENT_H0} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="b1-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT_H1} stopOpacity="0.4" />
            <stop offset="100%" stopColor={ACCENT_H1} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillFor(b0, ts, peak, min, max)} fill="url(#b0-fill)" />
        <path d={fillFor(b1, ts, peak, min, max)} fill="url(#b1-fill)" />
        <path d={pathFor(b0, ts, peak, min, max)} stroke={ACCENT_H0} strokeWidth="1.5" fill="none" />
        <path d={pathFor(b1, ts, peak, min, max)} stroke={ACCENT_H1} strokeWidth="1.5" fill="none" />
        <line x1={cursorX} y1={0} x2={cursorX} y2={H} stroke="rgba(255,255,255,0.35)" strokeDasharray="2 3" />
      </svg>
    </div>
  );
}
