import { createRoute, OpenAPIHono } from "@hono/zod-openapi"
import { ErrorSchema, LangParamSchema, TermIdParamSchema } from "../schemas/common"
import {
  TranslationFileSchema,
  SingleTranslationSchema,
  LanguagesListSchema,
} from "../schemas/translations"
import {
  getTerms,
  getTermCount,
  resolveTerm,
  loadTranslations,
  SUPPORTED_LANGUAGES,
} from "../lib/glossary-data"
import { z } from "@hono/zod-openapi"

const app = new OpenAPIHono()

// Language names for the metadata endpoint
const LANGUAGE_NAMES: Record<string, string> = {
  ar: "Arabic",
  bn: "Bengali",
  cs: "Czech",
  de: "German",
  es: "Spanish",
  fr: "French",
  hi: "Hindi",
  id: "Indonesian",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  mr: "Marathi",
  pl: "Polish",
  "pt-br": "Portuguese (Brazil)",
  ru: "Russian",
  sw: "Swahili",
  ta: "Tamil",
  te: "Telugu",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  vi: "Vietnamese",
  zh: "Chinese (Simplified)",
  "zh-tw": "Chinese (Traditional)",
}

// GET /languages
const languagesRoute = createRoute({
  method: "get",
  path: "/languages",
  tags: ["Translations"],
  summary: "List supported languages with completion stats",
  responses: {
    200: {
      content: { "application/json": { schema: LanguagesListSchema } },
      description: "Supported languages",
    },
  },
})

app.openapi(languagesRoute, async (c) => {
  const totalTerms = getTermCount()
  const masterKeys = new Set(Object.keys(getTerms()))
  const languages = await Promise.all(
    SUPPORTED_LANGUAGES.map(async (code) => {
      const translations = await loadTranslations(code)
      // Only count translations matching a term key in the master list
      // (translation files are keyed by canonical term name, e.g. "proxy contract")
      const validKeys = Object.keys(translations).filter((k) => masterKeys.has(k))
      const translatedTerms = validKeys.length
      const confidenceBreakdown = { high: 0, medium: 0, low: 0 }

      for (const key of validKeys) {
        const conf = translations[key].confidence ?? "high"
        if (conf in confidenceBreakdown) {
          confidenceBreakdown[conf as keyof typeof confidenceBreakdown]++
        }
      }

      return {
        code,
        name: LANGUAGE_NAMES[code] ?? code,
        translatedTerms,
        totalTerms,
        completionPercent: Math.round((translatedTerms / totalTerms) * 100),
        confidenceBreakdown,
      }
    })
  )

  return c.json({ languages }, 200)
})

// GET /translations/:lang
const translationFileRoute = createRoute({
  method: "get",
  path: "/translations/{lang}",
  tags: ["Translations"],
  summary: "Full glossary for a language",
  description: "All translated terms with contextual forms, plurals, and grammar.",
  request: { params: LangParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: TranslationFileSchema } },
      description: "Full translation file",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Language not supported",
    },
  },
})

app.openapi(translationFileRoute, async (c) => {
  const { lang } = c.req.valid("param")

  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return c.json({ error: `Language "${lang}" is not supported` }, 404)
  }

  const raw = await loadTranslations(lang)

  // Normalize confidence to match schema enum, cast to satisfy Zod types
  const terms: Record<string, Record<string, unknown>> = {}
  for (const [key, entry] of Object.entries(raw)) {
    terms[key] = {
      ...entry,
      confidence: entry.confidence ?? "high",
    }
  }

  return c.json(
    {
      language: lang,
      termCount: Object.keys(terms).length,
      terms,
    } as { language: string; termCount: number; terms: Record<string, { term: string; confidence: "high" | "medium" | "low" }> },
    200
  )
})

// GET /translations/:lang/:termId
const singleTranslationRoute = createRoute({
  method: "get",
  path: "/translations/{lang}/{termId}",
  tags: ["Translations"],
  summary: "Single term translation",
  description:
    "Look up a term translation with intelligent matching. Returns English source alongside translation.",
  request: {
    params: z.object({
      lang: LangParamSchema.shape.lang,
      termId: TermIdParamSchema.shape.termId,
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SingleTranslationSchema } },
      description: "Term translation with English source",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Term or language not found",
    },
  },
})

app.openapi(singleTranslationRoute, async (c) => {
  const { lang, termId } = c.req.valid("param")

  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return c.json({ error: `Language "${lang}" is not supported` }, 404)
  }

  const entry = resolveTerm(termId)
  if (!entry) {
    return c.json({ error: "Term not found" }, 404)
  }

  const translations = await loadTranslations(lang)
  const translation = translations[entry.id] ??
    translations[entry.term.toLowerCase()] ??
    translations[entry.term]

  if (!translation) {
    return c.json({ error: `No translation for "${entry.term}" in ${lang}` }, 404)
  }

  return c.json(
    {
      english: {
        id: entry.id,
        term: entry.term,
        definition: entry.definition,
      },
      translation: {
        term: translation.term,
        contexts: translation.contexts,
        plurals: translation.plurals,
        grammar: translation.grammar
          ? {
              gender: translation.grammar.gender,
              partOfSpeech: translation.grammar.part_of_speech,
              formality: translation.grammar.formality,
            }
          : undefined,
        confidence: (translation.confidence ?? "high") as "high" | "medium" | "low",
        notes: translation.notes,
      },
    },
    200
  )
})

export default app
