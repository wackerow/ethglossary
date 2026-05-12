---
name: ethglossary
description: Work with the ETHGlossary repo -- an API and viewer serving canonical Ethereum terminology, English style guide, and translations for 24 languages on Cloudflare Workers (Hono + Zod-OpenAPI + Scalar). Use this skill whenever editing, adding, or auditing glossary terms; modifying API routes or schemas; making translation or transliteration decisions for non-Latin-script languages; committing or pushing changes to this repo; or answering questions about Ethereum terminology conventions, the script_rule enum, the category/term-role taxonomy, or the v1-locked translation policy. The repo is github.com/wackerow/ethglossary and deploys to Cloudflare Workers at ethglossary.visual-20-hoists.workers.dev.
license: MPL-2.0
metadata:
  api-base: /api/v1
  stack: hono+zod-openapi+scalar+cloudflare-workers
  upstream: https://ethglossary.visual-20-hoists.workers.dev
  repo: https://github.com/wackerow/ethglossary
  policy-version: v1 (locked 2026-05-10)
---

# ETHGlossary

ETHGlossary is a standalone API and HTML viewer for canonical Ethereum terminology. Three consumers:

- Humans browsing the viewer at `/`
- LLMs and tools consuming `/openapi.json` and `/llms.txt`
- Translation pipelines POSTing source content to `/api/v1/filter` to get matching terms back

Two product surfaces:

- **English style guide** -- 486 terms with casing rules, avoid lists, aliases, editorial notes. The authoritative source for "what is the right way to write `<term>`?"
- **Translation reference** -- 24 languages with contextual forms (prose, heading, tag, UI, code), plurals, grammar, confidence levels, and a v1-locked transliteration policy covering 13 non-Latin-script languages

The repo is small. Read this file end-to-end on activation. Consult `references/` only when the triggers below indicate.

## Stack

- **Hono** `^4.12.x` -- edge-deployable web framework
- **@hono/zod-openapi** `^1.3.x` -- routes defined with Zod; OpenAPI 3.1 auto-generated
- **@scalar/hono-api-reference** -- interactive docs at `/docs`
- **Cloudflare Workers** + `wrangler` CLI -- deploy target
- **TypeScript 5.x**, ESM, no build step beyond what wrangler does

Auto-generated OpenAPI is a real win. Do not migrate the stack without a strong reason. If you are tempted, load `references/design-decisions.md` first.

## Repository layout

```
.
├── README.md
├── LICENSE                      # MPL-2.0
├── package.json
├── pnpm-workspace.yaml          # empty -- isolates from any parent workspace
├── tsconfig.json                # resolveJsonModule: true (we import .json directly)
├── wrangler.jsonc               # Workers config; declares text rule for *.txt imports
├── docs/
└── src/
    ├── index.ts                 # entry: CORS, cache, OpenAPI doc, Scalar, viewer mount
    ├── llms.txt                 # served at /llms.txt
    ├── data/
    │   ├── glossary-terms-enhanced.json   # master English term data (486 terms)
    │   ├── glossary-schema.json           # JSON Schema (aspirational, not 1:1 with data)
    │   └── translations/
    │       └── glossary-{lang}.json       # 24 files
    ├── lib/
    │   ├── glossary-data.ts     # JSON loading; surface-form index; resolveTerm
    │   └── content-filter.ts    # filterForContent
    ├── schemas/                 # Zod schemas (common, style-guide, translations, filter)
    └── routes/                  # info, style-guide, translations, filter, schema, viewer
```

All API endpoints live under `/api/v1/`. Root paths: `/` (viewer), `/docs` (Scalar), `/openapi.json`, `/llms.txt`.

## Endpoint summary

| Method | Path                                     | Purpose                                                  |
|--------|------------------------------------------|----------------------------------------------------------|
| GET    | `/api/v1/info`                           | Term count, language count, supported codes              |
| GET    | `/api/v1/style-guide`                    | Full English style guide; `?category=` filter            |
| GET    | `/api/v1/style-guide/search?q=`          | Fuzzy search across term/alias/avoid/definition          |
| GET    | `/api/v1/style-guide/{termId}`           | Single term with intelligent resolution                  |
| GET    | `/api/v1/languages`                      | Supported languages with completion stats                |
| GET    | `/api/v1/translations/{lang}`            | Full glossary for one language                           |
| GET    | `/api/v1/translations/{lang}/{termId}`   | Single term translation plus English source              |
| POST   | `/api/v1/filter`                         | Submit text (max 100KB), receive matching terms          |
| GET    | `/api/v1/schema`                         | Raw JSON Schema for the glossary data                    |
| GET    | `/llms.txt`                              | LLM-friendly description                                 |
| GET    | `/openapi.json`                          | Auto-generated OpenAPI 3.1 spec                          |
| GET    | `/docs`                                  | Scalar interactive API docs                              |
| GET    | `/`                                      | HTML viewer (beta)                                       |

For exact request/response shapes use `/openapi.json` as the source of truth. `references/endpoints.md` has a narrative version with curl examples.

### Intelligent term resolution

`/style-guide/{termId}` and `/translations/{lang}/{termId}` resolve via a surface-form index built at module load. Lookup order:

1. Canonical term name (case-insensitive)
2. `forms.base`
3. Aliases (string or object form)
4. Avoid-list entries (so `on-chain` resolves to `onchain`)

Misses return 404 with a `suggestions` array.

## Top gotchas -- read before touching data

The highest-impact non-obvious traps. The full annotated list with examples is in `references/gotchas-extended.md`; load it before any non-trivial data edit.

1. **Translation files are keyed by canonical term name, NOT by `id` slug.** Master `confirmed_terms` key = `"proxy contract"`. Translation file key = `"proxy contract"`. Term `id` = `"proxy-contract"`. When joining master and translations, use `Object.keys(getTerms())`, never `t.id`. A production bug from mixing these once reported every language as ~60% complete.

2. **Three different `script_rule` value sets currently coexist in the repo.** The JSON Schema enum (5 values), the bundled data (6 values), and the v1 translation policy target (6 values) all disagree. Before touching `script_rule`, load `references/data-shape.md` for the reconciliation table -- this is the active migration surface.

3. **`category` is currently topical** (`scaling`, `defi`, `consensus`, `general`, etc., 15 values) but the v1 translation policy uses `category` as **term role** (`concept`, `brand-or-project`, `person-name`, etc., 11 values). The migration to align is pending. Do not silently switch a topical category to a term role without coordinating.

4. **Aliases can be strings OR objects.** Most are `{ term, status, note? }`; some legacy entries are bare strings (e.g., `proof-of-stake` has `"PoS"`). Always normalize:
   ```typescript
   const aliasStr = typeof a === "string" ? a : a.term
   ```

5. **Translation files have ~21 orphan entries.** Translation files contain 507 entries; master has 486. Orphans are leftovers from terms removed in a prior pass. Filter at the API layer (already done in `routes/translations.ts`) -- do not assume key-set parity.

6. **Confidence is optional in data; runtime defaults to `"high"`.** The schema enum is `"high" | "medium" | "low"`. Default to `"high"` when missing or types break.

7. **`note` is only on ~40% of terms.** Bonus context, not guaranteed. Do not write code that depends on its presence.

8. **OpenAPI server URL is derived at request time** via `app.doc31` reading `c.req.url` and using `new URL(url).origin`. Do not hardcode any domain in the spec.

9. **Worktree hazards.** If this codebase is a worktree of a parent monorepo: do NOT run `git remote remove origin` -- it touches the parent. `pnpm install` from a worktree of a parent monorepo will try to manage the parent's `node_modules`; the empty `pnpm-workspace.yaml` keeps this project isolated, but pass `--ignore-workspace` if pnpm gets confused.

10. **Wrangler binds to `127.0.0.1`.** When SSH-tunneling for local dev, forward against `127.0.0.1` (not `localhost`); some browsers resolve `localhost` to IPv6 which mismatches.

## Working preferences -- non-negotiable hard rules

These come from the repo owner and are not negotiable. Full version with reasoning in `references/working-preferences.md`.

- **The repo owner prefers to be addressed as `Doctor` or `Doc`.** Use this in every response.
- **Permission is single-use.** "Go ahead and commit" authorizes ONE commit. "Push it" authorizes ONE push. "Deploy" authorizes ONE deploy. Do not chain or extend approvals.
- **Commit and push are separate steps.** Always commit, wait for explicit go-ahead, then push. They have been combined in the past and trust was lost.
- **Never auto-commit.** "Make this change" is not permission to commit.
- **Plain ASCII commit messages only.** No em dashes, smart quotes, fancy hyphens, or Unicode. Use `--` for ranges.
- **Subject line under 50 characters**, lowercase, verb-prefix, imperative.
- **Every commit ends with two co-author lines** -- Claude and the human (see template). No model version advertising in the Claude line.
- **No "you're absolutely right".** Engage with substance. Push back when something is wrong.
- **Disclaim confidence honestly.** "I haven't verified X" / "I think this works but haven't tested" are welcome. False certainty is not.
- **Open-source / privacy / ethics priorities.** Avoid Google, OpenAI, AWS, Big Tech where alternatives exist. Cloudflare for hosting is fine. No telemetry/analytics without explicit ask.

## Commit message template

```
<prefix>: <imperative subject, under 50 chars, lowercase, ASCII only>

<optional body explaining WHY, wrapped at ~72 chars. Skip if subject is enough.>

Co-Authored-By: Claude <model-name> <noreply@anthropic.com>
Co-Authored-By: wackerow <54227730+wackerow@users.noreply.github.com>
```

Verb prefixes: `add:` (new feature), `fix:` (bug fix), `refactor:` (no behavior change), `docs:`, `chore:`, `test:`. Use `--` for ranges. Never include "1M context" or other model-variant advertising in the Claude co-author line.

## Adding a glossary term

Load `references/data-shape.md` and `assets/term-template.json` first. Then:

1. Decide the canonical term name (becomes the JSON key in `confirmed_terms`) and a stable kebab-case `id`.
2. Pick `casing` (`standard` / `proper` / `uppercase` / `fixed`) -- see `references/data-shape.md` for the semantics.
3. Pick `script_rule`. If the term is a brand, project, person, programming language, OS, ticker, etc., load `references/translation-policy.md` §4 to choose the right value based on term role.
4. Add to `src/data/glossary-terms-enhanced.json` under `confirmed_terms` using the template in `assets/term-template.json`.
5. Add per-language translation stubs under `src/data/translations/glossary-{lang}.json` for each of the 24 languages, or schedule the additions for a follow-up.
6. **Validate**: `npx tsc --noEmit`
7. **Test resolution locally**:
   ```bash
   npx wrangler dev --port 8787
   curl http://127.0.0.1:8787/api/v1/style-guide/<termId>
   curl http://127.0.0.1:8787/api/v1/translations/en/<termId>   # English source
   curl http://127.0.0.1:8787/api/v1/languages                  # confirm stats unchanged
   ```
8. Report results back; wait for single-use permission before commit, then again before push.

## Translation and transliteration decisions

For any question about how a term should render in a non-Latin-script language -- script choice, transliteration vs calque, brand handling, numerals, plurals -- load `references/translation-policy.md`. It is the v1-locked policy (2026-05-10) synthesized from prior linguistic guidance and validated by two parallel Gemini 3.1 Pro analyses with explicit disagreement resolution.

Quick lookup before loading the full policy:

- **Non-Latin scripts in scope:** `ar, bn, hi, ja, ko, mr, ru, ta, te, uk, ur, zh, zh-tw`
- **Latin scripts (transliteration N/A):** `cs, de, es, fr, id, it, pl, pt-br, sw, tr, vi`
- **Term roles** (informs default `script_rule`): `concept`, `brand-or-project`, `person-name`, `programming-language`, `os-platform`, `cryptographic-primitive`, `network-name`, `file-extension`, `cli-command`, `ticker-or-standard`, `identifier`
- **`script_rule` values in the v1 policy**: `translate`, `calque`, `transliterate`, `keep_latin`, `always_latin`, `transliterate_with_translation`
- **Globally `always_latin`** across all 13 non-Latin-script languages: tickers (ETH, BTC), token standards (ERC-20), improvement proposals (EIP-1559), RPC/protocol identifiers (JSON-RPC, devp2p), crypto primitives (Keccak256, SHA-256, secp256k1), network parameters with units (32 ETH, 1 Gwei).

## When to load each reference

| Reference                              | Trigger                                                                                       |
|----------------------------------------|-----------------------------------------------------------------------------------------------|
| `references/data-shape.md`             | Adding/editing terms; touching `script_rule`/`category`/`casing`; refactoring the schema      |
| `references/endpoints.md`              | Adding a new endpoint; designing a request/response; auditing OpenAPI output                  |
| `references/gotchas-extended.md`       | Before any non-trivial edit to data or API code                                               |
| `references/translation-policy.md`     | Any translation, transliteration, script-rule, term-role, or per-language question            |
| `references/working-preferences.md`    | Before the first commit in a session; on any disagreement about workflow                      |
| `references/design-decisions.md`       | When tempted to introduce a new framework, dependency, or break a v1 convention               |

## Common workflows

### Local development

```bash
pnpm install                       # uses --ignore-workspace via empty pnpm-workspace.yaml
npx wrangler dev --port 8787       # binds 127.0.0.1
```

SSH-tunnel for remote dev (use `127.0.0.1`, not `localhost`):
```bash
ssh -L 8787:127.0.0.1:8787 host
```

### Type check
```bash
npx tsc --noEmit
```

### Verify a deploy

```bash
scripts/verify-deploy.sh https://ethglossary.visual-20-hoists.workers.dev
scripts/verify-deploy.sh http://127.0.0.1:8787
```

### Deploy to production

```bash
npx wrangler deploy --minify
```

Requires `npx wrangler login` once per machine (OAuth flow needs port 8976 forwarded for SSH sessions).

### Push to GitHub

If working from a worktree of another repo, the remote is named `ethglossary` (not `origin`). Push the local branch as the repo's default branch:

```bash
git push ethglossary <local-branch>:main
```

Only push after explicit single-use approval. Never combine commit + push.

## First moves on skill activation

1. Read this SKILL.md end-to-end (in progress).
2. Run `git status` and `git log --oneline | head` to know exactly where things stand.
3. Address the user as `Doctor` or `Doc` in every response.
4. Acknowledge: "I have the ethglossary skill loaded and I'm oriented on the repo."
5. Wait for direction before acting.
6. Never commit, push, or deploy without explicit single-use approval.
7. If asked to do something that touches glossary data, the `script_rule` enum, the `category` field, or translation policy: load the relevant reference file before editing.
