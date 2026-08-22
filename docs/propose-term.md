# Proposing a term with the LLM workflow

`.github/workflows/propose-term.yml` takes one candidate term, asks Gemini 3.1 Pro to evaluate it against the v1 translation policy, and opens a PR with the resulting entry. Nothing merges on its own; the PR is the review surface.

Use it when you want a full 24-language entry drafted. For anything you already know the answer to -- a typo, a `script_rule` correction, a translation fix -- use the hand recipes in `docs/common-fixes.md` instead. This workflow costs money and produces a diff you still have to read.

## One-time setup

Add an `OPENROUTER_API_KEY` repository secret. Set a credit limit on the key at <https://openrouter.ai/settings/keys> -- ideally a daily-resetting one. That server-side ceiling is the real spend guard; the `max_cost_usd` input is a convenience on top of it, and a bug in this repo cannot lift the key limit.

OpenRouter rather than the Gemini API directly, because the Gemini API has no USD cap of any kind. Its only brake is a rolling spend-rate limit. The provider-namespaced model ids are also the seam for moving off Google later without touching the pipeline.

## Running it

Actions -> **Propose Glossary Term** -> Run workflow.

| Input | Notes |
|---|---|
| `term` | The candidate, as you would write it. Case does not matter for lookup. |
| `hint` | What you mean by it, where you saw it, what it is *not*. The single highest-leverage input -- a near-miss against an existing term is the most common way a proposal comes back wrong. |
| `languages` | Blank for all 24. Narrow it (`ja,ru`) for a cheap smoke test. |
| `model` | Any OpenRouter model id, `provider/model`. Blank uses the adapter default. Free text rather than a dropdown so the list cannot go stale and the repo does not hardcode vendor ids. A malformed id is refused at startup before any spend. |
| `placement` | `auto` lets the model route dev tools and undubbed brands to the flat list. `force-master` always writes a full entry. |
| `dry_run` | Proposal as an artifact, no writes, no PR. |
| `allow_existing` | Proceed even when the term already resolves. Only for a deliberate re-do. |
| `max_cost_usd` | Run fuse. Default 5, which is far above a normal run. |
| `concurrency` | Parallel per-language calls. Default 6. |
| `base_branch` | Default `main`. |
| `open_pr` | Uncheck to push the branch without a PR. |

**First run on an unfamiliar term:** `dry_run: true`, `languages: ja,ru,zh`. That is three languages plus the English pass -- four calls -- and it tells you whether the term is understood before you pay for 24.

Cost is roughly proportional to language count. Each per-language call carries the audience section, the `script_rule` enum, the cross-cutting rules, that language's own section 6 subsection, and two worked examples from the live data: about 3k input tokens. The English pass carries all 532 existing keys and four worked entries, about 5.5k. Reasoning tokens dominate the output bill and are reported separately in the job summary.

## What comes back

A PR touching `src/data/glossary-terms-enhanced.json` and all 24 `src/data/translations/glossary-*.json`, or -- for a flat-list routing -- only `src/data/always-latin-tokens.json`. The job summary and PR body carry a per-language table with each rendering, its romanization, and its confidence.

Read these first:

- **Anything under "Needs human attention".** A language whose generation failed after retries holds a Latin-form placeholder with `confidence: "low"` and a `notes` field explaining what failed. It is a placeholder, not a translation.
- **Anything below high confidence.** Policy section 9.2 keeps a native-speaker review queue; these belong in it.
- **The `rationale` and the advisories.** A `script_rule` that departs from its role's default is allowed but must carry a written justification in `note`; the summary says when that happened.

Then the diff itself. The model is a drafting aid, and a wrong entry propagates to localized educational content in 24 languages.

## What the model is not trusted with

The model returns values. `scripts/lib/shape-term.mjs` builds the structure. Nothing it returns is spread into a data file, and these hold regardless of what it says:

- `id` is derived from the canonical term; the master key is that term lowercased.
- `content_occurrences`, `content_files`, and `intl_keys` start at zero. Inventing usage counts would corrupt the signal they carry during dedup decisions.
- `contexts.code.term` is always the English Latin form, in every language.
- `script_rule: always_latin` forces the English form into every context in all 24 languages, and clears morphology, transliteration, and aliases (policy 7.1, "without exception").
- `transliteration` is null for the 11 Latin-script languages (policy 3).
- `plurals` carry only the CLDR categories the language actually has, taken from `Intl.PluralRules`, never a hardcoded list.
- Empty strings become `null`, matching the shape of existing entries.

## What it refuses outright

Exit code 2, no PR, an actionable message in the job summary:

- **A pattern-family instance** (`ERC-20`, `EIP-1559`, `BIP-39`). Matched at request time by `STANDARD_PATTERNS` in `src/lib/content-filter.ts`; never per-instance entries. See AGENTS.md "DRY pattern families".
- **A term that already resolves** -- as a canonical name, a `forms.base`, an alias, or an avoid form. `on-chain` refuses because it resolves to `onchain`.
- **A term already on the flat list.** Use the "promote a flat-list token" recipe in `docs/common-fixes.md`.
- **A duplicate the model itself flags.** A variant of an existing entry -- an acronym, a plural, a different hyphenation -- belongs in that entry's `aliases` or `avoid` list, not in a new entry.

A validation failure the model could plausibly fix instead feeds the specific errors back and retries, up to `VALIDATION_ATTEMPTS` (default 3).

## Policy comes from the doc, not from the prompt

The prompts splice `docs/translation-policy.md` verbatim by numbered heading at runtime -- section 2 for audience, 4 for the role taxonomy, 5 for the `script_rule` enum, 7 for the cross-cutting rules, and the one section 6 subsection that governs the target language. Nothing is paraphrased into the prompt, so editing the policy changes the prompt and there is no second copy to drift.

The cost is a coupling to that doc's heading numbers. `loadPolicySections` throws if a required section is missing, and `scripts/test-propose-term.mjs` checks that each language gets exactly its own group section and no other. If you restructure the policy doc, run that test.

Worked examples come from the live data for the same reason: `validator` and its per-language entries are the shape the model is asked to match, so the example cannot fall behind the format.

## Running it locally

```bash
export OPENROUTER_API_KEY=...
GLOSSARY_TERM="based rollup" \
GLOSSARY_TERM_HINT="An L2 that inherits sequencing from L1 block proposers." \
LANGUAGES=ja,ru \
DRY_RUN=true \
  node scripts/propose-term.mjs
```

`GLOSSARY_TERM`, not `TERM` -- `TERM` is the shell's terminal type, and a local run would silently propose `xterm`.

Without `DRY_RUN=true` this writes to `src/data` in your working tree. It never commits.

## Tests

```bash
pnpm run test:propose-term
```

Offline: policy slicing, prompt assembly, every validation path, every shaping invariant, the temperature ladder, and the adapter registry. No network, no writes.

## Switching models and providers

OpenRouter is itself a multi-model router, so **changing models -- including moving off Google entirely -- is a `model` input change with no code change.** Model ids are provider-namespaced (`google/...`, `anthropic/...`, `mistralai/...`), and the entry's `sources` field records which model produced it, so provenance follows the switch.

Two things the switch touches automatically:

- **The git trailer.** `coAuthorForModel` in `scripts/lib/adapters.mjs` maps a provider prefix to a `Co-Authored-By` line. Only providers whose address this project already establishes are listed -- `google/` and `anthropic/`. Anything else yields no trailer and the workflow omits the line rather than inventing an address; the commit body names the model either way. Add a mapping there if you settle on another provider.
- **Provenance.** `sources` becomes `["proposed", "<model>-<date>"]`, and the translation entries' `source` field carries the same tag.

What is *not* automatic: model quality for this task. The prompts assume a model that can hold ~5k tokens of policy and reason about a script it may not render. Narrow the `languages` input and use `dry_run` before trusting an untested model.

**Adding a transport** (a provider's own API rather than OpenRouter) means implementing the adapter shape in `scripts/lib/adapters.mjs`, registering it, and adding an `llm_provider` dispatch input. The caller already goes through `resolveAdapter` and touches no provider directly, and `LLM_PROVIDER` is already wired through the workflow. Only one transport is registered today, deliberately -- the seam exists because the git trailer needed it, not on speculation.

## Temperature

Temperature 0 on the first attempt, escalating `0.5, 1.0` on validation retries, capped at 1 -- the same ladder as `ethereum-org-website`'s `intl-pipeline/lib/llm/gemini.ts` and `blog`'s `scripts/intl/lib/gemini.ts`.

Zero is right for the first attempt: this is a classification task feeding a data file, and a reproducible answer is what you want. But determinism cuts both ways -- a retry at temperature 0 against a near-identical prompt reproduces the same wrong answer, so a rejected attempt needs variation to escape it. Transport retries (429, 5xx, timeout) reuse the same temperature, because the model never answered.

`completeJson` requires an explicit temperature rather than defaulting one, so the ladder cannot be silently flattened by a caller that forgets to pass it.

## Known limits

- **Structured output is best-effort, never load-bearing.** The request asks for a `json_schema` response format, but the enforcement is always the caller's validation, because a provider may accept that parameter and ignore it. Three paths, all tested: the provider honours it; the provider ignores it and returns fenced free-form JSON, which the parser strips and validation gates; or the provider rejects the parameter with a 400/404, in which case the transport inlines the schema in the prompt once per process and says so in the log.

  `provider.require_parameters` is deliberately **not** sent. It would restrict routing to providers advertising `response_format` support, turning an unsupported parameter into a routing failure for no benefit -- validation already covers the ignored-schema case. Neither `ethereum-org-website`'s `intl-pipeline` nor `blog`'s `scripts/intl` sends `response_format` at all; both use plain text plus fence-stripping plus validate-and-retry, which is exactly this module's fallback path.
- **`metadata.generated` is not touched.** Several counters in that block (`total_with_script_rule`, `new_terms_from_gemini`) were already stale before this workflow existed. It updates `total_confirmed` and the `categories` histogram, which are the two the audit script reads.
- **`scripts/audit-glossary.mjs` keeps its own copy of the policy enums.** It predates `scripts/lib/term-policy.mjs`. If the policy changes, change both.
- **`ethereum-org-website` and `blog` disagree on `usage: { include: true }`.** `blog` sends it; `ethereum-org-website` documents it as deprecated and ignored, with cost and `reasoning_tokens` returned regardless. This follows the latter, as the more recently touched of the two. If `cost` comes back null in a real run, that is the first thing to revisit -- the fuse falls back to estimating from token counts at list rates, which is only correct if the call was served at those rates.
- **No native-speaker review.** Confidence is the model's self-report. Treat `high` as "worth reviewing", not "correct".
