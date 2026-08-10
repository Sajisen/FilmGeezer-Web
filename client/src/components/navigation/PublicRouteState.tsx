import ContentContainer from "../layout/ContentContainer";

function RouteSpinner() {
  return (
    <span
      aria-hidden="true"
      className="h-10 w-10 animate-spin rounded-full border-4 border-sky-400 border-t-transparent motion-reduce:animate-none"
    />
  );
}

export function PublicRouteLoadingState() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      data-route-loading="true"
      aria-busy="true"
      className="min-h-[58vh] py-10 text-white sm:py-14"
    >
      <ContentContainer>
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-56 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.035] px-6 text-center shadow-xl shadow-black/10"
        >
          <div className="flex max-w-md flex-col items-center">
            <RouteSpinner />
            <p className="mt-5 text-sm font-black uppercase tracking-[0.16em] text-sky-300">
              Loading FilmGeezer
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Preparing this page…
            </p>
          </div>
        </div>
      </ContentContainer>
    </main>
  );
}

export function PublicRouteErrorState() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-[58vh] py-10 text-white sm:py-14"
    >
      <ContentContainer>
        <section
          role="alert"
          className="mx-auto max-w-2xl rounded-3xl border border-red-300/15 bg-red-400/[0.045] p-6 shadow-2xl shadow-black/15 sm:p-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-200">
            Page unavailable
          </p>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            FilmGeezer could not load this page.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            A page resource may have changed during a deployment or your connection may have been interrupted. Reload FilmGeezer to request the current application files.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-400 px-5 text-sm font-black text-slate-950 transition hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Reload FilmGeezer
          </button>
        </section>
      </ContentContainer>
    </main>
  );
}
