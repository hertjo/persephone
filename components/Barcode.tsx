"use client";

import { useMemo } from "react";
import type { Pair } from "@/lib/persistence";
import { ACCENT_H0, ACCENT_H1 } from "@/lib/colormap";

type Props = {
  h0: Pair[];
  h1: Pair[];
  min: number;
  max: number;
  cursor: number;
};

const ROW_H = 6;
const ROW_GAP = 2;
const PAD_L = 8;
const PAD_R = 8;
const W = 480;

export default function Barcode({ h0, h1, min, max, cursor }: Props) {
  const sorted = useMemo(() => {
    const byBirth = (a: Pair, b: Pair) => a.birth - b.birth;
    return [
      ...h0.slice().sort(byBirth).map((p) => ({ p, color: ACCENT_H0 })),
      ...h1.slice().sort(byBirth).map((p) => ({ p, color: ACCENT_H1 })),
    ].slice(0, 80);
  }, [h0, h1]);

  const span = max - min || 1;
  const project = (v: number) => PAD_L + ((v - min) / span) * (W - PAD_L - PAD_R);
  const H = sorted.length * (ROW_H + ROW_GAP) + 24;
  const cursorX = project(cursor);

  return (
    <div className="w-full h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40 mb-2">
        <span>persistence barcode</span>
        <span className="text-white/40 font-mono">
          {sorted.length} features
        </span>
      </div>
      <div className="relative flex-1 overflow-y-auto pr-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="persistence barcode">
          {/* Cursor line */}
          <line
            x1={cursorX}
            y1={0}
            x2={cursorX}
            y2={H}
            stroke="rgba(255,255,255,0.3)"
            strokeDasharray="2 3"
          />
          {sorted.map(({ p, color }, i) => {
            const y = i * (ROW_H + ROW_GAP) + 6;
            const x1 = project(p.birth);
            const x2 = project(Math.min(p.death, max));
            const alive = p.birth <= cursor && cursor < p.death;
            return (
              <g key={i}>
                <rect
                  x={x1}
                  y={y}
                  width={Math.max(1, x2 - x1)}
                  height={ROW_H}
                  rx={ROW_H / 2}
                  fill={color}
                  opacity={alive ? 1 : 0.45}
                />
                {alive && (
                  <rect
                    x={x1}
                    y={y}
                    width={Math.max(1, x2 - x1)}
                    height={ROW_H}
                    rx={ROW_H / 2}
                    fill="none"
                    stroke={color}
                    strokeOpacity={0.45}
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
