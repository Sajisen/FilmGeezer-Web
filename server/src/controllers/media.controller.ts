import type { Request, Response } from 'express'
import type { MediaType } from '../types/media.js'
import {
  getTmdbMediaDetails,
  TmdbRequestError,
} from '../services/tmdb.service.js'

export async function getMediaByTmdbId(
  req: Request,
  res: Response,
) {
  const { mediaType, tmdbId } = req.params

  if (mediaType !== 'movie' && mediaType !== 'tv') {
    res.status(400).json({
      status: 'error',
      message: 'Media type must be either movie or tv.',
    })
    return
  }

  const numericTmdbId = Number(tmdbId)

  if (!Number.isInteger(numericTmdbId) || numericTmdbId <= 0) {
    res.status(400).json({
      status: 'error',
      message: 'TMDB ID must be a valid positive number.',
    })
    return
  }

  try {
    const media = await getTmdbMediaDetails(
      mediaType as MediaType,
      numericTmdbId,
    )

    res.status(200).json({
      status: 'success',
      result: media,
    })
  } catch (error) {
    console.error('TMDB media-details error:', error)

    if (
      error instanceof Error &&
      error.message.includes('TMDB_READ_ACCESS_TOKEN')
    ) {
      res.status(500).json({
        status: 'error',
        message: 'TMDB is not configured on the server.',
      })
      return
    }

    if (error instanceof TmdbRequestError) {
      if (error.status === 404) {
        res.status(404).json({
          status: 'error',
          message: 'Media item not found.',
        })
        return
      }

      if (error.status === 401) {
        res.status(502).json({
          status: 'error',
          message: 'TMDB authentication failed. Check the server token.',
        })
        return
      }
    }

    res.status(502).json({
      status: 'error',
      message: 'Unable to retrieve media details from TMDB.',
    })
  }
}