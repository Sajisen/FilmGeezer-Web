import type { HomeCollections } from '../types/home'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface HomeApiResponse {
  status: 'success'
  collections: HomeCollections
}

interface ApiErrorResponse {
  status?: string
  message?: string
}

export async function getHomeCollections(
  signal?: AbortSignal,
): Promise<HomeCollections> {
  const response = await fetch(`${API_BASE_URL}/api/home`, {
    signal,
  })

  const data = (await response.json()) as
    | HomeApiResponse
    | ApiErrorResponse

  if (!response.ok) {
    const message =
      'message' in data && data.message
        ? data.message
        : 'Home collections request failed.'

    throw new Error(message)
  }

  return (data as HomeApiResponse).collections
}