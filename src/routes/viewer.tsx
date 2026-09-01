/**
 * Viewer routes -- the human-facing site.
 *
 * Replaces the single inline-HTML template with server-rendered hono/jsx
 * pages. Everything here reads the bundled glossary directly rather than
 * fetching its own API, which saves a request hop and keeps the pages
 * renderable even if the API surface changes shape.
 */

import { OpenAPIHono } from "@hono/zod-openapi"

import { STYLESHEET } from "../ui/styles"
import { HomePage } from "../ui/pages/home"
import { TranslatePage } from "../ui/pages/translate"
import type { TermListItem } from "../ui/pages/translate"
import { ContextsPage } from "../ui/pages/contexts"
import { LanguagesPage } from "../ui/pages/languages"
import type { LanguageStat } from "../ui/pages/languages"
import { StyleGuidePage, TermDetailPage } from "../ui/pages/style-guide"
import {
  getTerms,
  getTermCount,
  loadTranslations,
  resolveTerm,
  SUPPORTED_LANGUAGES,
} from "../lib/glossary-data"
import { getLanguageMeta } from "../lib/language-meta"

const app = new OpenAPIHono()

const DEFAULT_LANG = "es"

/** Master terms sorted for display, with their canonical key kept alongside. */
function sortedTerms() {
  return Object.entries(getTerms())
    .map(([key, term]) => ({ key, ...term }))
    .sort((a, b) => a.term.localeCompare(b.term))
}

// ---------------------------------------------------------------- assets

app.get("/assets/app.css", (c) => {
  c.header("Content-Type", "text/css; charset=utf-8")
  c.header("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
  return c.body(STYLESHEET)
})

// ---------------------------------------------------------------- pages

app.get("/", (c) => c.html(<HomePage />))

app.get("/contexts", (c) => c.html(<ContextsPage />))

app.get("/languages", async (c) => {
  const totalTerms = getTermCount()
  const masterKeys = new Set(Object.keys(getTerms()))

  const stats: LanguageStat[] = await Promise.all(
    SUPPORTED_LANGUAGES.map(async (code) => {
      const translations = await loadTranslations(code)
      const validKeys = Object.keys(translations).filter((k) => masterKeys.has(k))
      const confidenceBreakdown = { high: 0, medium: 0, low: 0 }

      for (const key of validKeys) {
        const conf = translations[key].confidence ?? "high"
        if (conf in confidenceBreakdown) {
          confidenceBreakdown[conf as keyof typeof confidenceBreakdown]++
        }
      }

      return {
        code,
        translatedTerms: validKeys.length,
        totalTerms,
        completionPercent: Math.round((validKeys.length / totalTerms) * 100),
        confidenceBreakdown,
      }
    })
  )

  return c.html(<LanguagesPage stats={stats} />)
})

app.get("/style-guide", (c) => {
  const category = c.req.query("category")
  const all = sortedTerms()
  const categories = Array.from(new Set(all.map((t) => t.category))).sort()
  const terms = category ? all.filter((t) => t.category === category) : all

  return c.html(
    <StyleGuidePage terms={terms} categories={categories} activeCategory={category} />
  )
})

app.get("/style-guide/:termId", (c) => {
  const term = resolveTerm(c.req.param("termId"))
  if (!term) return c.notFound()
  return c.html(<TermDetailPage term={term} />)
})

app.get("/translate", (c) => c.redirect(`/translate/${DEFAULT_LANG}`, 302))

app.get("/translate/:lang", async (c) => {
  const lang = c.req.param("lang")
  if (!getLanguageMeta(lang)) return c.notFound()

  const terms = await buildTermList(lang)
  return c.html(<TranslatePage lang={lang} terms={terms} />)
})

app.get("/translate/:lang/:termId", async (c) => {
  const lang = c.req.param("lang")
  if (!getLanguageMeta(lang)) return c.notFound()

  const term = resolveTerm(c.req.param("termId"))
  if (!term) return c.notFound()

  // Translation files are keyed by canonical term name, never by the id slug.
  const master = getTerms()
  const key = Object.keys(master).find((k) => master[k].id === term.id)
  if (!key) return c.notFound()

  const translations = await loadTranslations(lang)
  const terms = await buildTermList(lang)

  const index = terms.findIndex((t) => t.key === key)
  const nextTermId = index >= 0 && index < terms.length - 1 ? terms[index + 1].id : undefined

  return c.html(
    <TranslatePage
      lang={lang}
      terms={terms}
      selected={{ key, term, translation: translations[key] }}
      nextTermId={nextTermId}
    />
  )
})

/**
 * The sidebar list for one language.
 *
 * Progress is uniformly "none" until votes exist (Phase 3). The shape is in
 * place so wiring it up later is a data change, not a template change.
 */
async function buildTermList(lang: string): Promise<TermListItem[]> {
  const translations = await loadTranslations(lang)

  return sortedTerms()
    .filter((t) => translations[t.key])
    .map((t) => ({
      key: t.key,
      id: t.id,
      term: t.term,
      progress: "none" as const,
    }))
}

export default app
