import { createRoute, OpenAPIHono } from "@hono/zod-openapi"
import { z } from "@hono/zod-openapi"
import schemaData from "../data/glossary-schema.json"

const app = new OpenAPIHono()

const route = createRoute({
  method: "get",
  path: "/schema",
  tags: ["Schema"],
  summary: "Glossary data schema",
  description: "JSON Schema definition for the glossary data structure.",
  responses: {
    200: {
      content: { "application/json": { schema: z.any() } },
      description: "The glossary JSON schema",
    },
  },
})

app.openapi(route, (c) => {
  return c.json(schemaData, 200)
})

export default app
