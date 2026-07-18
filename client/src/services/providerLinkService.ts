import type { ProviderLink } from '../types/providerLink'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface ProviderLinksApiResponse {
  status: string
  mediaType: string
  tmdbId: number
  count: number
  results: ProviderLink[]
}

interface ApiErrorResponse {
  status?: string
  message?: string
}

export async function getProviderLinksByMedia(
  mediaType: string | undefined,
  tmdbId: string | undefined,
  signal?: AbortSignal,
): Promise<ProviderLink[]> {
  if (!mediaType || !tmdbId) {
    return [];
  }

  const response = await fetch(
    `${API_BASE_URL}/api/links/${encodeURIComponent(mediaType)}/${encodeURIComponent(tmdbId)}`,
    {
      signal,
    },
  );

  const data:
    | ProviderLinksApiResponse
    | ApiErrorResponse = await response.json();

  if (!response.ok) {
    const message =
      "message" in data && data.message
        ? data.message
        : "Provider-links request failed.";

    throw new Error(message);
  }

  return (
    data as ProviderLinksApiResponse
  ).results;
}