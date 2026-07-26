import type {
  MouseEvent,
} from 'react'
import { usePlannedFeature } from '../features/plannedFeature/plannedFeatureContext'
import { BookmarkIcon } from './navigation/NavigationIcons'

interface WatchlistButtonProps {
  itemTitle: string
  className?: string
  variant?: 'icon' | 'labeled'
}

function WatchlistButton({
  itemTitle,
  className = '',
  variant = 'icon',
}: WatchlistButtonProps) {
  const { showPlannedFeature } =
    usePlannedFeature()

  function handleClick(
    event:
      MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault()
    event.stopPropagation()

    showPlannedFeature({
      title:
        'Watchlist requires an account',

      message:
        `${itemTitle} has not been saved. ` +
        'Sign-in and persistent watchlists will be added during the authentication phase.',
    })
  }

  const isLabeled =
    variant === 'labeled'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Add ${itemTitle} to watchlist. Sign-in required.`}
      title="Add to watchlist — sign-in required"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/15 bg-slate-950/80 font-semibold text-white shadow-lg shadow-black/30 backdrop-blur-md transition hover:border-sky-300/60 hover:bg-sky-500 ${
        isLabeled
          ? 'px-5'
          : 'min-w-11'
      } ${className}`}
    >
      <BookmarkIcon className="h-5 w-5" />

      {isLabeled && (
        <span>
          Add to Watchlist
        </span>
      )}
    </button>
  )
}

export default WatchlistButton