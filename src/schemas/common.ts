import { z } from "@hono/zod-openapi"

export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: "Term not found" }),
    suggestions: z
      .array(
        z.object({
          id: z.string(),
          term: z.string(),
          score: z.number(),
        })
      )
      .optional()
      .openapi({ description: "Close matches when term is not found" }),
  })
  .openapi("Error")

export const TermIdParamSchema = z.object({
  termId: z.string().min(1).openapi({
    param: { name: "termId", in: "path" },
    example: "staking",
    description: "Term ID, alias, or variant (intelligent matching)",
  }),
})

export const LangParamSchema = z.object({
  lang: z.string().min(2).max(5).openapi({
    param: { name: "lang", in: "path" },
    example: "es",
    description: "Language code (e.g., es, ja, zh-tw)",
  }),
})
