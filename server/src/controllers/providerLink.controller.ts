import type { Request, Response } from 'express'
import { mockProviderLinks } from '../data/mockProviderLinks.js'

export function getProviderLinksByMedia(req: Request, res: Response) {
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

  const links = mockProviderLinks.filter(
    (link) =>
      link.mediaType === mediaType &&
      link.tmdbId === numericTmdbId,
  )

  res.status(200).json({
    status: 'success',
    mediaType,
    tmdbId: numericTmdbId,
    count: links.length,
    results: links,
  })
}