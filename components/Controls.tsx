"use client";

import { useRef, type ChangeEvent } from "react";
import { SAMPLES, type SampleKey } from "@/lib/image";

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

const SAMPLE_ENTRIES = Object.entries(SAMPLES) as Array<
  [SampleKey, (typeof SAMPLES)[SampleKey]]
>;

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
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onUpload(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const span = max - min || 1;
  const tNorm = (t - min) / span;

  return (
    <div className="space-y-6">
      <section>
        <SectionLabel>field</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          {SAMPLE_ENTRIES.map(([key, spec]) => {
            const active = sample === key;
            return (
              <button
                key={key}
                onClick={() => onSample(key)}
                className={[
                  "text-left rounded-xl px-3 py-2.5 transition-all duration-200",
                  "border",
                  active
                    ? "border-cyan-400/55 bg-cyan-400/[0.08] text-white shadow-[0_0_0_1px_rgba(86,224,255,0.2),inset_0_1px_0_rgba(255,255,255,0.04)]"
                    : "border-white/[0.07] bg-white/[0.02] text-white/65 hover:border-white/20 hover:bg-white/[0.04] hover:text-white",
                ].join(" ")}
              >
                <div className="text-[13px] font-medium tracking-tight leading-tight">
                  {spec.label}
                </div>
                <div className="text-[10px] tracking-[0.06em] text-white/40 mt-0.5">
                  {spec.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[12px] text-white/70 hover:text-white hover:bg-white/[0.05] hover:border-white/20 transition-colors"
        >
          <UploadIcon />
          <span>upload image</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2.5">
          <SectionLabel>filtration value</SectionLabel>
          <span className="font-mono text-[12px] text-white/80 tabular-nums">
            t = {t.toFixed(3)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={tNorm}
          onChange={(e) => onT(min + Number(e.target.value) * span)}
          className="w-full"
        />
        <div className="flex items-center justify-between mt-3.5 gap-2">
          <button
            onClick={onTogglePlay}
            aria-label={playing ? "pause sweep" : "play sweep"}
            className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11.5px] text-white/85 hover:bg-white/[0.06] hover:border-white/20 transition-colors"
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
            <span>{playing ? "pause" : "play"}</span>
          </button>
          <label className="flex items-center gap-2 text-[10.5px] tracking-[0.08em] uppercase text-white/40">
            <span>speed</span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.01}
              value={speed}
              onChange={(e) => onSpeed(Number(e.target.value))}
              className="w-20"
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">
      {children}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
      <path d="M2 1.5 L2 8.5 L8 5 Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden>
      <rect x="2" y="1.5" width="2.2" height="7" rx="0.6" />
      <rect x="5.8" y="1.5" width="2.2" height="7" rx="0.6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 8.5 L6 1.8 M3.2 4.6 L6 1.8 L8.8 4.6" />
      <path d="M2 9.4 L2 10.2 L10 10.2 L10 9.4" />
    </svg>
  );
}
