import type { KDramaCollections } from '../types/kDramaCollections'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL

interface KDramaCollectionsApiResponse {
  status: 'success'
  collections: KDramaCollections
}

interface ApiErrorResponse {
  status?: string
  message?: string
}

export async function getKDramaCollections(
  signal?: AbortSignal,
): Promise<KDramaCollections> {
  const response = await fetch(
    `${API_BASE_URL}/api/collections/k-drama`,
    {
      signal,
    },
  )

  const data = (await response.json()) as
    | KDramaCollectionsApiResponse
    | ApiErrorResponse

  if (!response.ok) {
    const message =
      'message' in data && data.message
        ? data.message
        : 'K-Drama collections request failed.'

    throw new Error(message)
  }

  return (
    data as KDramaCollectionsApiResponse
  ).collections
}