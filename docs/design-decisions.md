# Design decisions

Load when tempted to introduce a new framework, dependency, storage layer, or to break a v1 convention. These are settled decisions -- relitigating them costs the user time and they are unlikely to change without strong new evidence.

## Stack

**Hono + @hono/zod-openapi + @scalar/hono-api-reference on Cloudflare Workers.**

Reasoning:
- Edge-deployable, free tier covers the workload, no Google/AWS dependency.
- Zod schemas double as runtime validation and OpenAPI source. Auto-generated docs are a real win we lose if we migrate to Next.js, NestJS, or a framework with separate validation and docs systems.
- TypeScript everywhere; no build step beyond what wrangler does.

Do not migrate to Next.js or another framework without a strong reason. "I want server components" is not strong enough.

## Storage

**Glossary JSON is bundled into the Workers deploy.**

Reasoning:
- ~15MB of data, well under the 25MB Workers bundle limit.
- Read-only data -- no need for a database.
- Bundling eliminates a request hop and keeps cold-start latency tiny.

Phase 2 (designed, not built) adds a database for community feedback (votes, comments). **D1** is the chosen target -- Cloudflare's SQLite-backed edge DB. Not Postgres-on-Neon, not Supabase, not anything Google-touched.

## Versioning and API stability

**`/api/v1/` prefix from day one. Breaking changes to the public contract get a new major version.**

The repo uses pragmatic semver:

- **Patch** (0.x.y -> 0.x.y+1): data corrections, typo fixes, audit-script changes, docs-only updates, anything invisible to API consumers.
- **Minor** (0.x.0 -> 0.x+1.0): additive changes -- new optional response fields, new endpoints, new master entries, new pattern families in `content-filter.ts`, internal refactors with no contract change.
- **Major** (pre-1.0: encoded in a minor bump with a CHANGELOG callout; post-1.0: `0.x -> 1.0` or `1.x -> 2.x`): any change to the public contract. Breaking changes also require a new `/api/vN/` route prefix.

### What is public (changes require a version bump)

- Endpoint paths under `/api/v1/` and the root meta-paths (`/openapi.json`, `/docs`, `/llms.txt`).
- Request shapes for each endpoint (per the auto-generated OpenAPI spec at `/openapi.json`).
- Response shapes: field names, types, optionality, enum values that appear in responses.
- Semantic behavior: same input must produce the same response shape, modulo additive optional fields.

The OpenAPI spec at `/openapi.json` is the source of truth. If the OpenAPI declares it, it is part of the public contract.

### What is internal (may change without a major bump)

- The internal shape of `src/data/glossary-terms-enhanced.json` beyond what the API exposes (e.g., `content_occurrences`, `content_files`, `sources`).
- `src/data/glossary-schema.json` -- aspirational; does not validate runtime data today.
- `src/lib/*` helper code, the surface-form index construction.
- `scripts/audit-glossary.mjs` heuristics, report shape, and the term_role assignment logic.
- Enum values that are stored in data but not exposed in API responses.

### Breaking change examples (major bump or `/api/v2/`)

- Removing or renaming a response field.
- Tightening a Zod enum (removing a value from `casing`, `script_rule`, etc.).
- Changing the semantics of an existing field.
- Removing or renaming an endpoint.
- Changing `/api/v1/filter` matching so existing source content produces different matches for the same terms.
- Removing a master entry that a known surface form has resolved to.

### Non-breaking change examples (minor or patch)

- Adding a new optional response field.
- Adding a new endpoint.
- Adding a new pattern family in `STANDARD_PATTERNS` (existing matches unchanged; new matches appear).
- Adding a new master entry (existing entries unaffected; filter may return additional matches in `/filter`).
- Correcting a `script_rule` value on an existing entry (the field value is exposed, but the change reflects existing-policy accuracy, not a contract change). If in doubt, flag in the commit message and bump minor.
- Updating a translation string (the response shape stays the same; the string content changes).

### Deprecation policy

To deprecate a field or endpoint pre-1.0:

1. Update the OpenAPI description to call out the deprecation and the replacement (if any).
2. Keep serving correctly for at least one minor version.
3. Remove in the next minor; document the removal in the CHANGELOG.

Post-1.0, a deprecation-then-removal cycle crosses a major version.

## Auth

**Read auth: open, forever. No API key for reads.**

Future write auth (Phase 2):
- **SIWE (Sign-In With Ethereum)** as primary
- Then **Discord**, **GitHub**, **Farcaster**, **passkeys / magic links**
- **No Google.** Ever.

## Payload caps

**100KB on `/filter`.** Zod-enforced via `FilterRequest`. Most translation pipelines hit much less than this; the cap exists to prevent worker DoS via giant payloads.

## Caching

Aggressive on reads, none on writes:

- `/api/v1/info` -- 1 hour
- `/api/v1/style-guide/*` -- 1 day + 7-day stale-while-revalidate
- `/api/v1/languages` -- 1 day
- `/api/v1/translations/*` -- 7 days + 7-day stale-while-revalidate
- `/api/v1/schema` -- 7 days
- `/api/v1/filter` -- `no-store`

Reasoning: the glossary changes weekly at most. Aggressive caching reduces worker invocations, which keeps the deploy free and the experience fast.

## Domains

**No domain hardcoded anywhere.**

The OpenAPI spec self-derives `servers` from the request origin (see `src/index.ts`). The README explicitly says "consumers should not hardcode any domain."

The repo is published as `wackerow/ethglossary` and is planned to move to the `ethereum` GitHub org. The custom domain `ethglossary.xyz` is owned and will be pointed at the Worker. When that happens, no code change is required.

## License

**MPL-2.0** (Mozilla Public License 2.0). Weak copyleft -- modifications to MPL files must be MPL, but the license does not "infect" the broader project. Compatible with typical commercial use.

Do not change the license without explicit ask. Do not add a CLA. Do not relicense to a more permissive license; the weak copyleft is intentional.

## Translation policy

**v1 locked on 2026-05-10.** Captured in `docs/translation-policy.md`.

The policy was synthesized from pre-existing ethereum.org translation pipeline guidance and validated by two parallel Gemini 3.1 Pro analyses with explicit disagreement resolution. The v1 lock means:

- The five resolved disagreements (Bengali numerals, ja/ko UI tags, ru/uk brands, Tamil prose, zh-tw style) are not up for re-debate without new evidence.
- The 11-value term-role taxonomy and 6-value `script_rule` enum are the target shape.
- Downstream consumers can rely on these conventions.

Native-speaker review for several confidence-medium decisions is queued but not yet done (see policy §9.2). When native speakers become available, those are the first review tasks -- they do not invalidate the v1 lock.

## "Do not relitigate" list

If you find yourself proposing one of these, stop and ask:

- Switching stacks (Next.js, NestJS, FastAPI, etc.)
- Moving to a database for read data
- Adding Google, OpenAI, Amazon, or Microsoft dependencies
- Removing the `/api/v1/` prefix
- Adding telemetry or analytics
- Hardcoding a domain
- Adding a CLA
- Relicensing
- Re-debating any of the five resolved policy disagreements

If new evidence genuinely warrants reconsideration, present it to the user. Do not silently change.
