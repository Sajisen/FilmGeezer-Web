import type { ProviderLink } from '../types/providerLink.js'

export const mockProviderLinks: ProviderLink[] = [
  {
    linkId: 'link_bb_01',
    tmdbId: 1396,
    mediaType: 'tv',
    providerName: 'Provider A',
    label: 'Breaking Bad Complete Series',
    quality: '1080p',
    language: 'English',
    url: 'https://example.com/breaking-bad',
  },
  {
    linkId: 'link_bb_02',
    tmdbId: 1396,
    mediaType: 'tv',
    providerName: 'Provider B',
    label: 'Breaking Bad Season Collection',
    quality: '720p',
    language: 'English',
    url: 'https://example.com/breaking-bad-collection',
  },
  {
    linkId: 'link_interstellar_01',
    tmdbId: 157336,
    mediaType: 'movie',
    providerName: 'Provider A',
    label: 'Interstellar Movie Link',
    quality: '1080p',
    language: 'English',
    url: 'https://example.com/interstellar',
  },
  {
    linkId: 'link_aot_01',
    tmdbId: 1429,
    mediaType: 'tv',
    providerName: 'Anime Provider',
    label: 'Attack on Titan Episodes',
    quality: '1080p',
    language: 'Japanese',
    url: 'https://example.com/attack-on-titan',
  },
]