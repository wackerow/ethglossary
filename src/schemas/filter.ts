import { z } from "@hono/zod-openapi"

export const FilterRequestSchema = z
  .object({
    content: z
      .string()
      .max(102400)
      .openapi({
        example:
          "Staking is the act of depositing 32 ETH to activate validator software...",
        description: "Source text to filter against (max 100KB)",
      }),
    language: z.string().min(2).max(5).openapi({
      example: "es",
      description: "Target language code",
    }),
    fileType: z
      .enum(["markdown", "json"])
      .default("markdown")
      .optional()
      .openapi({
        example: "markdown",
        description: "Source content type (affects text extraction)",
      }),
    includeExamples: z
      .boolean()
      .default(false)
      .optional()
      .openapi({
        description:
          "Include example sentences for high-frequency terms (2+ occurrences)",
      }),
  })
  .openapi("FilterRequest")

export const FilteredTermSchema = z.object({
  english: z.string().openapi({ example: "staking" }),
  translation: z.string().openapi({ example: "staking" }),
  note: z.string().optional(),
  example: z.string().optional(),
  occurrences: z.number().openapi({ example: 3 }),
})

export const FilterResponseSchema = z
  .object({
    language: z.string().openapi({ example: "es" }),
    matchedTerms: z.number().openapi({ example: 5 }),
    totalScanned: z.number().openapi({ example: 486 }),
    terms: z.array(FilteredTermSchema),
  })
  .openapi("FilterResponse")
