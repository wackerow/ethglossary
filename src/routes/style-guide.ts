import { createRoute, OpenAPIHono } from "@hono/zod-openapi"
import { z } from "@hono/zod-openapi"
import { ErrorSchema, TermIdParamSchema } from "../schemas/common"
import {
  StyleGuideListSchema,
  StyleGuideTermSchema,
  SearchResultSchema,
} from "../schemas/style-guide"
import { getTerms, resolveTerm, getTermCount } from "../lib/glossary-data"

const app = new OpenAPIHono()

// Helper to transform internal term to style guide response shape
function normalizeAlias(a: string | { term: string; status: string; note?: string }) {
  if (typeof a === "string") return { term: a, status: "accepted" as const }
  return { term: a.term, status: a.status as "preferred" | "accepted", note: a.note }
}

function toStyleGuideTerm(entry: ReturnType<typeof resolveTerm>) {
  if (!entry) return undefined
  return {
    id: entry.id,
    term: entry.term,
    category: entry.category,
    termRole: entry.term_role,
    casing: entry.casing as "standard" | "proper" | "uppercase" | "fixed",
    definition: entry.definition,
    avoid: entry.avoid,
    aliases: entry.aliases?.map(normalizeAlias),
    note: entry.note,
    scriptRule: entry.script_rule,
    hasTooltip: entry.has_tooltip,
  }
}

// GET /style-guide
const listRoute = createRoute({
  method: "get",
  path: "/style-guide",
  tags: ["Style Guide"],
  summary: "Full English style guide",
  description:
    "All terms with canonical forms, casing rules, avoid lists, and usage notes.",
  request: {
    query: z.object({
      category: z
        .string()
        .optional()
        .openapi({
          example: "defi,scaling",
          description: "Filter by category (comma-separated)",
        }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: StyleGuideListSchema } },
      description: "Style guide terms",
    },
  },
})

app.openapi(listRoute, (c) => {
  const { category } = c.req.valid("query")
  const allTerms = getTerms()
  const categories = category
    ? category.split(",").map((c) => c.trim().toLowerCase())
    : null

  const terms = Object.values(allTerms)
    .filter((t) => !categories || categories.includes(t.category))
    .map((t) => toStyleGuideTerm(t)!)

  return c.json({ termCount: terms.length, terms }, 200)
})

// GET /style-guide/search
const searchRoute = createRoute({
  method: "get",
  path: "/style-guide/search",
  tags: ["Style Guide"],
  summary: "Search the style guide",
  description:
    "Fuzzy search across terms, definitions, aliases, and avoid lists.",
  request: {
    query: z.object({
      q: z.string().min(1).openapi({
        example: "staking",
        description: "Search query",
      }),
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(20)
        .optional()
        .openapi({ description: "Max results (default: 20)" }),
    }),
  },
  responses: {
    200: {
      content: { "application/json": { schema: SearchResultSchema } },
      description: "Search results",
    },
  },
})

app.openapi(searchRoute, (c) => {
  const { q, limit = 20 } = c.req.valid("query")
  const query = q.toLowerCase()
  const allTerms = getTerms()
  const results: Array<{
    id: string
    term: string
    matchedOn: "term" | "alias" | "avoid" | "definition" | "morphological"
    score: number
  }> = []

  for (const [, entry] of Object.entries(allTerms)) {
    // Exact term match
    if (entry.term.toLowerCase() === query) {
      results.push({ id: entry.id, term: entry.term, matchedOn: "term", score: 1.0 })
      continue
    }

    // Term contains query
    if (entry.term.toLowerCase().includes(query)) {
      results.push({ id: entry.id, term: entry.term, matchedOn: "term", score: 0.8 })
      continue
    }

    // Alias match
    if (entry.aliases?.some((a) => (typeof a === "string" ? a : a.term).toLowerCase().includes(query))) {
      results.push({ id: entry.id, term: entry.term, matchedOn: "alias", score: 0.7 })
      continue
    }

    // Avoid list match
    if (entry.avoid?.some((a) => a.toLowerCase().includes(query))) {
      results.push({ id: entry.id, term: entry.term, matchedOn: "avoid", score: 0.6 })
      continue
    }

    // Definition match
    if (entry.definition?.toLowerCase().includes(query)) {
      results.push({
        id: entry.id,
        term: entry.term,
        matchedOn: "definition",
        score: 0.4,
      })
      continue
    }
  }

  results.sort((a, b) => b.score - a.score)

  return c.json({ query: q, results: results.slice(0, limit) }, 200)
})

// GET /style-guide/:termId
const getTermRoute = createRoute({
  method: "get",
  path: "/style-guide/{termId}",
  tags: ["Style Guide"],
  summary: "Look up a single term",
  description:
    "Intelligent matching: resolves aliases, avoid forms, and morphological variants.",
  request: { params: TermIdParamSchema },
  responses: {
    200: {
      content: { "application/json": { schema: StyleGuideTermSchema } },
      description: "The style guide entry",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Term not found",
    },
  },
})

app.openapi(getTermRoute, (c) => {
  const { termId } = c.req.valid("param")
  const entry = resolveTerm(termId)

  if (!entry) {
    // Try fuzzy suggestions
    const allTerms = getTerms()
    const query = termId.toLowerCase()
    const suggestions = Object.values(allTerms)
      .filter((t) => t.term.toLowerCase().includes(query) || query.includes(t.term.toLowerCase()))
      .slice(0, 5)
      .map((t) => ({ id: t.id, term: t.term, score: 0.5 }))

    return c.json({ error: "Term not found", suggestions }, 404)
  }

  return c.json(toStyleGuideTerm(entry)!, 200)
})

export default app
