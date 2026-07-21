import MediaDetailsContainer from "./MediaDetailsContainer";

interface MediaDetailsQuickNavProps {
  hasTrailer: boolean;
  hasEpisodes: boolean;
}

function MediaDetailsQuickNav({
  hasTrailer,
  hasEpisodes,
}: MediaDetailsQuickNavProps) {
  const navigationItems = [
    {
      label: "Key details",
      href: "#key-details",
      visible: true,
    },
    {
      label: "Trailers",
      href: "#trailer",
      visible: hasTrailer,
    },
    {
      label: "Where to watch",
      href: "#official-availability",
      visible: true,
    },
    {
      label: "Episodes",
      href: "#episode-explorer",
      visible: hasEpisodes,
    },
    {
      label: "FilmGeezer links",
      href: "#provider-links",
      visible: true,
    },
  ].filter((item) => item.visible);

  return (
    <nav
      aria-label="Media details sections"
      className="min-w-0 border-b border-white/10 bg-slate-950/85 py-4 backdrop-blur-md"
    >
      <MediaDetailsContainer>
        <div className="media-row-scrollbar -mx-1 flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 pr-5">
          {navigationItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-300 transition hover:border-sky-300/40 hover:bg-sky-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              {item.label}
            </a>
          ))}
        </div>
      </MediaDetailsContainer>
    </nav>
  );
}

export default MediaDetailsQuickNav;