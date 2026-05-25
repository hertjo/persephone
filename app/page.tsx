import Studio from "@/components/Studio";

export default function Page() {
  return (
    <div className="relative min-h-screen text-white">
      <Backdrop />
      <Header />
      <Studio />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="relative px-8 pt-7 pb-4 flex items-center">
      <div className="flex items-center gap-3.5">
        <Sigil />
        <div className="leading-tight">
          <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-white">
            Persephone
          </h1>
          <p className="text-[10.5px] tracking-[0.32em] uppercase text-white/35 mt-0.5">
            persistent homology of image manifolds
          </p>
        </div>
      </div>
    </header>
  );
}

function Sigil() {
  // A tiny inline SVG suggesting a persistence diagram with two glowing dots
  // above the diagonal — the project's visual signature.
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <defs>
        <radialGradient id="sig-glow-cy" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#56e0ff" />
          <stop offset="100%" stopColor="#56e0ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sig-glow-ma" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff5dd2" />
          <stop offset="100%" stopColor="#ff5dd2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0.5" y="0.5" width="33" height="33" rx="8" stroke="rgba(255,255,255,0.15)" fill="rgba(255,255,255,0.02)" />
      <line x1="6" y1="28" x2="28" y2="6" stroke="rgba(255,255,255,0.25)" strokeDasharray="2 2" />
      <circle cx="11" cy="16" r="6" fill="url(#sig-glow-cy)" />
      <circle cx="11" cy="16" r="2.2" fill="#56e0ff" />
      <circle cx="19" cy="9" r="6" fill="url(#sig-glow-ma)" />
      <circle cx="19" cy="9" r="2.2" fill="#ff5dd2" />
    </svg>
  );
}

function Backdrop() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10"
      style={{
        background:
          "radial-gradient(1200px 600px at 15% -10%, rgba(86,224,255,0.10), transparent 60%)," +
          "radial-gradient(900px 500px at 110% 10%, rgba(255,93,210,0.10), transparent 60%)," +
          "radial-gradient(1400px 800px at 50% 110%, rgba(102,79,255,0.10), transparent 70%)," +
          "linear-gradient(180deg,#04050b 0%, #06081a 50%, #04050b 100%)",
      }}
    />
  );
}

function Footer() {
  return (
    <footer className="relative px-8 pb-6 pt-1 text-[10px] tracking-[0.32em] uppercase text-white/25 text-center">
      cubical complex · sublevel filtration · alexander duality
    </footer>
  );
}
