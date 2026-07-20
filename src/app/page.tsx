import Link from "next/link";

export default function HomePage() {
  return (
    <main className="site-grid relative min-h-[calc(100vh-73px)] overflow-hidden">
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[var(--teal-bright)]/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[var(--lime)]/25 blur-3xl"
        aria-hidden
      />

      <section className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-0">
        <div className="relative z-10">
          <p className="animate-rise font-display text-5xl font-extrabold tracking-tight text-[var(--ink)] sm:text-6xl md:text-7xl">
            Poc
          </p>

          <h1 className="animate-rise-delay mt-5 max-w-xl font-display text-3xl font-bold leading-tight text-[var(--ink)] sm:text-4xl">
            Documentos lidos. Tipos identificados.
          </h1>

          <p className="animate-rise-delay-2 mt-4 max-w-md text-base leading-relaxed text-[var(--ink-soft)] sm:text-lg">
            Classifique notas, comprovantes e solicitações — ou extraia dados
            da CNH — com Azure Document Intelligence.
          </p>

          <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
            <Link
              href="/classificar"
              className="inline-flex items-center justify-center rounded-md bg-[var(--ink)] px-5 py-3 text-sm font-semibold text-[var(--lime)] transition hover:bg-[var(--ink-soft)]"
            >
              Classificar documentos
            </Link>
            <Link
              href="/cnh"
              className="inline-flex items-center justify-center rounded-md border border-[var(--ink)]/20 bg-white/60 px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--teal)] hover:bg-white"
            >
              Extrair CNH
            </Link>
          </div>
        </div>

        <div
          className="animate-rise-delay relative mx-auto w-full max-w-md lg:max-w-none"
          aria-hidden
        >
          <div className="animate-float-doc relative aspect-[4/5] w-full">
            <div className="absolute inset-x-[12%] top-[8%] bottom-[4%] rotate-3 rounded-sm bg-white/40 shadow-[0_20px_50px_rgba(16,35,31,0.12)]" />
            <div className="absolute inset-x-[8%] top-[4%] bottom-[8%] -rotate-2 rounded-sm bg-white/70 shadow-[0_16px_40px_rgba(16,35,31,0.1)]" />

            <div className="absolute inset-x-[4%] inset-y-[2%] overflow-hidden rounded-sm bg-[#fbfcfb] shadow-[0_24px_60px_rgba(16,35,31,0.16)] ring-1 ring-[var(--ink)]/10">
              <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <span className="font-display text-lg font-bold text-[var(--ink)]">
                  Poc
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--teal)]">
                  Scan
                </span>
              </div>

              <div className="space-y-3 px-5 py-6">
                <div className="h-3 w-2/3 rounded-sm bg-[var(--ink)]/15" />
                <div className="h-3 w-full rounded-sm bg-[var(--ink)]/10" />
                <div className="h-3 w-5/6 rounded-sm bg-[var(--ink)]/10" />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="h-16 rounded-sm bg-[var(--mist)]" />
                  <div className="h-16 rounded-sm bg-[var(--mist)]" />
                </div>
                <div className="mt-4 h-3 w-3/4 rounded-sm bg-[var(--ink)]/10" />
                <div className="h-3 w-full rounded-sm bg-[var(--ink)]/8" />
                <div className="h-3 w-4/5 rounded-sm bg-[var(--ink)]/10" />
              </div>

              <div className="absolute inset-x-0 top-0 h-1/3 overflow-hidden">
                <div className="animate-scan absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-[var(--teal-bright)]/35 to-transparent" />
              </div>

              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-md bg-[var(--ink)] px-4 py-3 text-sm text-white">
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
