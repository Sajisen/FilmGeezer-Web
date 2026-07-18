import type { Request, Response } from 'express'
import type {
  BrowseCategory,
  MediaType,
} from '../types/media.js'
import {
  getTmdbBrowseList,
  TmdbRequestError,
} from '../services/tmdb.service.js'

const validCategories: BrowseCategory[] = [
  'trending',
  'current',
  'popular',
  'top_rated',
]

export async function browseMedia(req: Request, res: Response) {
  const { mediaType, category } = req.params

  if (mediaType !== 'movie' && mediaType !== 'tv') {
    res.status(400).json({
      status: 'error',
      message: 'Media type must be either movie or tv.',
    })
    return
  }

  if (!validCategories.includes(category as BrowseCategory)) {
    res.status(400).json({
      status: 'error',
      message:
        'Category must be trending, current, popular, or top_rated.',
    })
    return
  }

  const requestedPage =
    typeof req.query.page === 'string'
      ? Number(req.query.page)
      : 1

  if (
    !Number.isInteger(requestedPage) ||
    requestedPage <= 0
  ) {
    res.status(400).json({
      status: 'error',
      message: 'Page must be a valid positive number.',
    })
    return
  }

  try {
    const data = await getTmdbBrowseList(
      mediaType as MediaType,
      category as BrowseCategory,
      requestedPage,
    )

    res.status(200).json({
      status: 'success',
      mediaType,
      category,
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults,
      count: data.results.length,
      results: data.results,
    })
  } catch (error) {
    console.error('TMDB browse error:', error)

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

    if (
      error instanceof TmdbRequestError &&
      error.status === 401
    ) {
      res.status(502).json({
        status: 'error',
        message: 'TMDB authentication failed. Check the server token.',
      })
      return
    }

    res.status(502).json({
      status: 'error',
      message: 'Unable to retrieve browse results from TMDB.',
    })
  }
}