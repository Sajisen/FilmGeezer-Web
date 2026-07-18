import type { TvCollections } from '../types/tvCollections'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL

interface TvCollectionsApiResponse {
  status: 'success'
  collections: TvCollections
}

interface ApiErrorResponse {
  status?: string
  message?: string
}

export async function getTvCollections(
  signal?: AbortSignal,
): Promise<TvCollections> {
  const response = await fetch(
    `${API_BASE_URL}/api/collections/tv`,
    {
      signal,
    },
  )

  const data = (await response.json()) as
    | TvCollectionsApiResponse
    | ApiErrorResponse

  if (!response.ok) {
    const message =
      'message' in data && data.message
        ? data.message
        : 'TV collections request failed.'

    throw new Error(message)
  }

  return (
    data as TvCollectionsApiResponse
  ).collections
}