/**
 * Content filtering -- extract glossary terms from source text.
 *
 * Port of filterGlossaryForSource logic from the translation pipeline.
 * Strips non-translatable elements before matching.
 */

import {
  getSurfaceFormIndex,
  getMatchPattern,
  getTerms,
  loadTranslations,
  type GlossaryTerm,
} from "./glossary-data"

interface MatchInfo {
  entryId: string
  forms: Set<string>
  count: number
}

// Programmatic identifier families that follow a uniform format and are
// always kept in Latin script across all languages. The PARENT entry on
// the master glossary carries the rule (note field); the filter matches
// any instance (ERC-20, ERC-4337, EIP-1559, EIP-7702, BIP-39, ...) and
// emits the surface form with an always-Latin translation.
//
// Adding a new family: append to STANDARD_PATTERNS. Do NOT add instance
// entries to the master glossary; that defeats the DRY rule.
interface StandardPattern {
  family: string
  regex: RegExp
  parentTermKey: string
  normalize: (raw: string) => string
}

const STANDARD_PATTERNS: StandardPattern[] = [
  {
    family: "ERC",
    regex: /\bERC[-\s]?(\d+)\b/gi,
    parentTermKey: "ethereum request for comments (erc)",
    normalize: (raw) => `ERC-${raw.match(/\d+/)![0]}`,
  },
  {
    family: "EIP",
    regex: /\bEIP[-\s]?(\d+)\b/gi,
    parentTermKey: "ethereum improvement proposal (eip)",
    normalize: (raw) => `EIP-${raw.match(/\d+/)![0]}`,
  },
]

interface PatternMatchInfo {
  surface: string
  parentTermKey: string
  count: number
}

function findStandardPatternMatches(text: string): Map<string, PatternMatchInfo> {
  const matches = new Map<string, PatternMatchInfo>()
  for (const p of STANDARD_PATTERNS) {
    p.regex.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = p.regex.exec(text)) !== null) {
      const surface = p.normalize(m[0])
      const existing = matches.get(surface)
      if (existing) {
        existing.count++
      } else {
        matches.set(surface, {
          surface,
          parentTermKey: p.parentTermKey,
          count: 1,
        })
      }
    }
  }
  return matches
}

function extractMarkdownText(content: string): string {
  let text = content

  // Strip frontmatter
  text = text.replace(/^---[\s\S]*?---\n?/, "")

  // Strip code fences
  text = text.replace(/```[\s\S]*?```/g, " ")

  // Strip inline code
  text = text.replace(/`[^`]+`/g, " ")

  // Strip HTML/JSX tags but keep text content
  text = text.replace(/<[^>]+>/g, " ")

  // Extract link text, strip URLs
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")

  // Strip image references
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")

  // Strip heading anchor IDs
  text = text.replace(/\{#[^}]+\}/g, "")

  return text
}

function extractJsonValues(content: string): string {
  try {
    const parsed = JSON.parse(content)
    const values: string[] = []

    function walk(obj: unknown) {
      if (typeof obj === "string") {
        values.push(obj)
      } else if (Array.isArray(obj)) {
        obj.forEach(walk)
      } else if (obj && typeof obj === "object") {
        Object.values(obj).forEach(walk)
      }
    }

    walk(parsed)
    return values.join(" ")
  } catch {
    return content
  }
}

export function extractSourceText(
  content: string,
  fileType: "markdown" | "json"
): string {
  return fileType === "json"
    ? extractJsonValues(content)
    : extractMarkdownText(content)
}

function findMatches(text: string): Map<string, MatchInfo> {
  const index = getSurfaceFormIndex()
  const pattern = getMatchPattern()
  const matches = new Map<string, MatchInfo>()

  pattern.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const surfaceForm = match[1].toLowerCase()
    const entryId = index.get(surfaceForm)

    if (entryId) {
      const existing = matches.get(entryId)
      if (existing) {
        existing.forms.add(surfaceForm)
        existing.count++
      } else {
        matches.set(entryId, {
          entryId,
          forms: new Set([surfaceForm]),
          count: 1,
        })
      }
    }
  }

  return matches
}

export interface FilteredTerm {
  english: string
  translation: string
  note?: string
  example?: string
  occurrences: number
}

export async function filterForContent(
  content: string,
  fileType: "markdown" | "json",
  lang: string,
  includeExamples: boolean
): Promise<FilteredTerm[]> {
  const text = extractSourceText(content, fileType)
  const matches = findMatches(text)
  const patternMatches = findStandardPatternMatches(text)
  const terms = getTerms()
  const translations = await loadTranslations(lang)

  const results: FilteredTerm[] = []

  for (const [entryId, matchInfo] of matches) {
    const term = terms[entryId]
    if (!term) continue

    const translation = translations[entryId]

    const entry: FilteredTerm = {
      english: term.term,
      translation: translation?.term ?? "",
      occurrences: matchInfo.count,
    }

    const note = translation?.notes ?? term.translation_note
    if (note) entry.note = note

    if (
      includeExamples &&
      matchInfo.count >= 2 &&
      translation?.contexts?.prose?.example
    ) {
      entry.example = translation.contexts.prose.example
    }

    results.push(entry)
  }

  // Pattern matches: ERC-N, EIP-N, etc. Always-Latin across all languages;
  // translation === english by design. The note is sourced from the parent
  // entry that documents the family rule.
  for (const { surface, parentTermKey, count } of patternMatches.values()) {
    const parent = terms[parentTermKey] as GlossaryTerm | undefined
    const entry: FilteredTerm = {
      english: surface,
      translation: surface,
      occurrences: count,
    }
    const note = parent?.translation_note ?? parent?.note
    if (note) entry.note = note
    results.push(entry)
  }

  // Sort by occurrence count descending
  results.sort((a, b) => b.occurrences - a.occurrences)

  return results
}
