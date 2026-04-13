import { z } from "@hono/zod-openapi"

const AliasSchema = z.object({
  term: z.string(),
  status: z.enum(["preferred", "accepted"]),
  note: z.string().optional(),
})

export const StyleGuideTermSchema = z
  .object({
    id: z.string().openapi({ example: "onchain" }),
    term: z.string().openapi({ example: "onchain" }),
    category: z.string().openapi({ example: "general" }),
    casing: z
      .enum(["standard", "proper", "uppercase", "fixed"])
      .openapi({ example: "standard" }),
    definition: z.string().openapi({
      example: "Refers to actions or data that exist on the blockchain.",
    }),
    avoid: z
      .array(z.string())
      .optional()
      .openapi({ example: ["on chain", "on-chain", "On Chain"] }),
    aliases: z.array(AliasSchema).optional(),
    note: z.string().optional().openapi({
      example:
        "Always one word, no hyphen, lowercase unless starting a sentence.",
    }),
    scriptRule: z.string().openapi({ example: "translate" }),
    hasTooltip: z.boolean().openapi({ example: true }),
  })
  .openapi("StyleGuideTerm")

export const StyleGuideListSchema = z
  .object({
    termCount: z.number().openapi({ example: 486 }),
    terms: z.array(StyleGuideTermSchema),
  })
  .openapi("StyleGuideList")

export const SearchResultSchema = z
  .object({
    query: z.string().openapi({ example: "staking" }),
    results: z.array(
      z.object({
        id: z.string(),
        term: z.string(),
        matchedOn: z
          .enum(["term", "alias", "avoid", "definition", "morphological"])
          .openapi({ example: "term" }),
        score: z.number().openapi({ example: 1.0 }),
      })
    ),
  })
  .openapi("SearchResult")
