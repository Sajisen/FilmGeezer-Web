import { Link } from 'react-router'
import type { MediaItem } from '../types/media'
import WatchlistButton from './WatchlistButton'

interface MediaCardProps {
  item: MediaItem
}

function getMediaTypeLabel(
  item: MediaItem,
) {
  return item.mediaType === 'movie'
    ? 'Movie'
    : 'TV Series'
}

function getRatingLabel(
  rating: number,
) {
  return rating > 0
    ? rating.toFixed(1)
    : 'NR'
}

function MediaCard({
  item,
}: MediaCardProps) {
  const ratingLabel =
    getRatingLabel(item.rating)

  return (
    <article className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-sky-400/30 hover:shadow-xl hover:shadow-sky-950/30 focus-within:border-sky-400/50">
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

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />

          <span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-slate-950/75 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-200 backdrop-blur-md">
            {getMediaTypeLabel(item)}
          </span>
        </div>

        <div className="flex min-h-44 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-bold leading-6 text-white sm:text-lg">
              {item.title}
            </h3>

            <span
              aria-label={
                ratingLabel === 'NR'
                  ? 'Rating not available'
                  : `Rating ${ratingLabel}`
              }
              className="shrink-0 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-300"
            >
              ★ {ratingLabel}
            </span>
          </div>

          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.year ||
              'Release year unavailable'}
          </p>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">
            {item.overview ||
              'No overview is available for this title.'}
          </p>

          <span className="mt-auto pt-4 text-sm font-semibold text-sky-300 transition group-hover:text-sky-200">
            View details
          </span>
        </div>
      </Link>

      <WatchlistButton
        itemTitle={item.title}
        className="absolute right-3 top-3 z-10 opacity-100 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"
      />
    </article>
  )
}

export default MediaCard