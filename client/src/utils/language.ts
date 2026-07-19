const languageNameOverrides: Record<
  string,
  string
> = {
  ar: 'Arabic',
  de: 'German',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  hi: 'Hindi',
  id: 'Indonesian',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  ml: 'Malayalam',
  pt: 'Portuguese',
  ru: 'Russian',
  ta: 'Tamil',
  te: 'Telugu',
  th: 'Thai',
  tr: 'Turkish',
  uk: 'Ukrainian',
  vi: 'Vietnamese',
  zh: 'Chinese',
}

let languageDisplayNames:
  | Intl.DisplayNames
  | null = null

export function getLanguageName(
  languageCode: string,
) {
  const normalizedCode =
    languageCode.trim().toLowerCase()

  if (!normalizedCode) {
    return 'Language unavailable'
  }

  const override =
    languageNameOverrides[
      normalizedCode
    ]

  if (override) {
    return override
  }

  try {
    languageDisplayNames ??=
      new Intl.DisplayNames(['en'], {
        type: 'language',
      })

    return (
      languageDisplayNames.of(
        normalizedCode,
      ) ?? 'Language unavailable'
    )
  } catch {
    return 'Language unavailable'
  }
}