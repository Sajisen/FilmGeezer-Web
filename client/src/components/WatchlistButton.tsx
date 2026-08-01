import type { MouseEvent } from "react";

import { useAuth } from "../features/auth/authContext";
import { usePlannedFeature } from "../features/plannedFeature/plannedFeatureContext";
import { BookmarkIcon } from "./navigation/NavigationIcons";

interface WatchlistButtonProps {
  itemTitle: string;
  className?: string;
  variant?: "icon" | "labeled";
}

function WatchlistButton({
  itemTitle,
  className = "",
  variant = "icon",
}: WatchlistButtonProps) {
  const { status } = useAuth();
  const { showPlannedFeature } = usePlannedFeature();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const message =
      status === "authenticated"
        ? `${itemTitle} has not been saved. Your FilmGeezer account is ready, but persistent Watchlist saving is the next feature being built.`
        : `${itemTitle} has not been saved. Guest and account Watchlists are the next FilmGeezer feature being built.`;

    showPlannedFeature({
      title: "Watchlist is coming next",
      message,
    });
  }

  const isLabeled = variant === "labeled";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Add ${itemTitle} to Watchlist. Watchlist saving is not available yet.`}
      title="Watchlist is coming next"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-slate-950/80 font-semibold text-white shadow-lg shadow-black/30 backdrop-blur-md transition hover:border-sky-300/60 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950 ${
        isLabeled ? "px-5" : "min-w-11"
      } ${className}`}
    >
      <BookmarkIcon className="h-5 w-5" />

      {isLabeled && <span>Add to Watchlist</span>}
    </button>
  );
}

export default WatchlistButton;