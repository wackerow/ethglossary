# AGENTS.md -- ETHGlossary

Conventions for any agent (Claude Code, GitHub Copilot, Cursor, OpenAI Codex, others) working in this repo.

## What this repo is

ETHGlossary is a standalone API and HTML viewer for canonical Ethereum terminology, deployed on Cloudflare Workers. Three consumers:

- Humans browsing the viewer at `/`
- LLMs and tooling consuming `/openapi.json` and `/llms.txt`
- Translation pipelines POSTing source content to `/api/v1/filter` to get matching terms back. The active consumer is the intl-pipeline in `ethereum/ethereum-org-website`.

Two product surfaces:

- **English style guide** -- 486 terms with casing rules, avoid lists, aliases, editorial notes. Authoritative for "what is the right way to write `<term>`?"
- **Translation reference** -- 24 languages with contextual forms (prose, heading, tag, UI, code), plurals, grammar, confidence levels, and a v1-locked transliteration policy covering 13 non-Latin-script languages.

Live deployment: `https://ethglossary.visual-20-hoists.workers.dev` (transitional; custom domain `ethglossary.xyz` is owned and will be pointed at the Worker). The repo is `github.com/wackerow/ethglossary` and will eventually move to the `ethereum` org. Consumers should call the URL, not the GitHub path.

## Stack

- **Hono** `^4.12.x` -- edge-deployable web framework
- **@hono/zod-openapi** `^1.3.x` -- routes defined with Zod; OpenAPI 3.1 auto-generated
- **@scalar/hono-api-reference** -- interactive docs at `/docs`
- **Cloudflare Workers** + `wrangler` CLI -- deploy target
- **TypeScript 5.x**, ESM, no build step beyond what wrangler does

Auto-generated OpenAPI from the same Zod schemas used for runtime validation is a real win. Do not migrate to Next.js or another framework without strong reason. See `docs/design-decisions.md` if tempted.

## Repository layout

```
.
├── AGENTS.md                       # this file
├── README.md
├── LICENSE                          # MPL-2.0
├── package.json
├── pnpm-workspace.yaml              # empty -- isolates from any parent workspace
├── tsconfig.json                    # resolveJsonModule: true (we import .json)
├── wrangler.jsonc                   # Workers config; text rule for *.txt
├── docs/
│   ├── api-spec.md                  # internal planning spec
│   ├── data-shape.md                # GlossaryTerm / TranslationEntry shapes; script_rule reconciliation
│   ├── design-decisions.md          # settled decisions; do-not-relitigate list
│   ├── gotchas.md                   # full annotated gotchas
│   ├── translation-policy.md        # v1-locked translation policy
│   └── term-template.json           # template for a new GlossaryTerm
├── scripts/
│   ├── audit-glossary.mjs           # audit data vs v1 policy; outputs Markdown
│   └── verify-deploy.sh             # smoke test for a running deploy
└── src/
    ├── index.ts                     # entry: CORS, cache, OpenAPI doc, Scalar, viewer mount
    ├── llms.txt                     # served at /llms.txt
    ├── data/
    │   ├── glossary-terms-enhanced.json   # master English term data (486 terms)
    │   ├── glossary-schema.json           # JSON Schema (aspirational, not 1:1 with data)
    │   └── translations/
    │       └── glossary-{lang}.json       # 24 files
    ├── lib/
    │   ├── glossary-data.ts         # JSON loading; surface-form index; resolveTerm
    │   └── content-filter.ts        # filterForContent
    ├── schemas/                     # Zod schemas (common, style-guide, translations, filter)
    └── routes/                      # info, style-guide, translations, filter, schema, viewer
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

For exact request/response shapes use `/openapi.json` as the source of truth.

### Intelligent term resolution

`/style-guide/{termId}` and `/translations/{lang}/{termId}` resolve via a surface-form index built at module load. Lookup order:

1. Canonical term name (case-insensitive)
2. `forms.base`
3. Aliases (string or object form)
4. Avoid-list entries (so `on-chain` resolves to `onchain`)

Misses return 404 with a `suggestions` array.

## Top gotchas -- read before touching data

Full annotated list in `docs/gotchas.md`. Highest-impact items:

1. **Translation files are keyed by canonical term name, NOT by `id` slug.** Master `confirmed_terms` key = `"proxy contract"`. Translation file key = `"proxy contract"`. Term `id` = `"proxy-contract"`. When joining master and translations, use `Object.keys(getTerms())`, never `t.id`. A production bug from mixing these once reported every language as ~60% complete.

2. **Three different `script_rule` value sets currently coexist.** The JSON Schema enum (v1-aligned: 6 values), the bundled data (6 values including legacy `hybrid`/`context_dependent` until they are migrated), and the v1 translation policy target (6 values). Before touching `script_rule`, load `docs/data-shape.md` for the reconciliation table.

3. **`category` is currently topical** (`scaling`, `defi`, `consensus`, etc., 15 values) but the v1 translation policy uses `category` as **term role** (`concept`, `brand-or-project`, etc., 11 values). Migration is in progress; do not silently switch.

4. **Aliases can be strings OR objects.** Most are `{ term, status, note? }`; some legacy entries are bare strings. Always normalize:
   ```typescript
   const aliasStr = typeof a === "string" ? a : a.term
   ```

5. **Translation files have ~21 orphan entries.** Files contain 507 entries; master has 486. Filter at the API layer (already done in `routes/translations.ts`). Do not assume key-set parity.

6. **Confidence is optional in data; runtime defaults to `"high"`.** Default to `"high"` when reading directly from JSON or types break.

7. **OpenAPI server URL is derived at request time.** Do not hardcode any domain in the spec.

8. **Worktree hazards.** If this codebase is a worktree of a parent monorepo: do NOT run `git remote remove origin` -- it touches the parent. Use `--ignore-workspace` or rely on the empty `pnpm-workspace.yaml` for `pnpm install`.

## Working preferences -- non-negotiable

These come from the repo owner. They are not negotiable. The reasoning matters because it lets you handle edge cases.

### Addressing

The repo owner prefers to be addressed as **Doctor** or **Doc**. Use this in every response. It is a reminder mechanism that signals you are paying attention to durable instructions.

### Permission is single-use, never in perpetuity

"Go ahead and commit" authorizes ONE commit. "Push it" authorizes ONE push. "Deploy" authorizes ONE deploy. Do not chain operations. Do not assume that approval for an earlier change extends to the next change. Combining operations has cost trust in the past.

### Commit and push are separate steps

Always commit first, show the result, wait for explicit go-ahead, then push.

### Never auto-commit

"Make this change" / "fix this bug" / "add this feature" is NOT permission to commit. Edit the files. Show the diff. Wait.

### Plain ASCII commit messages

No em dashes, smart quotes, fancy hyphens, or Unicode in commit messages. Use `--` for ranges if needed. Straight quotes only.

### Commit subject conventions

- Maximum 50 characters
- Lowercase
- Verb-prefix, imperative
- Allowed prefixes: `add:` (new feature), `fix:` (bug fix), `refactor:` (no behavior change), `docs:`, `chore:`, `test:`

The body explains WHY, not WHAT. The diff already shows what changed.

### Co-author lines

Every commit ends with two co-author lines:

```
Co-Authored-By: Claude <model-name> <noreply@anthropic.com>
Co-Authored-By: wackerow <54227730+wackerow@users.noreply.github.com>
```

Do NOT add version variants in the Claude line ("1M context", etc.) -- the user considers it unnecessary noise.

### Short responses by default

State results and decisions directly. Skip self-narration. Long replies only when warranted.

### Disclaim confidence honestly

"I am moderately confident" / "I have not verified X" / "I think this works but have not tested it" are welcome. False certainty is not.

### No "you're absolutely right" or apologies

Patronizing. Engage with substance. If correct, acknowledge specifically. If incorrect, push back. No social-ritual apologies; just state the mistake and the fix.

### Open-source / privacy / ethics priorities

In priority order:

- Avoid Google products and Google-touched dependencies entirely.
- Avoid OpenAI and Amazon equally.
- Avoid technologies that further empower already-wealthy/powerful entities.
- Prioritize FLOSS / open-source tooling.
- Prioritize privacy and individual freedom.
- Cloudflare for hosting is fine.

No telemetry / analytics may be added without explicit ask.

## Commit message template

```
<prefix>: <imperative subject, under 50 chars, lowercase, ASCII only>

<optional body explaining WHY, wrapped at ~72 chars. Skip if subject is enough.>

Co-Authored-By: Claude <model-name> <noreply@anthropic.com>
Co-Authored-By: wackerow <54227730+wackerow@users.noreply.github.com>
```

## Adding a glossary term

Read `docs/data-shape.md` and `docs/term-template.json` first. Then:

1. Decide the canonical term name (becomes the JSON key in `confirmed_terms`) and a stable kebab-case `id`.
2. Pick `casing` (`standard` / `proper` / `uppercase` / `fixed`) -- see `docs/data-shape.md` for the semantics.
3. Pick `script_rule`. If the term is a brand, project, person, programming language, OS, ticker, etc., consult `docs/translation-policy.md` §4 to choose the right value based on term role.
4. Add to `src/data/glossary-terms-enhanced.json` under `confirmed_terms` using the template.
5. Add per-language translation stubs under `src/data/translations/glossary-{lang}.json` for each of the 24 languages.
6. **Validate**: `npx tsc --noEmit`
7. **Test resolution locally**:
   ```bash
   npx wrangler dev --port 8787
   curl http://127.0.0.1:8787/api/v1/style-guide/<termId>
   curl http://127.0.0.1:8787/api/v1/translations/en/<termId>
   curl http://127.0.0.1:8787/api/v1/languages          # confirm stats unchanged
   ```
8. Report results. Wait for single-use permission before commit, then again before push.

## Translation and transliteration decisions

For any question about how a term should render in a non-Latin-script language -- script choice, transliteration vs calque, brand handling, numerals, plurals -- load `docs/translation-policy.md`. It is the v1-locked policy (2026-05-10) synthesized from prior linguistic guidance and validated by two parallel Gemini 3.1 Pro analyses with explicit disagreement resolution.

Quick lookup before loading the full policy:

- **Non-Latin scripts in scope:** `ar, bn, hi, ja, ko, mr, ru, ta, te, uk, ur, zh, zh-tw`
- **Latin scripts (transliteration N/A):** `cs, de, es, fr, id, it, pl, pt-br, sw, tr, vi`
- **Term roles** (informs default `script_rule`): `concept`, `brand-or-project`, `person-name`, `programming-language`, `os-platform`, `cryptographic-primitive`, `network-name`, `file-extension`, `cli-command`, `ticker-or-standard`, `identifier`
- **`script_rule` values in the v1 policy**: `translate`, `calque`, `transliterate`, `keep_latin`, `always_latin`, `transliterate_with_translation`
- **Globally `always_latin`** across all 13 non-Latin-script languages: tickers (ETH, BTC), token standards (ERC-20), improvement proposals (EIP-1559), RPC/protocol identifiers, crypto primitives (Keccak256), network parameters with units (32 ETH, 1 Gwei).

## When to consult what

| File                          | Trigger                                                                                  |
|-------------------------------|------------------------------------------------------------------------------------------|
| `docs/data-shape.md`          | Adding/editing terms; touching `script_rule`/`category`/`casing`; refactoring the schema |
| `docs/gotchas.md`             | Before any non-trivial edit to data or API code                                          |
| `docs/translation-policy.md`  | Any translation, transliteration, script-rule, term-role, or per-language question       |
| `docs/design-decisions.md`    | When tempted to introduce a new framework, dependency, or break a v1 convention          |
| `docs/api-spec.md`            | When designing or extending API endpoints                                                |
| `/openapi.json`               | Exact request/response shapes (source of truth for the API surface)                      |

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

### Audit data against v1 policy
```bash
node scripts/audit-glossary.mjs > /tmp/audit-report.md
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

Only push after explicit single-use approval. Never combine commit and push.

## First moves on session start

1. Read this AGENTS.md end-to-end.
2. Run `git status` and `git log --oneline | head` to know where things stand.
3. Address the user as `Doctor` or `Doc` in every response.
4. Never commit, push, or deploy without explicit single-use approval.
5. If asked to do something that touches glossary data, the `script_rule` enum, the `category` field, or translation policy, load the relevant doc before editing.
