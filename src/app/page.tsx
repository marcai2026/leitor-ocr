export default function HomePage() {
  return (
    <main className="site-grid relative min-h-[calc(100dvh-65px)] overflow-hidden">
      <div
        className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-[var(--teal-bright)]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[var(--lime)]/25 blur-3xl"
        aria-hidden
      />

      <section className="relative mx-auto grid min-h-[calc(100dvh-65px)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-0">
        <div className="relative z-10">
          <p className="animate-rise font-display pb-1 text-5xl font-extrabold leading-[1.15] tracking-tight text-[var(--ink)] sm:text-6xl md:text-7xl">
            Logo.
          </p>

          <p className="animate-rise-delay mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--teal)]">
            Plataforma de leitura documental
          </p>

          <h1 className="animate-rise-delay mt-3 max-w-xl font-display text-3xl font-bold leading-tight text-[var(--ink)] sm:text-4xl">
            Transforme documentos em dados estruturados
          </h1>
        </div>

        <div
          className="animate-rise-delay relative mx-auto w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[340px]"
          aria-hidden
        >
          <div className="animate-float-doc relative aspect-[4/5] w-full">
            <div className="absolute inset-x-[12%] top-[8%] bottom-[4%] rotate-3 rounded-sm bg-white/40 shadow-[0_20px_50px_rgba(16,35,31,0.12)]" />
            <div className="absolute inset-x-[8%] top-[4%] bottom-[8%] -rotate-2 rounded-sm bg-white/70 shadow-[0_16px_40px_rgba(16,35,31,0.1)]" />

            <div className="absolute inset-x-[4%] inset-y-[2%] overflow-hidden rounded-sm bg-[#fbfcfb] shadow-[0_24px_60px_rgba(16,35,31,0.16)] ring-1 ring-[var(--ink)]/10">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
                <span className="font-display text-base font-bold text-[var(--ink)]">
                  Logo.
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--teal)]">
                  Scan
                </span>
              </div>

              <div className="space-y-2.5 px-4 py-5">
                <div className="h-2.5 w-2/3 rounded-sm bg-[var(--ink)]/15" />
                <div className="h-2.5 w-full rounded-sm bg-[var(--ink)]/10" />
                <div className="h-2.5 w-5/6 rounded-sm bg-[var(--ink)]/10" />
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <div className="h-14 rounded-sm bg-[var(--mist)]" />
                  <div className="h-14 rounded-sm bg-[var(--mist)]" />
                </div>
                <div className="mt-3 h-2.5 w-3/4 rounded-sm bg-[var(--ink)]/10" />
                <div className="h-2.5 w-full rounded-sm bg-[var(--ink)]/8" />
                <div className="h-2.5 w-4/5 rounded-sm bg-[var(--ink)]/10" />
              </div>

              <div className="absolute inset-x-0 top-0 h-1/3 overflow-hidden">
                <div className="animate-scan absolute inset-x-0 h-14 bg-gradient-to-b from-transparent via-[var(--teal-bright)]/35 to-transparent" />
              </div>

              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-md bg-[var(--ink)] px-3 py-2.5 text-xs text-white">
                <span className="font-medium">Nota fiscal</span>
                <span className="animate-pulse-soft text-[var(--lime)]">
                  92%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
