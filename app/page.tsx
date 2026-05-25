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
    <header className="relative px-6 pt-6 pb-2 flex items-baseline gap-4">
      <div className="flex items-center gap-3">
        <Sigil />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            persephone
          </h1>
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">
            persistent homology of image manifolds
          </p>
        </div>
      </div>
      <div className="ml-auto text-[10px] uppercase tracking-[0.3em] text-white/30 hidden md:block">
        topological vision · v0.1
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
    <footer className="relative px-6 pb-6 pt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/30">
      <span>cubical complex · sublevel filtration · Alexander duality</span>
      <span>edelsbrunner & harer · bubenik · carlsson</span>
    </footer>
  );
}
