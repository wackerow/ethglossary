/**
 * Presentation metadata for the 24 supported languages.
 *
 * The API's /languages endpoint returns code + English name + completion
 * stats. The viewer additionally needs the endonym (the language's own name
 * for itself), where it is spoken, and its script direction. That is
 * presentation data, so it lives here rather than in the public API contract.
 *
 * The canonical language list is SUPPORTED_LANGUAGES in lib/glossary-data.ts.
 * This map must stay in sync with it -- `assertLanguageMetaComplete()` is
 * called at module load so a mismatch fails fast rather than rendering a gap.
 */

import { SUPPORTED_LANGUAGES } from "./glossary-data"

export interface LanguageMeta {
  /** The language's name for itself. */
  endonym: string
  /** English name -- mirrors LANGUAGE_NAMES in routes/translations.ts. */
  name: string
  /** Where it is spoken, as shown on the language cards. */
  regions: string
  /** Writing direction; drives `dir` on translated text. */
  dir: "ltr" | "rtl"
  /** True when the language does not mark plurals grammatically. */
  noPlurals?: boolean
  /**
   * True when the language is written in Latin script, which makes
   * transliteration a no-op: a `transliterate` term renders identically to
   * the English. The list is the one in docs/translation-policy.md.
   */
  latinScript?: boolean
}

export const LANGUAGE_META: Record<string, LanguageMeta> = {
  ar: { endonym: "العربية", name: "Arabic", regions: "Middle East, North Africa", dir: "rtl" },
  bn: { endonym: "বাংলা", name: "Bengali", regions: "Bangladesh, India", dir: "ltr" },
  cs: { endonym: "Čeština", name: "Czech", regions: "Czech Republic", latinScript: true, dir: "ltr" },
  de: { endonym: "Deutsch", name: "German", regions: "Germany, Austria, Switzerland", latinScript: true, dir: "ltr" },
  es: { endonym: "Español", name: "Spanish", regions: "Spain, Latin America", latinScript: true, dir: "ltr" },
  fr: { endonym: "Français", name: "French", regions: "France, Canada, Belgium, Switzerland", latinScript: true, dir: "ltr" },
  hi: { endonym: "हिन्दी", name: "Hindi", regions: "India", dir: "ltr" },
  id: { endonym: "Bahasa Indonesia", name: "Indonesian", regions: "Indonesia", latinScript: true, dir: "ltr", noPlurals: true },
  it: { endonym: "Italiano", name: "Italian", regions: "Italy, Switzerland", latinScript: true, dir: "ltr" },
  ja: { endonym: "日本語", name: "Japanese", regions: "Japan", dir: "ltr", noPlurals: true },
  ko: { endonym: "한국어", name: "Korean", regions: "South Korea", dir: "ltr", noPlurals: true },
  mr: { endonym: "मराठी", name: "Marathi", regions: "India (Maharashtra)", dir: "ltr" },
  pl: { endonym: "Polski", name: "Polish", regions: "Poland", latinScript: true, dir: "ltr" },
  "pt-br": { endonym: "Português", name: "Portuguese (Brazil)", regions: "Brazil", latinScript: true, dir: "ltr" },
  ru: { endonym: "Русский", name: "Russian", regions: "Russia, Central Asia", dir: "ltr" },
  sw: { endonym: "Kiswahili", name: "Swahili", regions: "Kenya, Tanzania, Uganda", latinScript: true, dir: "ltr" },
  ta: { endonym: "தமிழ்", name: "Tamil", regions: "India, Sri Lanka, Singapore", dir: "ltr" },
  te: { endonym: "తెలుగు", name: "Telugu", regions: "India (Andhra Pradesh, Telangana)", dir: "ltr" },
  tr: { endonym: "Türkçe", name: "Turkish", regions: "Türkiye, Cyprus", latinScript: true, dir: "ltr" },
  uk: { endonym: "Українська", name: "Ukrainian", regions: "Ukraine", dir: "ltr" },
  ur: { endonym: "اردو", name: "Urdu", regions: "Pakistan, India", dir: "rtl" },
  vi: { endonym: "Tiếng Việt", name: "Vietnamese", regions: "Vietnam", latinScript: true, dir: "ltr", noPlurals: true },
  zh: { endonym: "简体中文", name: "Chinese (Simplified)", regions: "China, Singapore", dir: "ltr", noPlurals: true },
  "zh-tw": { endonym: "繁體中文", name: "Chinese (Traditional)", regions: "Taiwan, Hong Kong", dir: "ltr", noPlurals: true },
}

/**
 * Fails at module load if the metadata map and the canonical language list
 * have drifted apart. Cheap insurance -- the alternative is a blank card.
 */
function assertLanguageMetaComplete(): void {
  const missing = SUPPORTED_LANGUAGES.filter((code) => !LANGUAGE_META[code])
  const extra = Object.keys(LANGUAGE_META).filter(
    (code) => !SUPPORTED_LANGUAGES.includes(code)
  )

  if (missing.length || extra.length) {
    throw new Error(
      `language-meta.ts is out of sync with SUPPORTED_LANGUAGES` +
        (missing.length ? ` -- missing: ${missing.join(", ")}` : "") +
        (extra.length ? ` -- unknown: ${extra.join(", ")}` : "")
    )
  }
}

assertLanguageMetaComplete()

export function getLanguageMeta(code: string): LanguageMeta | undefined {
  return LANGUAGE_META[code]
}

/** Languages in endonym order, which is how the language grid renders them. */
export function listLanguages(): Array<LanguageMeta & { code: string }> {
  return SUPPORTED_LANGUAGES.map((code) => ({ code, ...LANGUAGE_META[code] }))
}
