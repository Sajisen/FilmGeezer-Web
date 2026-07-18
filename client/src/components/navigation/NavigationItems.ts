export interface NavigationItem {
  label: string
  to: string
  end?: boolean
}

export const primaryNavigation: NavigationItem[] = [
  { label: 'Home', to: '/', end: true },
  { label: 'Movies', to: '/movies' },
  { label: 'TV Series', to: '/tv' },
  { label: 'Anime', to: '/anime' },
  { label: 'K-Drama', to: '/k-drama' },
]

export const secondaryNavigation: NavigationItem[] = [
  { label: 'Help', to: '/help' },
  { label: 'Contact', to: '/contact' },
]