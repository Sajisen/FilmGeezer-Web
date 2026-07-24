import type {
  ProviderLink,
  ProviderLinkGroup,
  ProviderLinksPayload,
} from "../types/providerLink";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ApiErrorResponse {
  status?: string;
  message?: string;
}

function isProviderLink(value: unknown): value is ProviderLink {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const link = value as Record<string, unknown>;

  return (
    typeof link.id === "string" &&
    typeof link.label === "string" &&
    typeof link.url === "string" &&
    typeof link.isMain === "boolean"
  );
}

function isProviderLinkGroup(value: unknown): value is ProviderLinkGroup {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const group = value as Record<string, unknown>;

  return (
    typeof group.id === "string" &&
    typeof group.label === "string" &&
    Array.isArray(group.links) &&
    group.links.every(isProviderLink)
  );
}

function isProviderLinksPayload(value: unknown): value is ProviderLinksPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    payload.status === "success" &&
    typeof payload.available === "boolean" &&
    (payload.mediaType === "movie" || payload.mediaType === "tv") &&
    typeof payload.tmdbId === "number" &&
    (payload.kind === "movie" ||
      payload.kind === "series" ||
      payload.kind === null) &&
    Array.isArray(payload.groups) &&
    payload.groups.every(isProviderLinkGroup)
  );
}

export async function getProviderLinksByMedia(
  mediaType: string | undefined,
  tmdbId: string | undefined,
  signal?: AbortSignal,
): Promise<ProviderLinksPayload> {
  if (!mediaType || !tmdbId) {
    throw new Error("Media type and TMDB ID are required.");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/links/${encodeURIComponent(mediaType)}/${encodeURIComponent(tmdbId)}`,
    {
      signal,
      cache: "no-store",
    },
  );

  const data: unknown = await response.json();

  if (!response.ok) {
    const errorData = data as ApiErrorResponse;

    throw new Error(
      errorData.message || "FilmGeezer links request failed.",
    );
  }

  if (!isProviderLinksPayload(data)) {
    throw new Error("FilmGeezer links response was invalid.");
  }

  return data;
}