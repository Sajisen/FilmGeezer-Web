import type { Request, Response } from 'express'
import type { MediaType } from '../types/media.js'
import {
  getTmdbCatalog,
  TmdbRequestError,
  UnknownGenreError,
} from '../services/tmdb.service.js'

function getQueryString(
  value: unknown,
): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()

  return trimmedValue || undefined
}

export async function getCatalogMedia(
  req: Request,
  res: Response,
) {
  const { mediaType } = req.params

  if (mediaType !== 'movie' && mediaType !== 'tv') {
    res.status(400).json({
      status: 'error',
      message: 'Media type must be either movie or tv.',
    })
    return
  }

  const search = getQueryString(req.query.search)
  const genre = getQueryString(req.query.genre)
  const language = getQueryString(req.query.language)

  const pageText = getQueryString(req.query.page)
  const minRatingText = getQueryString(
    req.query.minRating,
  )

  const page = pageText ? Number(pageText) : 1

  if (!Number.isInteger(page) || page <= 0) {
    res.status(400).json({
      status: 'error',
      message: 'Page must be a valid positive number.',
    })
    return
  }

  let minRating: number | undefined

  if (minRatingText) {
    minRating = Number(minRatingText)

    if (
      Number.isNaN(minRating) ||
      minRating < 0 ||
      minRating > 10
    ) {
      res.status(400).json({
        status: 'error',
        message:
          'Minimum rating must be between 0 and 10.',
      })
      return
    }
  }

  if (search && search.length > 100) {
    res.status(400).json({
      status: 'error',
      message:
        'Search text must not exceed 100 characters.',
    })
    return
  }

  if (
    language &&
    !/^[a-zA-Z]{2}$/.test(language)
  ) {
    res.status(400).json({
      status: 'error',
      message:
        'Language must be a two-letter language code.',
    })
    return
  }

  try {
    const data = await getTmdbCatalog(
      mediaType as MediaType,
      {
        search,
        genre,
        language,
        minRating,
        page,
      },
    )

    res.status(200).json({
      status: 'success',
      mediaType,
      filters: {
        search: search ?? null,
        genre: genre ?? null,
        language: language ?? null,
        minRating: minRating ?? null,
      },
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults,
      count: data.results.length,
      results: data.results,
    })
  } catch (error) {
    console.error('TMDB catalog error:', error)

    if (error instanceof UnknownGenreError) {
      res.status(400).json({
        status: 'error',
        message:
          'The selected genre is not valid for this media type.',
      })
      return
    }

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
      error instanceof TmdbRequestError &&
      error.status === 401
    ) {
      res.status(502).json({
        status: 'error',
        message:
          'TMDB authentication failed. Check the server token.',
      })
      return
    }

    res.status(502).json({
      status: 'error',
      message:
        'Unable to retrieve catalogue results from TMDB.',
    })
  }
}