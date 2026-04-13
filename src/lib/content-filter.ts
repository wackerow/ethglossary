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
} from "./glossary-data"

interface MatchInfo {
  entryId: string
  forms: Set<string>
  count: number
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

  // Sort by occurrence count descending
  results.sort((a, b) => b.occurrences - a.occurrences)

  return results
}
