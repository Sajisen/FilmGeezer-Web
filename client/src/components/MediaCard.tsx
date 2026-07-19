import { Link } from "react-router";
import type { MediaItem } from "../types/media";
import { getLanguageName } from "../utils/language";
import WatchlistButton from "./WatchlistButton";

interface MediaCardProps {
  item: MediaItem;
}

function getMediaTypeLabel(item: MediaItem) {
  return item.mediaType === "movie" ? "Movie" : "TV Series";
}

function getRatingLabel(rating: number) {
  return rating > 0 ? rating.toFixed(1) : "NR";
}

function getGenreSummary(genres: string[]) {
  const visibleGenres = genres.filter(Boolean).slice(0, 2);

  return visibleGenres.length > 0
    ? visibleGenres.join(" • ")
    : "Genre unavailable";
}

function MediaCard({ item }: MediaCardProps) {
  const ratingLabel = getRatingLabel(item.rating);

  const languageName = getLanguageName(item.language);

  const genreSummary = getGenreSummary(item.genres);

  const yearLabel = item.year || "Year unavailable";

  return (
    <article className="group relative h-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/85 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-sky-400/30 hover:shadow-xl hover:shadow-sky-950/30 focus-within:border-sky-400/50 sm:rounded-2xl">
      <Link
        to={`/media/${item.mediaType}/${item.tmdbId}`}
        aria-label={`View details for ${item.title}`}
        className="block h-full focus:outline-none"
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-slate-900">
          <img
            src={item.posterUrl}
            alt={`Poster for ${item.title}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

          <span
            aria-label={
              ratingLabel === "NR"
                ? "Rating not available"
                : `Rating ${ratingLabel}`
            }
            className="absolute left-2 top-2 rounded-full border border-amber-300/20 bg-slate-950/80 px-2.5 py-1 text-[0.7rem] font-bold text-amber-300 shadow-md shadow-black/30 backdrop-blur-md sm:left-3 sm:top-3 sm:text-xs"
          >
            ★ {ratingLabel}
          </span>

          <span className="absolute bottom-2 left-2 rounded-full border border-white/10 bg-slate-950/75 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-200 backdrop-blur-md sm:bottom-3 sm:left-3 sm:text-[0.7rem]">
            {getMediaTypeLabel(item)}
          </span>
        </div>

        <div className="flex h-[6.75rem] flex-col px-3 py-3 sm:h-[7.25rem] sm:px-4">
          <h3 className="h-[2.625rem] line-clamp-2 pr-1 text-sm font-bold leading-5 text-white sm:h-12 sm:text-base sm:leading-[1.35rem]">
            {item.title}
          </h3>

          <div className="mt-1 space-y-1">
            <p className="truncate text-xs font-medium text-slate-400">
              {yearLabel}

              <span aria-hidden="true"> • </span>

              {languageName}
            </p>

            <p title={genreSummary} className="truncate text-xs text-slate-500">
              {genreSummary}
            </p>
          </div>
        </div>
      </Link>

      <WatchlistButton
        itemTitle={item.title}
        className="absolute right-2 top-2 z-10 opacity-100 sm:right-3 sm:top-3 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"
      />
    </article>
  );
}

export default MediaCard;
