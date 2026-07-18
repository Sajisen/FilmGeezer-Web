import type { MediaType } from './media'

export interface ProviderLink {
  linkId: string
  tmdbId: number
  mediaType: MediaType
  providerName: string
  label: string
  quality: string
  language: string
  url: string
}