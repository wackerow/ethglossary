import { createRoute, OpenAPIHono } from "@hono/zod-openapi"
import { FilterRequestSchema, FilterResponseSchema } from "../schemas/filter"
import { getTermCount, SUPPORTED_LANGUAGES } from "../lib/glossary-data"
import { filterForContent } from "../lib/content-filter"
import { ErrorSchema } from "../schemas/common"

const app = new OpenAPIHono()

const route = createRoute({
  method: "post",
  path: "/filter",
  tags: ["Filter"],
  summary: "Filter glossary terms for source content",
  description:
    "Send source text and get back the glossary terms relevant to that content. " +
    "Strips code blocks, inline code, and URLs before matching. " +
    "Max 100KB content size.",
  request: {
    body: {
      content: { "application/json": { schema: FilterRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: FilterResponseSchema } },
      description: "Matching glossary terms",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid request",
    },
  },
})

app.openapi(route, async (c) => {
  const { content, language, fileType = "markdown", includeExamples = false } =
    c.req.valid("json")

  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return c.json({ error: `Language "${language}" is not supported` }, 400)
  }

  const terms = await filterForContent(
    content,
    fileType,
    language,
    includeExamples
  )

  return c.json(
    {
      language,
      matchedTerms: terms.length,
      totalScanned: getTermCount(),
      terms,
    },
    200
  )
})

export default app
