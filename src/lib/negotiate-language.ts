/**
 * Picking a language for a first-time visitor to /translate.
 *
 * Order of preference:
 *   1. The cookie, if they have already chosen.
 *   2. Accept-Language, if the browser asks for something we serve.
 *   3. Nothing -- send them to the chooser rather than guessing.
 *
 * Step 3 matters. English is the source language, not a translation target,
 * so an en-US browser has no "their" language here and any pick we make is
 * arbitrary. The language grid is a better answer than dropping someone into
 * Spanish because it sorts first.
 */

import { SUPPORTED_LANGUAGES } from "./glossary-data"
import { LANG_COOKIE } from "./constants"

/**
 * BCP-47 tags that do not map to our codes by simple lowercasing.
 * Everything else matches on the full tag or its primary subtag.
 */
const TAG_ALIASES: Record<string, string> = {
  "pt-br": "pt-br",
  "pt-pt": "pt-br", // the only Portuguese we carry
  pt: "pt-br",
  "zh-tw": "zh-tw",
  "zh-hk": "zh-tw",
  "zh-hant": "zh-tw",
  "zh-cn": "zh",
  "zh-hans": "zh",
  zh: "zh",
  "nb-no": "", // explicitly unsupported; avoids matching "nb" to nothing odd
}

function normalize(tag: string): string | undefined {
  const lower = tag.trim().toLowerCase()
  if (!lower) return undefined

  if (lower in TAG_ALIASES) {
    const mapped = TAG_ALIASES[lower]
    return mapped && SUPPORTED_LANGUAGES.includes(mapped) ? mapped : undefined
  }

  if (SUPPORTED_LANGUAGES.includes(lower)) return lower

  // fr-CA -> fr
  const primary = lower.split("-")[0]
  if (primary in TAG_ALIASES) {
    const mapped = TAG_ALIASES[primary]
    return mapped && SUPPORTED_LANGUAGES.includes(mapped) ? mapped : undefined
  }
  return SUPPORTED_LANGUAGES.includes(primary) ? primary : undefined
}

/** The stored choice, if it names a language we serve. */
export function languageFromCookie(cookieHeader?: string): string | undefined {
  const raw = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]+)`))?.[1]
  if (!raw) return undefined
  const value = decodeURIComponent(raw)
  return SUPPORTED_LANGUAGES.includes(value) ? value : undefined
}

/**
 * Highest-weighted supported language in an Accept-Language header.
 * Entries are sorted by q-value, defaulting to 1, and "*" is ignored.
 */
export function languageFromAcceptHeader(header?: string): string | undefined {
  if (!header) return undefined

  const candidates = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.split(";").map((p) => p.trim())
      const q = params
        .map((p) => p.match(/^q=([\d.]+)$/i)?.[1])
        .find(Boolean)
      return { tag, q: q === undefined ? 1 : Number.parseFloat(q) }
    })
    .filter((c) => c.tag && c.tag !== "*" && Number.isFinite(c.q) && c.q > 0)
    .sort((a, b) => b.q - a.q)

  for (const { tag } of candidates) {
    const match = normalize(tag)
    if (match) return match
  }
  return undefined
}

/**
 * Where /translate should send this request, or undefined to show the chooser.
 */
export function resolveLanguage(
  cookieHeader?: string,
  acceptLanguage?: string
): string | undefined {
  return languageFromCookie(cookieHeader) ?? languageFromAcceptHeader(acceptLanguage)
}
