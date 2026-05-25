"use client";

import type { ChangeEvent } from "react";
import type { SampleKey } from "@/lib/image";

type Props = {
  sample: SampleKey;
  onSample: (key: SampleKey) => void;
  onUpload: (file: File) => void;
  t: number;
  onT: (t: number) => void;
  min: number;
  max: number;
  playing: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeed: (s: number) => void;
};

const SAMPLES: Array<{ key: SampleKey; label: string; subtitle: string }> = [
  { key: "blobs", label: "Blobs", subtitle: "Gaussian sum — H₀ rich" },
  { key: "rings", label: "Annuli", subtitle: "concentric rings — H₁ rich" },
  { key: "terrain", label: "Terrain", subtitle: "Morse landscape" },
  { key: "digit", label: "Figure 8", subtitle: "two loops" },
];

export default function Controls({
  sample,
  onSample,
  onUpload,
  t,
  onT,
  min,
  max,
  playing,
  onTogglePlay,
  speed,
  onSpeed,
}: Props) {
  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onUpload(f);
  };

  const span = max - min || 1;
  const tNorm = (t - min) / span;

  return (
    <div className="space-y-5">
      <section>
        <div className="text-xs uppercase tracking-[0.25em] text-white/40 mb-2">field</div>
        <div className="grid grid-cols-2 gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.key}
              onClick={() => onSample(s.key)}
              className={`text-left rounded-lg border px-3 py-2 transition ${
                sample === s.key
                  ? "border-cyan-400/60 bg-cyan-500/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/30 hover:text-white"
              }`}
            >
              <div className="text-sm font-medium">{s.label}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">
                {s.subtitle}
              </div>
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">
            or upload an image
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="mt-1 block w-full text-xs text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white file:hover:bg-white/20 file:cursor-pointer"
          />
        </label>
      </section>

      <section>
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40 mb-2">
          <span>filtration value t</span>
          <span className="font-mono normal-case tracking-normal text-white/70">
            {t.toFixed(3)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={tNorm}
          onChange={(e) => onT(min + Number(e.target.value) * span)}
          className="w-full accent-cyan-400"
        />
        <div className="flex items-center justify-between mt-3 gap-2">
          <button
            onClick={onTogglePlay}
            className="px-3 py-1.5 rounded-md border border-white/15 bg-white/[0.05] text-xs text-white hover:bg-white/10"
          >
            {playing ? "❚❚  pause sweep" : "▶  play sweep"}
          </button>
          <label className="flex items-center gap-2 text-xs text-white/50">
            <span>speed</span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={speed}
              onChange={(e) => onSpeed(Number(e.target.value))}
              className="w-20 accent-fuchsia-400"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
