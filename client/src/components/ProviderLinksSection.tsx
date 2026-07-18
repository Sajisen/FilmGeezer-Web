import type { ProviderLink } from '../types/providerLink'

interface ProviderLinksSectionProps {
  links: ProviderLink[]
}

function ProviderLinksSection({ links }: ProviderLinksSectionProps) {
  return (
    <section id="provider-links" className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
            External Links
          </p>

          <h2 className="text-2xl font-bold text-white">Provider Links</h2>

          <p className="mt-3 text-slate-300">
            These are mock provider links for now. Later, this data will come
            from MongoDB through your Express backend.
          </p>
        </div>

        {links.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/60 p-5">
            <p className="font-semibold text-white">No provider links yet</p>
            <p className="mt-2 text-sm text-slate-400">
              Later, admins will be able to add provider links for this title.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {links.map((link) => (
              <article
                key={link.linkId}
                className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-white">{link.label}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {link.providerName}
                    </p>
                  </div>

                  <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300">
                    {link.quality}
                  </span>
                </div>

                <p className="text-sm text-slate-300">
                  Language: {link.language}
                </p>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
                >
                  Open Link
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default ProviderLinksSection