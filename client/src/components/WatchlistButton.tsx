import type { MouseEvent } from "react";

import { useWatchlist } from "../features/watchlist/watchlistContext";
import type { WatchlistCandidate } from "../types/watchlist";
import { BookmarkIcon } from "./navigation/NavigationIcons";

interface WatchlistButtonProps {
  item: WatchlistCandidate;
  className?: string;
  variant?: "icon" | "labeled";
}

function WatchlistButton({
  item,
  className = "",
  variant = "icon",
}: WatchlistButtonProps) {
  const { hasItem, toggleItem } = useWatchlist();

  const isSaved = hasItem(item.mediaType, item.tmdbId);
  const isLabeled = variant === "labeled";

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    toggleItem(item);
  }

  const actionLabel = isSaved
    ? `Remove ${item.title} from Watchlist`
    : `Add ${item.title} to Watchlist`;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={actionLabel}
      aria-pressed={isSaved}
      title={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border font-semibold shadow-lg shadow-black/30 backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 ${
        isSaved
          ? "border-sky-200/60 bg-sky-400 text-slate-950 hover:border-sky-100 hover:bg-sky-300 [&_path]:fill-current"
          : "border-white/15 bg-slate-950/80 text-white hover:border-sky-300/60 hover:bg-sky-500"
      } ${isLabeled ? "px-5" : "min-w-11"} ${className}`}
    >
      <BookmarkIcon className="h-5 w-5" />

      {isLabeled && (
        <span>{isSaved ? "Saved" : "Add to Watchlist"}</span>
      )}
    </button>
  );
}

export default WatchlistButton;
