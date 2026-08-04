import AdminIcon from "../components/AdminIcon";
import AdminPageHeader from "../components/AdminPageHeader";

export default function AdminPlaceholderPage({
  eyebrow,
  title,
  description,
  nextStep,
}: {
  eyebrow: string;
  title: string;
  description: string;
  nextStep: string;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        icon="activity"
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="relative overflow-hidden rounded-[1.75rem] border border-white/[0.075] bg-slate-900/55 p-6 shadow-xl shadow-black/[0.08] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-400/[0.07] blur-3xl"
          />
          <div className="relative flex max-w-3xl items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-sky-300/15 bg-sky-400/[0.08] text-sky-200">
              <AdminIcon name="activity" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-sky-300">
                Planned implementation
              </p>
              <h2 className="mt-2 text-xl font-black text-white">
                Built on the protected administrator foundation
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {nextStep}
              </p>
            </div>
          </div>
        </article>

        <aside className="rounded-[1.75rem] border border-emerald-300/10 bg-emerald-400/[0.045] p-5 shadow-xl shadow-black/[0.08]">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-400/10 text-emerald-200">
              <AdminIcon name="shield" className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-emerald-300">
                Security baseline
              </p>
              <p className="mt-1.5 text-sm font-black text-white">
                Ready for protected operations
              </p>
            </div>
          </div>
          <ul className="mt-5 space-y-3 text-xs leading-5 text-slate-400">
            {[
              "Separate administrator sessions and CSRF protection",
              "Passkey and authenticator verification",
              "Recent-authentication checks for sensitive actions",
              "Backend role enforcement and audit records",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-300">
                  <AdminIcon name="check" className="h-2.5 w-2.5" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </div>
  );
}
