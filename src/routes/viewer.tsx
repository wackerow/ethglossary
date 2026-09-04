/**
 * Viewer routes -- the human-facing site.
 *
 * Replaces the single inline-HTML template with server-rendered hono/jsx
 * pages. Everything here reads the bundled glossary directly rather than
 * fetching its own API, which saves a request hop and keeps the pages
 * renderable even if the API surface changes shape.
 */

import { OpenAPIHono } from "@hono/zod-openapi"

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
import { needsReview } from "../lib/context-types"
import { languageFromCookie, resolveLanguage } from "../lib/negotiate-language"
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE } from "../lib/constants"
import ethglossaryMark from "../ui/icons/ethglossary.svg"

const app = new OpenAPIHono()

/**
 * Remember the language a reviewer is actually looking at, so /translate and
 * the next visit land there. Set on the page rather than by a picker script,
 * because reaching a language is now a plain link from the Languages tab.
 */
function rememberLanguage(c: { header: (k: string, v: string) => void }, lang: string) {
  c.header(
    "Set-Cookie",
    `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE}; SameSite=Lax`
  )
}

/** The language on the nav's Translate tab, if one has been chosen. */
const navLang = (c: { req: { header: (k: string) => string | undefined } }) =>
  languageFromCookie(c.req.header("Cookie"))

/** Master terms sorted for display, with their canonical key kept alongside. */
function sortedTerms() {
  return Object.entries(getTerms())
    .map(([key, term]) => ({ key, ...term }))
    .sort((a, b) => a.term.localeCompare(b.term))
}

// The stylesheet is a build artifact served from public/assets by the
// Workers assets binding, not a route -- see scripts in package.json.

// The favicon is the same vector file the nav renders, served rather than
// copied into public/ so there is one source of truth for the mark.
app.get("/favicon.svg", (c) => {
  c.header("Content-Type", "image/svg+xml; charset=utf-8")
  c.header("Cache-Control", "public, max-age=604800, immutable")
  return c.body(ethglossaryMark)
})

// ---------------------------------------------------------------- pages

app.get("/", (c) => c.html(<HomePage activeLang={navLang(c)} />))

app.get("/contexts", (c) => c.html(<ContextsPage activeLang={navLang(c)} />))

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

  const notice =
    c.req.query("changed") === "1"
      ? "changed"
      : c.req.query("choose") === "1"
        ? "choose"
        : undefined

  return c.html(<LanguagesPage stats={stats} notice={notice} activeLang={navLang(c)} />)
})

app.get("/style-guide", (c) => {
  const category = c.req.query("category")
  const all = sortedTerms()
  const categories = Array.from(new Set(all.map((t) => t.category))).sort()
  const terms = category ? all.filter((t) => t.category === category) : all

  return c.html(
    <StyleGuidePage
      terms={terms}
      categories={categories}
      activeCategory={category}
      activeLang={navLang(c)}
    />
  )
})

app.get("/style-guide/:termId", (c) => {
  const term = resolveTerm(c.req.param("termId"))
  if (!term) return c.notFound()
  return c.html(<TermDetailPage term={term} activeLang={navLang(c)} />)
})

app.get("/translate", (c) => {
  // Only an explicit prior choice counts; otherwise pick one. The query flag
  // is what lets /languages explain why it is showing, instead of looking
  // like the Translate tab did nothing.
  const lang = resolveLanguage(c.req.header("Cookie"))
  return c.redirect(lang ? `/translate/${lang}` : "/languages?choose=1", 302)
})

/** Forget the stored language and go back to the chooser. */
app.get("/translate/change", (c) => {
  c.header("Set-Cookie", `${LANG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`)
  return c.redirect("/languages?changed=1", 302)
})

app.get("/translate/:lang", async (c) => {
  const lang = c.req.param("lang")
  if (!getLanguageMeta(lang)) return c.notFound()

  const showAll = c.req.query("all") === "1"
  const { terms, hidden } = await buildTermList(lang, showAll)
  rememberLanguage(c, lang)
  return c.html(
    <TranslatePage lang={lang} terms={terms} hidden={hidden} showAll={showAll} />
  )
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
  const showAll = c.req.query("all") === "1"
  const { terms, hidden } = await buildTermList(lang, showAll)

  rememberLanguage(c, lang)

  const index = terms.findIndex((t) => t.key === key)
  const nextTermId = index >= 0 && index < terms.length - 1 ? terms[index + 1].id : undefined

  return c.html(
    <TranslatePage
      lang={lang}
      terms={terms}
      selected={{ key, term, translation: translations[key] }}
      nextTermId={nextTermId}
      hidden={hidden}
      showAll={showAll}
    />
  )
})

/**
 * The sidebar list for one language.
 *
 * Terms with nothing to decide in this language are held back by default --
 * see needsReview() -- and `hidden` reports how many, so the UI can offer
 * them rather than pretending they do not exist.
 *
 * Progress is uniformly "none" until votes exist (Phase 3). The shape is in
 * place so wiring it up later is a data change, not a template change.
 */
async function buildTermList(
  lang: string,
  showAll: boolean
): Promise<{ terms: TermListItem[]; hidden: number }> {
  const translations = await loadTranslations(lang)
  const isLatin = Boolean(getLanguageMeta(lang)?.latinScript)

  const available = sortedTerms().filter((t) => translations[t.key])
  const reviewable = available.filter((t) => needsReview(t, isLatin))

  const chosen = showAll ? available : reviewable

  return {
    terms: chosen.map((t) => ({
      key: t.key,
      id: t.id,
      term: t.term,
      progress: "none" as const,
    })),
    hidden: available.length - reviewable.length,
  }
}

export default app
