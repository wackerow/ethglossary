import { z } from "@hono/zod-openapi"

const ContextFormsSchema = z.object({
  prose: z
    .object({
      term: z.string(),
      example: z.string().optional(),
    })
    .optional(),
  heading: z.object({ term: z.string() }).optional(),
  tag: z.object({ term: z.string() }).optional(),
  ui: z.object({ term: z.string() }).optional(),
  code: z.object({ term: z.string() }).optional(),
})

const GrammarSchema = z.object({
  gender: z.string().optional(),
  partOfSpeech: z.string().optional(),
  formality: z.string().optional(),
})

const PluralsSchema = z.object({
  one: z.string().nullable(),
  two: z.string().nullable().optional(),
  few: z.string().nullable().optional(),
  many: z.string().nullable().optional(),
  other: z.string().nullable(),
})

export const TranslationTermSchema = z
  .object({
    term: z.string().openapi({ example: "staking" }),
    contexts: ContextFormsSchema.optional(),
    plurals: PluralsSchema.optional(),
    grammar: GrammarSchema.optional(),
    confidence: z
      .enum(["high", "medium", "low"])
      .openapi({ example: "high" }),
    notes: z.string().optional(),
  })
  .openapi("TranslationTerm")

export const TranslationFileSchema = z
  .object({
    language: z.string().openapi({ example: "es" }),
    termCount: z.number().openapi({ example: 486 }),
    terms: z.record(z.string(), TranslationTermSchema),
  })
  .openapi("TranslationFile")

export const SingleTranslationSchema = z
  .object({
    english: z.object({
      id: z.string(),
      term: z.string(),
      definition: z.string(),
    }),
    translation: TranslationTermSchema,
  })
  .openapi("SingleTranslation")

export const LanguageInfoSchema = z
  .object({
    code: z.string().openapi({ example: "es" }),
    name: z.string().openapi({ example: "Spanish" }),
    translatedTerms: z.number().openapi({ example: 486 }),
    totalTerms: z.number().openapi({ example: 486 }),
    completionPercent: z.number().openapi({ example: 100 }),
    confidenceBreakdown: z.object({
      high: z.number(),
      medium: z.number(),
      low: z.number(),
    }),
  })
  .openapi("LanguageInfo")

export const LanguagesListSchema = z
  .object({
    languages: z.array(LanguageInfoSchema),
  })
  .openapi("LanguagesList")
