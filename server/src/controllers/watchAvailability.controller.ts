import type {
  Request,
  Response,
} from 'express'
import type {
  MediaType,
} from '../types/media.js'
import { getWatchAvailability } from '../services/watchAvailability.service.js'
import { TmdbRequestError } from '../services/tmdb.service.js'

export async function getMediaWatchAvailability(
  req: Request,
  res: Response,
) {
  const mediaTypeText =
    req.params.mediaType

  const tmdbId =
    Number(req.params.tmdbId)

  const regionText =
    typeof req.query.region ===
    'string'
      ? req.query.region
          .trim()
          .toUpperCase()
      : 'LK'

  if (
    mediaTypeText !== 'movie' &&
    mediaTypeText !== 'tv'
  ) {
    res.status(400).json({
      status: 'error',

      message:
        'Media type must be movie or tv.',
    })

    return
  }

  if (
    !Number.isInteger(tmdbId) ||
    tmdbId <= 0
  ) {
    res.status(400).json({
      status: 'error',

      message:
        'TMDB ID must be a positive integer.',
    })

    return
  }

  if (
    !/^[A-Z]{2}$/.test(
      regionText,
    )
  ) {
    res.status(400).json({
      status: 'error',

      message:
        'Watch region must be a two-letter country code.',
    })

    return
  }

  try {
    const availability =
      await getWatchAvailability(
        mediaTypeText as
          MediaType,

        tmdbId,
        regionText,
      )

    res.status(200).json({
      status: 'success',
      availability,
    })
  } catch (error) {
    console.error(
      'TMDB watch availability error:',
      error,
    )

    if (
      error instanceof Error &&
      error.message.includes(
        'TMDB_READ_ACCESS_TOKEN',
      )
    ) {
      res.status(500).json({
        status: 'error',

        message:
          'TMDB is not configured on the server.',
      })

      return
    }

    if (
      error instanceof
        TmdbRequestError &&
      error.status === 401
    ) {
      res.status(502).json({
        status: 'error',

        message:
          'TMDB authentication failed.',
      })

      return
    }

    res.status(502).json({
      status: 'error',

      message:
        'Official streaming availability could not be retrieved.',
    })
  }
}