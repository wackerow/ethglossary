import { createRoute, OpenAPIHono } from "@hono/zod-openapi"
import { z } from "@hono/zod-openapi"
import { getTermCount, SUPPORTED_LANGUAGES } from "../lib/glossary-data"

const app = new OpenAPIHono()

const InfoSchema = z
  .object({
    version: z.string().openapi({ example: "1.0.0" }),
    termCount: z.number().openapi({ example: 486 }),
    languageCount: z.number().openapi({ example: 24 }),
    lastUpdated: z.string().openapi({ example: "2026-04-12T00:00:00Z" }),
    languages: z.array(z.string()),
  })
  .openapi("Info")

const route = createRoute({
  method: "get",
  path: "/info",
  tags: ["Info"],
  summary: "API metadata and health check",
  responses: {
    200: {
      content: { "application/json": { schema: InfoSchema } },
      description: "API metadata",
    },
  },
})

app.openapi(route, (c) => {
  return c.json(
    {
      version: "1.0.0",
      termCount: getTermCount(),
      languageCount: SUPPORTED_LANGUAGES.length,
      lastUpdated: "2026-04-12T00:00:00Z",
      languages: SUPPORTED_LANGUAGES,
    },
    200
  )
})

export default app
