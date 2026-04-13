import { OpenAPIHono } from "@hono/zod-openapi"
import { apiReference } from "@scalar/hono-api-reference"
import { cors } from "hono/cors"
import { cache } from "hono/cache"

import llmsTxt from "./llms.txt"
import viewer from "./routes/viewer"
import info from "./routes/info"
import styleGuide from "./routes/style-guide"
import translations from "./routes/translations"
import filter from "./routes/filter"
import schema from "./routes/schema"

const app = new OpenAPIHono()

// CORS -- public API, allow all origins for reads
app.use("*", cors())

// Cache headers for read endpoints
app.use("/api/v1/info/*", cache({ cacheName: "info", cacheControl: "public, max-age=3600" }))
app.use("/api/v1/style-guide/*", cache({ cacheName: "style-guide", cacheControl: "public, max-age=86400, stale-while-revalidate=604800" }))
app.use("/api/v1/languages", cache({ cacheName: "languages", cacheControl: "public, max-age=86400" }))
app.use("/api/v1/translations/*", cache({ cacheName: "translations", cacheControl: "public, max-age=604800, stale-while-revalidate=604800" }))
app.use("/api/v1/schema", cache({ cacheName: "schema", cacheControl: "public, max-age=604800" }))

// Mount versioned routes
app.route("/api/v1", info)
app.route("/api/v1", styleGuide)
app.route("/api/v1", translations)
app.route("/api/v1", filter)
app.route("/api/v1", schema)

// OpenAPI spec
app.doc("/openapi.json", {
  openapi: "3.1.0",
  info: {
    title: "ETHGlossary API",
    version: "0.1.0",
    description:
      "Ethereum terminology glossary and style guide. Canonical translations for 24 languages, English usage rules, and content-aware term filtering for translation pipelines.",
    contact: {
      name: "ethereum.org",
      url: "https://ethglossary.xyz",
    },
    license: {
      name: "MPL-2.0",
      url: "https://www.mozilla.org/en-US/MPL/2.0/",
    },
  },
  servers: [
    { url: "https://ethglossary.xyz", description: "Production" },
    { url: "http://localhost:8787", description: "Local development" },
  ],
})

// Scalar API docs
app.get(
  "/docs",
  apiReference({
    spec: { url: "/openapi.json" },
    theme: "kepler",
    pageTitle: "ETHGlossary API",
  } as Record<string, unknown>)
)

// LLM-friendly description
app.get("/llms.txt", (c) => {
  return c.text(llmsTxt)
})

// Viewer (root)
app.route("/", viewer)

export default app
