import type { MediaType } from './media.js'

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