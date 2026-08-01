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
  const {
    hasItem,
    isItemPending,
    isMutationPending,
    toggleItem,
  } = useWatchlist();

  const isSaved = hasItem(item.mediaType, item.tmdbId);
  const isPending = isItemPending(item.mediaType, item.tmdbId);
  const isLabeled = variant === "labeled";
  const isDisabled = isMutationPending;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isDisabled) {
      return;
    }

    void toggleItem(item);
  }

  const actionLabel = isSaved
    ? `Remove ${item.title} from Watchlist`
    : `Add ${item.title} to Watchlist`;

  const savedClasses = isLabeled
    ? "border-sky-300/40 bg-slate-950/75 text-white hover:border-sky-200/60 hover:bg-slate-900/90"
    : "border-sky-300/45 bg-slate-950/90 text-sky-300 hover:border-sky-200/65 hover:bg-sky-400/15";

  const unsavedClasses =
    "border-white/15 bg-slate-950/80 text-white hover:border-sky-300/60 hover:bg-slate-900";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={actionLabel}
      aria-pressed={isSaved}
      aria-busy={isPending}
      title={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border font-semibold shadow-lg shadow-black/30 backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-70 ${
        isSaved ? savedClasses : unsavedClasses
      } ${isSaved ? "[&_path]:fill-current" : ""} ${
        isLabeled ? "px-5" : "min-w-11"
      } ${className}`}
    >
      <BookmarkIcon
        className={`h-5 w-5 ${isPending ? "animate-pulse" : ""}`}
      />

      {isLabeled && (
        <span>{isSaved ? "Saved" : "Add to Watchlist"}</span>
      )}
    </button>
  );
}

export default WatchlistButton;
