export function hasEpisodeRating(
  rating: number,
  voteCount: number,
) {
  return rating > 0 && voteCount > 0
}

export function getEpisodeRatingVisual(
  rating: number,
  voteCount: number,
) {
  if (
    !hasEpisodeRating(
      rating,
      voteCount,
    )
  ) {
    return {
      description: 'Unrated',

      className:
        'border-white/10 bg-slate-950/80 text-slate-500',
    }
  }

  if (rating >= 9) {
    return {
      description:
        'Exceptional rating',

      className:
        'border-sky-100/70 bg-sky-200 text-slate-950',
    }
  }

  if (rating >= 8) {
    return {
      description:
        'Very high rating',

      className:
        'border-sky-200/60 bg-sky-400 text-slate-950',
    }
  }

  if (rating >= 7) {
    return {
      description: 'Good rating',

      className:
        'border-sky-300/35 bg-sky-600 text-white',
    }
  }

  if (rating >= 6) {
    return {
      description:
        'Moderate rating',

      className:
        'border-sky-500/25 bg-sky-800 text-white',
    }
  }

  return {
    description: 'Low rating',

    className:
      'border-sky-900/80 bg-slate-900 text-sky-200',
  }
}