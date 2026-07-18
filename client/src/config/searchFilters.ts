import type { SearchScope } from '../types/media'

export interface FilterOption {
  label: string
  value: string
}

export const movieGenreOptions: FilterOption[] = [
  { label: 'Action', value: 'Action' },
  { label: 'Adventure', value: 'Adventure' },
  { label: 'Animation', value: 'Animation' },
  { label: 'Comedy', value: 'Comedy' },
  { label: 'Crime', value: 'Crime' },
  { label: 'Documentary', value: 'Documentary' },
  { label: 'Drama', value: 'Drama' },
  { label: 'Family', value: 'Family' },
  { label: 'Fantasy', value: 'Fantasy' },
  { label: 'History', value: 'History' },
  { label: 'Horror', value: 'Horror' },
  { label: 'Music', value: 'Music' },
  { label: 'Mystery', value: 'Mystery' },
  { label: 'Romance', value: 'Romance' },
  {
    label: 'Science Fiction',
    value: 'Science Fiction',
  },
  { label: 'TV Movie', value: 'TV Movie' },
  { label: 'Thriller', value: 'Thriller' },
  { label: 'War', value: 'War' },
  { label: 'Western', value: 'Western' },
]

export const tvGenreOptions: FilterOption[] = [
  {
    label: 'Action & Adventure',
    value: 'Action & Adventure',
  },
  { label: 'Animation', value: 'Animation' },
  { label: 'Comedy', value: 'Comedy' },
  { label: 'Crime', value: 'Crime' },
  { label: 'Documentary', value: 'Documentary' },
  { label: 'Drama', value: 'Drama' },
  { label: 'Family', value: 'Family' },
  { label: 'Kids', value: 'Kids' },
  { label: 'Mystery', value: 'Mystery' },
  { label: 'News', value: 'News' },
  { label: 'Reality', value: 'Reality' },
  {
    label: 'Sci-Fi & Fantasy',
    value: 'Sci-Fi & Fantasy',
  },
  { label: 'Soap', value: 'Soap' },
  { label: 'Talk', value: 'Talk' },
  {
    label: 'War & Politics',
    value: 'War & Politics',
  },
  { label: 'Western', value: 'Western' },
]

const animeGenreOptions: FilterOption[] = [
  {
    label: 'Action — Movies',
    value: 'Action',
  },
  {
    label: 'Action & Adventure — Series',
    value: 'Action & Adventure',
  },
  {
    label: 'Adventure — Movies',
    value: 'Adventure',
  },
  {
    label: 'Comedy',
    value: 'Comedy',
  },
  {
    label: 'Drama',
    value: 'Drama',
  },
  {
    label: 'Family',
    value: 'Family',
  },
  {
    label: 'Fantasy — Movies',
    value: 'Fantasy',
  },
  {
    label: 'Horror — Movies',
    value: 'Horror',
  },
  {
    label: 'Mystery',
    value: 'Mystery',
  },
  {
    label: 'Romance — Movies',
    value: 'Romance',
  },
  {
    label: 'Science Fiction — Movies',
    value: 'Science Fiction',
  },
  {
    label: 'Sci-Fi & Fantasy — Series',
    value: 'Sci-Fi & Fantasy',
  },
  {
    label: 'Thriller — Movies',
    value: 'Thriller',
  },
]

const kDramaGenreOptions: FilterOption[] = [
  {
    label: 'Action — Movies',
    value: 'Action',
  },
  {
    label: 'Action & Adventure — Series',
    value: 'Action & Adventure',
  },
  {
    label: 'Comedy',
    value: 'Comedy',
  },
  {
    label: 'Crime',
    value: 'Crime',
  },
  {
    label: 'Drama',
    value: 'Drama',
  },
  {
    label: 'Family',
    value: 'Family',
  },
  {
    label: 'History — Movies',
    value: 'History',
  },
  {
    label: 'Mystery',
    value: 'Mystery',
  },
  {
    label: 'Romance — Movies',
    value: 'Romance',
  },
  {
    label: 'Thriller — Movies',
    value: 'Thriller',
  },
  {
    label: 'War & Politics — Series',
    value: 'War & Politics',
  },
]

const combinedGenreOptions = Array.from(
  new Map(
    [...movieGenreOptions, ...tvGenreOptions].map(
      (option) => [option.value, option],
    ),
  ).values(),
).sort((firstOption, secondOption) =>
  firstOption.label.localeCompare(
    secondOption.label,
  ),
)

export const languageOptions: FilterOption[] = [
  { label: 'English', value: 'en' },
  { label: 'Korean', value: 'ko' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Hindi', value: 'hi' },
  { label: 'Tamil', value: 'ta' },
  { label: 'Telugu', value: 'te' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Chinese', value: 'zh' },
]

export const ratingOptions: FilterOption[] = [
  { label: '7 or higher', value: '7' },
  { label: '8 or higher', value: '8' },
  { label: '8.5 or higher', value: '8.5' },
  { label: '9 or higher', value: '9' },
]

export function getGenreOptions(
  scope: SearchScope,
) {
  if (scope === 'movie') {
    return movieGenreOptions
  }

  if (scope === 'tv') {
    return tvGenreOptions
  }

  if (scope === 'anime') {
    return animeGenreOptions
  }

  if (scope === 'k-drama') {
    return kDramaGenreOptions
  }

  return combinedGenreOptions
}

export function supportsLanguageFilter(
  scope: SearchScope,
) {
  return (
    scope !== 'anime' &&
    scope !== 'k-drama'
  )
}

export function isGenreAllowed(
  scope: SearchScope,
  genre: string,
) {
  if (genre === 'all') {
    return true
  }

  return getGenreOptions(scope).some(
    (option) => option.value === genre,
  )
}

export function getLanguageLabel(
  language: string,
) {
  return (
    languageOptions.find(
      (option) => option.value === language,
    )?.label ?? language.toUpperCase()
  )
}