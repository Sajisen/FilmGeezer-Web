import type {
  Request,
  Response,
} from 'express'
import { getAnimeCollections } from '../services/animeCollections.service.js'
import { TmdbRequestError } from '../services/tmdb.service.js'

export async function getAnimeCollectionPage(
  _req: Request,
  res: Response,
) {
  try {
    const collections =
      await getAnimeCollections()

    res.status(200).json({
      status: 'success',
      collections,
    })
  } catch (error) {
    console.error(
      'TMDB Anime-collections error:',
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
          'TMDB authentication failed. Check the server token.',
      })

      return
    }

    res.status(502).json({
      status: 'error',

      message:
        'Unable to retrieve the Anime page collections from TMDB.',
    })
  }
}