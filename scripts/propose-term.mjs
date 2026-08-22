#!/usr/bin/env node
/**
 * Propose a new glossary term: one model call for the English master entry,
 * then one per target language for its translation entry.
 *
 * Driven by .github/workflows/propose-term.yml, runnable locally with the same
 * environment variables. Nothing the model returns is written verbatim -- see
 * scripts/lib/shape-term.mjs, which owns the shape of everything that lands in
 * src/data. Policy prose is sliced out of docs/translation-policy.md at
 * runtime rather than restated, so the prompt cannot drift from the lock.
 *
 * Writes are all-or-nothing: every language is generated and validated before
 * the first file is touched. A language that fails after its retries gets a
 * Latin-form placeholder marked confidence "low" and is named in the summary,
 * rather than aborting a run that is otherwise complete.
 *
 * Environment:
 *   OPENROUTER_API_KEY  required
 *   GLOSSARY_TERM       required -- the term to evaluate (not TERM: that is the shell's
 *                       terminal type, and a local run would silently propose "xterm")
 *   GLOSSARY_TERM_HINT  optional context from the maintainer
 *   LANGUAGES           optional csv of language codes (default: all 24)
 *   LLM_PROVIDER        adapter to use, default openrouter (scripts/lib/adapters.mjs)
 *   MODEL               any model id the adapter serves; defaults to the
 *                       adapter's own default
 *   MAX_COST_USD        run fuse, default 5
 *   CONCURRENCY         parallel per-language calls, default 6
 *   DRY_RUN             "true" to emit the proposal without writing data
 *   FORCE_MASTER        "true" to force a full entry over a flat-list routing
 *   ALLOW_EXISTING      "true" to proceed when the term already resolves
 *   ARTIFACT_DIR        where the proposal JSON is written
 *
 * Exit codes: 0 success, 2 refused by a guard (duplicate, pattern family,
 * policy violation), 1 unexpected failure.
 */

import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, resolve } from "node:path"
import { tmpdir } from "node:os"

import {
  MODEL_ID_PATTERN,
  coAuthorForModel,
  resolveAdapter,
  temperatureForAttempt,
} from "./lib/adapters.mjs"
import {
  FLAT_LIST_CATEGORIES,
  LANG_BY_CODE,
  LANG_CODES,
  PATTERN_FAMILY_INSTANCE,
  loadPolicySections,
  pluralCategories,
  sliceSectionByTitle,
} from "./lib/term-policy.mjs"
import { buildMasterPrompt, buildTranslationPrompt } from "./lib/term-prompts.mjs"
import {
  buildFallbackTranslationEntry,
  buildMasterEntry,
  checkMasterRefusals,
  buildTranslationEntry,
  deriveId,
  deriveMasterKey,
  masterProposalSchema,
  translationSchema,
  validateMasterProposal,
  validateTranslation,
} from "./lib/shape-term.mjs"

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const MASTER_PATH = join(REPO_ROOT, "src/data/glossary-terms-enhanced.json")
const FLAT_LIST_PATH = join(REPO_ROOT, "src/data/always-latin-tokens.json")
const TRANS_PATH = (lang) => join(REPO_ROOT, `src/data/translations/glossary-${lang}.json`)
const POLICY_PATH = join(REPO_ROOT, "docs/translation-policy.md")
const DATA_SHAPE_PATH = join(REPO_ROOT, "docs/data-shape.md")

const bool = (v) => String(v ?? "").trim().toLowerCase() === "true"
const csv = (v) =>
  String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

const CFG = {
  term: (process.env.GLOSSARY_TERM ?? "").trim(),
  hint: (process.env.GLOSSARY_TERM_HINT ?? "").trim(),
  languages: csv(process.env.LANGUAGES),
  provider: (process.env.LLM_PROVIDER ?? "").trim() || "openrouter",
  model: (process.env.MODEL ?? "").trim(),
  maxCostUsd: Number(process.env.MAX_COST_USD || 5),
  concurrency: Math.max(1, Number(process.env.CONCURRENCY || 6)),
  dryRun: bool(process.env.DRY_RUN),
  forceMaster: bool(process.env.FORCE_MASTER),
  allowExisting: bool(process.env.ALLOW_EXISTING),
  artifactDir:
    (process.env.ARTIFACT_DIR ?? "").trim() ||
    join(process.env.RUNNER_TEMP || tmpdir(), "propose-term"),
  attemptsPerCall: Math.max(1, Number(process.env.VALIDATION_ATTEMPTS || 3)),
}

// Resolved before anything else runs: an unknown provider or a malformed model
// id should fail at startup, not after reading 25 data files.
const ADAPTER = resolveAdapter(CFG.provider)
const MODEL = CFG.model || ADAPTER.defaultModel

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"))
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + "\n")

const log = (...a) => console.log(...a)
const warn = (...a) => console.warn(...a)

class Refusal extends Error {}

// ---------------------------------------------------------------------------
// Surface-form resolution, mirroring src/lib/glossary-data.ts
// ---------------------------------------------------------------------------

function buildSurfaceIndex(terms) {
  const index = new Map()
  for (const [key, entry] of Object.entries(terms)) {
    const add = (s) => {
      if (s) index.set(String(s).toLowerCase(), key)
    }
    add(entry.term)
    add(entry.forms?.base)
    for (const alias of entry.aliases ?? []) add(typeof alias === "string" ? alias : alias?.term)
    for (const avoid of entry.avoid ?? []) add(avoid)
  }
  return index
}

function findInFlatList(flatList, term) {
  const needle = term.trim().toLowerCase()
  for (const category of FLAT_LIST_CATEGORIES) {
    const hit = (flatList[category] ?? []).find((t) => t.toLowerCase() === needle)
    if (hit) return { category, token: hit }
  }
  return null
}

// ---------------------------------------------------------------------------
// Cost fuse
// ---------------------------------------------------------------------------

function assertBudget() {
  const spent = ADAPTER.usage().costUsd
  if (spent >= CFG.maxCostUsd) {
    throw new Error(
      `Run fuse tripped: spent $${spent.toFixed(4)} of the $${CFG.maxCostUsd} ceiling. ` +
        `Raise max_cost_usd if this term genuinely needs more, but check the call count first.`
    )
  }
}

/**
 * Call the model, validate the result, and retry with the validation errors
 * fed back in. Structured output constrains shape; validation is what enforces
 * policy, so a retry that explains the policy violation is the useful one.
 */
async function generateValidated({ label, prompt, schema, schemaName, validate, refuse }) {
  let lastErrors = []
  for (let attempt = 1; attempt <= CFG.attemptsPerCall; attempt++) {
    assertBudget()
    const attemptPrompt =
      attempt === 1
        ? prompt
        : `${prompt}\n\n# Your previous attempt was rejected\n\nIt failed validation for these reasons. Fix all of them:\n\n${lastErrors
            .map((e) => `- ${e}`)
            .join("\n")}`

    const temperature = temperatureForAttempt(attempt)
    const { data } = await ADAPTER.complete({
      model: MODEL,
      prompt: attemptPrompt,
      schema,
      schemaName,
      temperature,
    })

    const refusal = refuse?.(data)
    if (refusal) throw new Refusal(refusal)

    const { errors, warnings } = validate(data)
    if (!errors.length) {
      if (warnings.length) for (const w of warnings) warn(`  ! ${label}: ${w}`)
      return { data, warnings }
    }
    lastErrors = errors
    warn(`  x ${label}: attempt ${attempt}/${CFG.attemptsPerCall} rejected (temp ${temperature})`)
    for (const e of errors) warn(`    - ${e}`)
  }
  const err = new Error(`${label}: validation failed after ${CFG.attemptsPerCall} attempts`)
  err.validationErrors = lastErrors
  throw err
}

// ---------------------------------------------------------------------------
// Bounded-concurrency map
// ---------------------------------------------------------------------------

async function mapWithLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

function setOutput(key, value) {
  const file = process.env.GITHUB_OUTPUT
  const single = String(value).includes("\n")
  if (!file) {
    log(`::output:: ${key}=${value}`)
    return
  }
  if (single) {
    const delim = `EOF_${key}_${process.pid}`
    appendFileSync(file, `${key}<<${delim}\n${value}\n${delim}\n`)
  } else {
    appendFileSync(file, `${key}=${value}\n`)
  }
}

function writeSummary(markdown) {
  log("\n" + markdown)
  const file = process.env.GITHUB_STEP_SUMMARY
  if (file) appendFileSync(file, markdown + "\n")
}

/** Commit subjects: ASCII only, lowercase, imperative, under 50 chars. */
function commitSubject(prefix, term, suffix) {
  const ascii = term.replace(/[^\x20-\x7E]/g, "").toLowerCase()
  const full = `${prefix}: ${ascii} ${suffix}`
  if (full.length <= 50) return full
  const room = 50 - `${prefix}: ${suffix}`.length - 1
  return `${prefix}: ${ascii.slice(0, Math.max(1, room)).trim()} ${suffix}`
}

const slugify = (s) => deriveId(s).slice(0, 48) || "term"

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!CFG.term) throw new Refusal("GLOSSARY_TERM is required")
  // Fail here rather than letting the key-status call warn and the first
  // completion throw ten lines later.
  if (!ADAPTER.isAvailable())
    throw new Refusal(
      `${ADAPTER.envKey} is not set. Add it as a repository secret, and set a credit limit ` +
        `on the key at openrouter.ai/settings/keys -- see docs/propose-term.md.`
    )
  if (!MODEL_ID_PATTERN.test(MODEL))
    throw new Refusal(
      `"${MODEL}" is not a valid model id. ${ADAPTER.name} namespaces models as ` +
        `provider/model, e.g. ${ADAPTER.defaultModel}.`
    )

  const langCodes = CFG.languages.length ? CFG.languages : LANG_CODES
  const unknown = langCodes.filter((c) => !LANG_BY_CODE.has(c))
  if (unknown.length) throw new Refusal(`Unknown language code(s): ${unknown.join(", ")}`)

  // Guard: pattern-family instances are matched at request time, never stored.
  if (PATTERN_FAMILY_INSTANCE.test(CFG.term)) {
    throw new Refusal(
      `"${CFG.term}" is a pattern-family instance. These are matched programmatically in ` +
        `src/lib/content-filter.ts (STANDARD_PATTERNS) and must never become per-instance entries. ` +
        `See AGENTS.md "DRY pattern families". If the family itself is missing, add it to STANDARD_PATTERNS.`
    )
  }

  const masterData = readJson(MASTER_PATH)
  const terms = masterData.confirmed_terms
  const flatList = readJson(FLAT_LIST_PATH)
  const surfaceIndex = buildSurfaceIndex(terms)

  // Guard: already present, as an entry or as one of its surface forms.
  const resolved = surfaceIndex.get(CFG.term.trim().toLowerCase())
  if (resolved && !CFG.allowExisting) {
    throw new Refusal(
      `"${CFG.term}" already resolves to the existing entry "${resolved}" ` +
        `(id: ${terms[resolved].id}, script_rule: ${terms[resolved].script_rule}). ` +
        `To edit it, follow docs/common-fixes.md. Re-dispatch with allow_existing to override.`
    )
  }
  const flatHit = findInFlatList(flatList, CFG.term)
  if (flatHit && !CFG.allowExisting) {
    throw new Refusal(
      `"${CFG.term}" is already in the always-Latin flat list under "${flatHit.category}". ` +
        `To give it per-language data, use the "promote a flat-list token" recipe in docs/common-fixes.md, ` +
        `or re-dispatch with allow_existing and force_master.`
    )
  }

  const policy = loadPolicySections(POLICY_PATH)
  const casingDoc = sliceSectionByTitle(DATA_SHAPE_PATH, "`casing` semantics")
  const topicalCategories = [...new Set(Object.values(terms).map((t) => t.category))].sort()
  const existingKeys = Object.keys(terms).sort()
  const sourceTag = `${MODEL.replace(/^.*\//, "")}-${new Date().toISOString().slice(0, 10)}`
  const updated = new Date().toISOString().replace(/\.\d{3}Z$/, "Z")

  const status = await ADAPTER.keyStatus?.().catch((e) => {
    warn(`! Could not read ${ADAPTER.name} key status: ${e.message}`)
    return null
  })
  if (status) {
    log(
      `${ADAPTER.name} key: limit ${status.limit ?? "none"}, remaining ${
        status.limitRemaining ?? "n/a"
      }${status.limitReset ? ` (resets ${status.limitReset})` : ""}, lifetime usage $${status.usage.toFixed(4)}`
    )
    if (status.limit == null)
      warn(
        `! This ${ADAPTER.name} key has no server-side credit limit. The only ceiling is MAX_COST_USD ` +
          `in this script. Set a limit on the key at openrouter.ai/settings/keys.`
      )
  }

  log(`\nModel: ${MODEL} via ${ADAPTER.name}`)
  log(`Term:  "${CFG.term}"`)
  log(`Fuse:  $${CFG.maxCostUsd}\n`)

  // -- Phase 1: English master entry ----------------------------------------

  log("Phase 1: English master entry")
  const { data: proposal, warnings: masterWarnings } = await generateValidated({
    label: "master",
    prompt: buildMasterPrompt({
      term: CFG.term,
      hint: CFG.hint,
      policy,
      casingDoc,
      terms,
      topicalCategories,
      flatListSemantics: flatList._metadata?.semantics ?? {},
      existingKeys,
    }),
    schema: masterProposalSchema(topicalCategories),
    schemaName: "ethglossary_master_proposal",
    validate: (d) => validateMasterProposal(d, { inputTerm: CFG.term, topicalCategories }),
    refuse: (d) => {
      const flagged = checkMasterRefusals(d)
      if (flagged) return `"${CFG.term}" was not added -- ${flagged}`
      // A collision the pre-flight guard could not see: the dispatched surface
      // form does not resolve, but the name the model canonicalizes it to does.
      const key = deriveMasterKey(String(d?.canonical_term ?? ""))
      if (key && terms[key] && !CFG.allowExisting)
        return (
          `the proposal canonicalizes "${CFG.term}" to "${d.canonical_term}", which already exists as ` +
          `"${key}" (id: ${terms[key].id}). Add "${CFG.term}" to that entry's aliases or avoid list instead ` +
          `(docs/common-fixes.md), or re-dispatch with allow_existing.`
        )
      return null
    },
  })

  const canonicalTerm = proposal.canonical_term.trim()
  const masterKey = deriveMasterKey(canonicalTerm)

  const routeToFlatList = proposal.recommended_placement === "always_latin_list" && !CFG.forceMaster
  log(`  term_role: ${proposal.term_role}`)
  log(`  script_rule: ${proposal.script_rule}`)
  log(`  casing: ${proposal.casing}`)
  log(`  category: ${proposal.category}`)
  log(`  confidence: ${proposal.confidence}`)
  log(`  placement: ${proposal.recommended_placement}${CFG.forceMaster ? " (overridden to master)" : ""}`)
  log(`  rationale: ${proposal.rationale}`)

  const masterEntry = buildMasterEntry(proposal, { sourceTag })

  // -- Phase 2: per-language entries ----------------------------------------

  const perLanguage = {}
  const failures = []
  const lowConfidence = []
  const langWarnings = {}

  if (!routeToFlatList) {
    log(`\nPhase 2: ${langCodes.length} language entries (concurrency ${CFG.concurrency})`)
    const targets = langCodes.map((code) => LANG_BY_CODE.get(code))
    await mapWithLimit(targets, CFG.concurrency, async (lang) => {
      const translations = readJson(TRANS_PATH(lang.code))
      try {
        const { data, warnings } = await generateValidated({
          label: lang.code,
          prompt: buildTranslationPrompt({
            langCode: lang.code,
            master: masterEntry,
            policy,
            translations,
            terms,
            englishTerm: canonicalTerm,
          }),
          schema: translationSchema(pluralCategories(lang.code)),
          schemaName: "ethglossary_translation_entry",
          validate: (d) =>
            validateTranslation(d, { langCode: lang.code, master: masterEntry, englishTerm: canonicalTerm }),
        })
        const entry = buildTranslationEntry(data, {
          langCode: lang.code,
          master: masterEntry,
          englishTerm: canonicalTerm,
          sourceTag,
          updated,
        })
        perLanguage[lang.code] = entry
        if (warnings.length) langWarnings[lang.code] = warnings
        if (entry.confidence !== "high") lowConfidence.push(`${lang.code} (${entry.confidence})`)
        log(`  ok ${lang.code}: ${entry.term}`)
      } catch (err) {
        const reason = err.validationErrors?.length ? err.validationErrors.join("; ") : err.message
        failures.push({ lang: lang.code, reason })
        perLanguage[lang.code] = buildFallbackTranslationEntry(canonicalTerm, {
          reason: reason.slice(0, 300),
          sourceTag,
          updated,
        })
        lowConfidence.push(`${lang.code} (placeholder)`)
        warn(`  FAILED ${lang.code}: ${reason}`)
      }
    })
  }

  // -- Artifact -------------------------------------------------------------

  const spend = ADAPTER.usage()
  const artifact = {
    generated: updated,
    model: MODEL,
    dispatched_term: CFG.term,
    hint: CFG.hint || null,
    placement: routeToFlatList ? "always_latin_list" : "master",
    forced_master: CFG.forceMaster,
    proposal,
    master_entry: masterEntry,
    master_warnings: masterWarnings,
    per_language: perLanguage,
    language_warnings: langWarnings,
    failures,
    usage: spend,
  }
  mkdirSync(CFG.artifactDir, { recursive: true })
  writeJson(join(CFG.artifactDir, "proposal.json"), artifact)

  // -- Write ----------------------------------------------------------------

  const flatCategory = proposal.flat_list_category
  let wrote = false

  if (CFG.dryRun) {
    log("\nDRY RUN: no data files written.")
  } else if (routeToFlatList) {
    const list = flatList[flatCategory] ?? []
    if (!list.some((t) => t.toLowerCase() === canonicalTerm.toLowerCase())) list.push(canonicalTerm)
    list.sort()
    flatList[flatCategory] = list
    flatList._metadata.total = FLAT_LIST_CATEGORIES.reduce((n, c) => n + (flatList[c]?.length ?? 0), 0)
    flatList._metadata.categories = Object.fromEntries(
      FLAT_LIST_CATEGORIES.map((c) => [c, flatList[c]?.length ?? 0])
    )
    writeJson(FLAT_LIST_PATH, flatList)
    wrote = true
    log(`\nWrote src/data/always-latin-tokens.json (${flatCategory}: ${flatList[flatCategory].length} tokens)`)
  } else {
    // New keys append, matching how the existing data grew -- a sorted insert
    // would rewrite unrelated lines and bury the change.
    terms[masterKey] = masterEntry
    masterData.metadata.total_confirmed = Object.keys(terms).length
    if (masterData.metadata.categories) {
      masterData.metadata.categories[masterEntry.category] =
        (masterData.metadata.categories[masterEntry.category] ?? 0) + 1
    }
    writeJson(MASTER_PATH, masterData)
    log(`\nWrote src/data/glossary-terms-enhanced.json (total_confirmed: ${masterData.metadata.total_confirmed})`)

    for (const code of langCodes) {
      const path = TRANS_PATH(code)
      const translations = readJson(path)
      translations[masterKey] = perLanguage[code]
      writeJson(path, translations)
    }
    wrote = true
    log(`Wrote ${langCodes.length} translation files`)
  }

  // -- Summary --------------------------------------------------------------

  const subject = routeToFlatList
    ? commitSubject("chore", `add ${canonicalTerm}`, "to always-latin list")
    : commitSubject("add", canonicalTerm, "glossary entry")

  const rows = routeToFlatList
    ? ""
    : Object.entries(perLanguage)
        .map(([code, e]) => `| ${code} | ${e.term} | ${e.transliteration ?? "--"} | ${e.confidence} |`)
        .join("\n")

  const summary = [
    `## Term proposal: \`${canonicalTerm}\``,
    "",
    `Dispatched as \`${CFG.term}\`. Model \`${MODEL}\` via ${ADAPTER.name}.`,
    "",
    `| Field | Value |`,
    `|---|---|`,
    `| placement | ${routeToFlatList ? `always-latin list (\`${flatCategory}\`)` : "master entry"} |`,
    `| term_role | \`${proposal.term_role}\` |`,
    `| script_rule | \`${proposal.script_rule}\` |`,
    `| casing | \`${proposal.casing}\` |`,
    `| category | \`${proposal.category}\` |`,
    `| confidence | ${proposal.confidence} |`,
    `| calls | ${spend.calls} |`,
    `| tokens | ${spend.inputTokens} in / ${spend.outputTokens} out (${spend.reasoningTokens} reasoning) |`,
    `| cost | $${spend.costUsd.toFixed(4)} of $${CFG.maxCostUsd} |`,
    "",
    `**Rationale.** ${proposal.rationale}`,
    "",
    proposal.related_existing_terms?.length
      ? `**Related existing entries.** ${proposal.related_existing_terms.map((t) => `\`${t}\``).join(", ")}\n`
      : "",
    masterWarnings.length ? `### Advisory on the English entry\n\n${masterWarnings.map((w) => `- ${w}`).join("\n")}\n` : "",
    rows ? `### Per-language results\n\n| lang | term | transliteration | confidence |\n|---|---|---|---|\n${rows}\n` : "",
    failures.length
      ? `### Needs human attention -- generation failed\n\nThese languages hold a Latin-form placeholder and must be reviewed before merge:\n\n${failures
          .map((f) => `- \`${f.lang}\`: ${f.reason}`)
          .join("\n")}\n`
      : "",
    Object.keys(langWarnings).length
      ? `### Per-language advisories\n\n${Object.entries(langWarnings)
          .map(([c, ws]) => `- \`${c}\`: ${ws.join("; ")}`)
          .join("\n")}\n`
      : "",
    lowConfidence.length && !routeToFlatList
      ? `### Below high confidence\n\n${lowConfidence.join(", ")}\n\nPolicy section 9.2 keeps a native-speaker review queue; these belong in it.\n`
      : "",
    CFG.dryRun ? "> Dry run -- no data files were modified.\n" : "",
  ]
    .filter(Boolean)
    .join("\n")

  writeSummary(summary)
  // The workflow feeds this straight to `gh pr create --body-file`. Passing it
  // as a step output would mean quoting model-authored prose through a shell.
  writeFileSync(join(CFG.artifactDir, "pr-body.md"), summary + "\n")

  setOutput("placement", routeToFlatList ? "always_latin_list" : "master")
  setOutput("canonical_term", canonicalTerm)
  setOutput("master_key", masterKey)
  setOutput("term_id", masterEntry.id)
  setOutput("slug", slugify(canonicalTerm))
  setOutput("commit_subject", subject)
  setOutput("wrote_data", String(wrote))
  setOutput("failure_count", String(failures.length))
  setOutput("low_confidence", lowConfidence.join(", "))
  setOutput("cost_usd", spend.costUsd.toFixed(4))
  setOutput("model", MODEL)
  // Empty when the model's provider has no established trailer address in this
  // project. The workflow omits the line rather than guessing one; the commit
  // body names the model either way.
  setOutput("model_co_author", coAuthorForModel(MODEL) ?? "")
  setOutput("artifact_dir", CFG.artifactDir)
  setOutput("pr_body_file", join(CFG.artifactDir, "pr-body.md"))

  log(`\nDone. $${spend.costUsd.toFixed(4)} across ${spend.calls} calls.`)
}

main().catch((err) => {
  if (err instanceof Refusal) {
    console.error(`\nRefused: ${err.message}`)
    writeSummary(`## Refused\n\n${err.message}\n`)
    process.exit(2)
  }
  console.error(`\nFailed: ${err.stack ?? err.message}`)
  writeSummary(`## Failed\n\n\`\`\`\n${err.message}\n\`\`\`\n`)
  process.exit(1)
})
