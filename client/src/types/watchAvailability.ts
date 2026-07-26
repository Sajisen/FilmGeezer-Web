export interface WatchProviderItem {
  providerId: number
  name: string
  logoUrl: string
}

export interface WatchAvailability {
  region: string
  link: string
  stream: WatchProviderItem[]
  rent: WatchProviderItem[]
  buy: WatchProviderItem[]
}