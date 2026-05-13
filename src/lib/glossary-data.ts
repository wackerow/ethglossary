/**
 * Glossary data loading and indexing.
 *
 * Loads JSON data at module scope (Workers bundle). Builds lookup
 * indexes for term resolution and content filtering.
 */

import termsData from "../data/glossary-terms-enhanced.json"

// Types derived from the JSON structure
export interface GlossaryTerm {
  id: string
  term: string
  category: string
  term_role?: string
  definition: string
  has_tooltip: boolean
  in_glossary: boolean
  content_occurrences: number
  forms: { base: string }
  script_rule: string
  casing: string
  aliases?: Array<string | { term: string; status: string; note?: string }>
  avoid?: string[]
  note?: string
  translation_note?: string
}

export interface TranslationEntry {
  term: string
  contexts?: {
    prose?: { term: string; example?: string }
    heading?: { term: string }
    tag?: { term: string }
    ui?: { term: string }
    code?: { term: string }
  }
  plurals?: {
    one: string | null
    two?: string | null
    few?: string | null
    many?: string | null
    other: string | null
  }
  grammar?: {
    gender?: string
    part_of_speech?: string
    formality?: string
  }
  confidence?: string
  notes?: string
}

// Load confirmed terms from the glossary data
const glossary = termsData as {
  metadata: { total_confirmed: number }
  confirmed_terms: Record<string, GlossaryTerm>
}

const confirmedTerms = glossary.confirmed_terms

// Build lookup index: lowercase surface form -> entry ID
const surfaceFormIndex = new Map<string, string>()

for (const [key, entry] of Object.entries(confirmedTerms)) {
  // Index the term itself
  surfaceFormIndex.set(entry.term.toLowerCase(), key)

  // Index the base form
  if (entry.forms?.base) {
    surfaceFormIndex.set(entry.forms.base.toLowerCase(), key)
  }

  // Index aliases (handles both object and string forms)
  if (entry.aliases) {
    for (const alias of entry.aliases) {
      const aliasStr = typeof alias === "string" ? alias : alias.term
      if (aliasStr) surfaceFormIndex.set(aliasStr.toLowerCase(), key)
    }
  }

  // Index avoid forms (so "on-chain" resolves to "onchain")
  if (entry.avoid) {
    for (const avoidForm of entry.avoid) {
      surfaceFormIndex.set(avoidForm.toLowerCase(), key)
    }
  }
}

// Build regex pattern for content matching (longest first)
const allForms = Array.from(surfaceFormIndex.keys())
allForms.sort((a, b) => b.length - a.length)
const escaped = allForms.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
const matchPattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi")

// Translation cache
const translationCache = new Map<string, Record<string, TranslationEntry>>()

export function getTerms(): Record<string, GlossaryTerm> {
  return confirmedTerms
}

export function getTermCount(): number {
  return Object.keys(confirmedTerms).length
}

export function getTermById(id: string): GlossaryTerm | undefined {
  return confirmedTerms[id]
}

export function resolveTerm(query: string): GlossaryTerm | undefined {
  const key = surfaceFormIndex.get(query.toLowerCase())
  if (key) return confirmedTerms[key]
  return undefined
}

export function getSurfaceFormIndex(): Map<string, string> {
  return surfaceFormIndex
}

export function getMatchPattern(): RegExp {
  return matchPattern
}

export async function loadTranslations(
  lang: string
): Promise<Record<string, TranslationEntry>> {
  if (translationCache.has(lang)) {
    return translationCache.get(lang)!
  }

  try {
    // Dynamic import for translation files
    const mod = await import(`../data/translations/glossary-${lang}.json`)
    const translations = mod.default as Record<string, TranslationEntry>
    translationCache.set(lang, translations)
    return translations
  } catch {
    return {}
  }
}

export const SUPPORTED_LANGUAGES = [
  "ar",
  "bn",
  "cs",
  "de",
  "es",
  "fr",
  "hi",
  "id",
  "it",
  "ja",
  "ko",
  "mr",
  "pl",
  "pt-br",
  "ru",
  "sw",
  "ta",
  "te",
  "tr",
  "uk",
  "ur",
  "vi",
  "zh",
  "zh-tw",
]
