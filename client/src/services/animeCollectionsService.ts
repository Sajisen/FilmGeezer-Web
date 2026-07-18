import type { AnimeCollections } from '../types/animeCollections'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL

interface AnimeCollectionsApiResponse {
  status: 'success'
  collections: AnimeCollections
}

interface ApiErrorResponse {
  status?: string
  message?: string
}

export async function getAnimeCollections(
  signal?: AbortSignal,
): Promise<AnimeCollections> {
  const response = await fetch(
    `${API_BASE_URL}/api/collections/anime`,
    {
      signal,
    },
  )

  const data = (await response.json()) as
    | AnimeCollectionsApiResponse
    | ApiErrorResponse

  if (!response.ok) {
    const message =
      'message' in data && data.message
        ? data.message
        : 'Anime collections request failed.'

    throw new Error(message)
  }

  return (
    data as AnimeCollectionsApiResponse
  ).collections
}