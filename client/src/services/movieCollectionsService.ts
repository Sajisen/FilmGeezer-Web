import type { MovieCollections } from '../types/movieCollections'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL

interface MovieCollectionsApiResponse {
  status: 'success'
  collections: MovieCollections
}

interface ApiErrorResponse {
  status?: string
  message?: string
}

export async function getMovieCollections(
  signal?: AbortSignal,
): Promise<MovieCollections> {
  const response = await fetch(
    `${API_BASE_URL}/api/collections/movies`,
    {
      signal,
    },
  )

  const data = (await response.json()) as
    | MovieCollectionsApiResponse
    | ApiErrorResponse

  if (!response.ok) {
    const message =
      'message' in data && data.message
        ? data.message
        : 'Movie collections request failed.'

    throw new Error(message)
  }

  return (
    data as MovieCollectionsApiResponse
  ).collections
}