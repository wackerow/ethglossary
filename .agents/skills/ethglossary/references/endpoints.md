# Endpoint reference

Load when adding a new endpoint, designing a request/response, or auditing OpenAPI output.

The source of truth is the live OpenAPI spec at `/openapi.json`. Fetch it for exact request/response shapes:

```bash
curl http://127.0.0.1:8787/openapi.json | jq        # local
curl https://ethglossary.visual-20-hoists.workers.dev/openapi.json | jq   # prod
```

What follows is a narrative summary with `curl` examples.

## Versioning and base path

All API endpoints are prefixed `/api/v1/`. Versioning is mandatory from day one. Breaking changes get a new version; non-breaking additions stay in v1. The viewer (`/`), Scalar docs (`/docs`), OpenAPI (`/openapi.json`), and `/llms.txt` live at the root.

## CORS and caching

`src/index.ts` configures:

- **CORS:** wide-open for reads (`app.use("*", cors())`).
- **Cache headers per route group:**
  - `info` -- `public, max-age=3600`
  - `style-guide` -- `public, max-age=86400, stale-while-revalidate=604800`
  - `languages` -- `public, max-age=86400`
  - `translations` -- `public, max-age=604800, stale-while-revalidate=604800`
  - `schema` -- `public, max-age=604800`
  - `filter` -- `no-store` (set inside the route handler)

When adding a new endpoint, decide whether it joins an existing cache group or needs its own and add the middleware accordingly.

## Reads

### `GET /api/v1/info`

```bash
curl https://ethglossary.visual-20-hoists.workers.dev/api/v1/info
```

Returns term count, language count, supported codes. Use as a smoke test.

### `GET /api/v1/style-guide`

Full English style guide. Optional `?category=` filter (current categories are topical -- see `references/data-shape.md`).

### `GET /api/v1/style-guide/search?q=<query>`

Fuzzy search across term, alias, avoid, and definition fields.

### `GET /api/v1/style-guide/{termId}`

Single-term resolution. The resolver tries (in order):

1. Canonical term name (case-insensitive)
2. `forms.base`
3. Aliases (string or object form)
4. Avoid-list entries

Misses return 404 with `suggestions`.

### `GET /api/v1/languages`

Per-language completion stats. **Important:** stats are computed by intersecting translation-file keys with master `confirmed_terms` keys, which means orphan translations are excluded (see Gotcha #5 in `gotchas-extended.md`).

### `GET /api/v1/translations/{lang}`

Full glossary for one language. Returns `{ language, termCount, terms }`. Missing `confidence` is normalized to `"high"` at the API layer.

### `GET /api/v1/translations/{lang}/{termId}`

Single-term translation paired with English source. Same resolver as style-guide.

### `GET /api/v1/schema`

Returns the raw `src/data/glossary-schema.json`. Note: the schema is aspirational and does not exactly match the bundled data (see `data-shape.md`).

## Writes

### `POST /api/v1/filter`

```bash
curl -X POST https://ethglossary.visual-20-hoists.workers.dev/api/v1/filter \
  -H "Content-Type: application/json" \
  -d '{"content": "Staking requires 32 ETH to run a validator.", "language": "es"}'
```

- Body schema: `{ content: string, language: string, fileType?: "markdown" | "json", includeExamples?: boolean }`
- **Payload cap: 100KB** (Zod-enforced via `FilterRequest`).
- Strips code blocks, inline code, URLs, JSX/HTML tags, frontmatter, image refs, and heading anchors before matching (`src/lib/content-filter.ts`).
- Returns matching terms sorted by occurrence count descending.

There are no other write endpoints in v1. Phase 2 (designed, not built) adds `POST /api/v1/feedback/:lang/:termId` and `GET /api/v1/feedback/summary` for community feedback.

## Auth

Read endpoints are open, forever. No API key.

Future write auth (Phase 2): SIWE primary, then Discord, GitHub, Farcaster, passkeys / magic links. **No Google.** Storage will be D1 for community feedback.

## OpenAPI generation

`src/index.ts` calls `app.doc31("/openapi.json", (c) => { ... })` with a function form. The function reads `c.req.url` and uses `new URL(url).origin` as the server URL, so the spec self-derives from whichever host serves it. Do not hardcode any domain in the spec.

## Adding a new endpoint

1. Define the Zod schema(s) in `src/schemas/`. Reuse `ErrorSchema`, `LangParamSchema`, `TermIdParamSchema` from `common.ts`.
2. Define the route with `createRoute` in `src/routes/`. Set `method`, `path`, `tags`, `summary`, `description`, `request`, and `responses`.
3. Register the handler via `app.openapi(route, async (c) => { ... })`.
4. Mount the route group on the main `app` in `src/index.ts` under `/api/v1`.
5. Add a cache middleware in `src/index.ts` for the new path if it should be cached.
6. Verify: `npx tsc --noEmit`, then `curl` against `npx wrangler dev`. Check `/openapi.json` to confirm the new endpoint shows up correctly. Check `/docs` for Scalar rendering.
