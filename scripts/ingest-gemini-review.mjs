#!/usr/bin/env node
// One-shot ingestion of tmp-gemini-glossary-review.json into the glossary.
//
// Reads:
//   tmp-gemini-glossary-review.json (Gemini 3.1 Pro classification output)
//   src/data/glossary-terms-enhanced.json (master data)
//   src/data/translations/glossary-<lang>.json (per-language data, 24 files)
//
// Writes:
//   src/data/always-latin-tokens.json   (NEW; flat-list catch for non-promoted terms)
//   src/data/glossary-terms-enhanced.json (updated; new master entries appended)
//   src/data/translations/glossary-<lang>.json (updated; per-language data for promoted terms)
//
// Prints a summary report to stdout.
//
// Heuristics encoded here are pragmatic, not policy-authoritative. The flat list
// emits a keep-Latin hint at filter time; the authoritative policy is at
// docs/translation-policy.md.

import { readFileSync, writeFileSync } from "node:fs"

const REVIEW = JSON.parse(readFileSync("tmp-gemini-glossary-review.json", "utf8"))
const MASTER_PATH = "src/data/glossary-terms-enhanced.json"
const MASTER = JSON.parse(readFileSync(MASTER_PATH, "utf8"))

const LANGS = [
  "ar", "bn", "cs", "de", "es", "fr", "hi", "id", "it", "ja", "ko", "mr",
  "pl", "pt-br", "ru", "sw", "ta", "te", "tr", "uk", "ur", "vi", "zh", "zh-tw",
]

const TRANS = {}
for (const lang of LANGS) {
  TRANS[lang] = JSON.parse(readFileSync(`src/data/translations/glossary-${lang}.json`, "utf8"))
}

// ---- Flat-list categorization ---------------------------------------------

function flatCategory(entry) {
  switch (entry.term_role) {
    case "programming-language": return "programming_languages"
    case "os-platform": return "os_platforms"
    case "person-name": return "people"
    case "ticker-or-standard": return "ticker_standards"
    case "brand-or-project":
      return entry.script_rule_default === "keep_latin" ? "dev_tools" : "brands"
    default:
      return "brands"
  }
}

// ---- Promoted-entry shaping -----------------------------------------------

function masterKey(term) { return term.toLowerCase() }
function masterId(term) {
  return term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function inferTopicalCategory(role) {
  // The `category` field is topical (separate axis from term_role).
  // Use the closest topical bucket from the existing 15-value vocabulary.
  switch (role) {
    case "person-name": return "general"
    case "network-name": return "protocol-upgrades"
    case "brand-or-project": return "general"
    case "programming-language": return "development"
    case "os-platform": return "development"
    case "cryptographic-primitive": return "cryptography"
    case "ticker-or-standard": return "tokens"
    default: return "general"
  }
}

function inferCasing(term) {
  if (/^[A-Z]+$/.test(term)) return "uppercase"
  if (/[a-z][A-Z]/.test(term)) return "fixed"   // midcap brand (MetaMask, CryptoKitties)
  return "proper"
}

function buildMasterEntry(entry) {
  return {
    id: masterId(entry.term),
    term: entry.term,
    category: inferTopicalCategory(entry.term_role),
    term_role: entry.term_role,
    definition: entry.rationale,
    has_tooltip: true,
    in_glossary: true,
    content_occurrences: 0,
    content_files: 0,
    intl_keys: 0,
    sources: ["seed", "gemini-3.1-pro-2026-05-14"],
    forms: { base: entry.term.toLowerCase() },
    script_rule: entry.script_rule_default,
    casing: inferCasing(entry.term),
    aliases: [],
  }
}

function buildTranslationEntry(englishTerm, nativeForm, confidence) {
  return {
    term: nativeForm,
    aliases: [englishTerm],
    transliteration: null,
    contexts: {
      prose:   { term: nativeForm },
      heading: { term: nativeForm },
      tag:     { term: nativeForm },
      ui:      { term: nativeForm },
      code:    { term: englishTerm },   // code context always keeps the English Latin form
    },
    plurals: null,
    grammar: null,
    source: "gemini-3.1-pro-2026-05-14",
    confidence,
    notes: null,
    updated: "2026-05-14T00:00:00Z",
  }
}

// Fallback translation entry for a language where no native form is established.
// Mirrors the existing convention: every master entry has an entry in every
// translation file, even if the entry just preserves the Latin form.
function buildFallbackTranslationEntry(englishTerm) {
  return {
    term: englishTerm,
    aliases: [],
    transliteration: null,
    contexts: {
      prose:   { term: englishTerm },
      heading: { term: englishTerm },
      tag:     { term: englishTerm },
      ui:      { term: englishTerm },
      code:    { term: englishTerm },
    },
    plurals: null,
    grammar: null,
    source: "seed",
    confidence: "high",
    notes: "Latin form preserved (no established native-script form per Gemini 3.1 Pro 2026-05-14).",
    updated: "2026-05-14T00:00:00Z",
  }
}

// ---- Main loop ------------------------------------------------------------

const flat = {
  programming_languages: [],
  os_platforms: [],
  dev_tools: [],
  brands: [],
  people: [],
  ticker_standards: [],
}

const skipped = []
let masterAdded = 0
const perLangAdded = Object.fromEntries(LANGS.map(l => [l, 0]))

for (const entry of REVIEW.entries) {
  const key = masterKey(entry.term)

  if (entry.promote_to_master) {
    // Idempotent: master might already exist from a prior run.
    if (!MASTER.confirmed_terms[key]) {
      MASTER.confirmed_terms[key] = buildMasterEntry(entry)
      masterAdded++
    }

    // For each of the 24 languages, ensure a translation entry exists.
    // Order of preference: existing entry (preserve) > Gemini native form > Latin fallback.
    for (const lang of LANGS) {
      if (TRANS[lang][key]) continue   // preserve existing rich data
      const nativeData = entry.per_language_native_forms?.[lang]
      if (nativeData && nativeData.native_form) {
        TRANS[lang][key] = buildTranslationEntry(entry.term, nativeData.native_form, nativeData.confidence)
        perLangAdded[lang]++
      } else {
        TRANS[lang][key] = buildFallbackTranslationEntry(entry.term)
        perLangAdded[lang]++
      }
    }
  } else {
    // Flat list. Skip if the term already exists as a master entry.
    if (MASTER.confirmed_terms[key]) {
      skipped.push({ term: entry.term, reason: "non-promoted but master already exists" })
      continue
    }
    flat[flatCategory(entry)].push(entry.term)
  }
}

for (const k of Object.keys(flat)) flat[k].sort()

// ---- Write outputs --------------------------------------------------------

const flatTotal = Object.values(flat).reduce((s, arr) => s + arr.length, 0)

const alwaysLatinTokens = {
  _metadata: {
    generated: "2026-05-14",
    source: "Gemini 3.1 Pro review of intl-pipeline candidate terms vs v1 translation policy (docs/translation-policy.md). Run via ethereum-org-website temp GH Action.",
    total: flatTotal,
    categories: Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v.length])),
    semantics: {
      programming_languages: "always_latin",
      os_platforms: "always_latin",
      ticker_standards: "always_latin",
      dev_tools: "keep_latin",
      brands: "keep_latin (no established native-script form across target languages; promote to master entry when one emerges)",
      people: "keep_latin (no widely-established transliterations; promote when established)",
    },
    note: "Source content matching against these tokens emits a keep-Latin or always-Latin hint via /api/v1/filter. The actual script_rule semantic per category is in 'semantics' above. To promote a token to a full master entry with per-language data, remove it from this list and add to src/data/glossary-terms-enhanced.json -- see docs/common-fixes.md.",
  },
  ...flat,
}

writeFileSync("src/data/always-latin-tokens.json", JSON.stringify(alwaysLatinTokens, null, 2) + "\n")

MASTER.metadata.total_confirmed = Object.keys(MASTER.confirmed_terms).length
writeFileSync(MASTER_PATH, JSON.stringify(MASTER, null, 2) + "\n")

for (const lang of LANGS) {
  writeFileSync(`src/data/translations/glossary-${lang}.json`, JSON.stringify(TRANS[lang], null, 2) + "\n")
}

// ---- Report ---------------------------------------------------------------

console.log("=== Gemini ingestion summary ===")
console.log()
console.log("Flat list (src/data/always-latin-tokens.json):")
console.log(`  total: ${flatTotal}`)
for (const [k, v] of Object.entries(flat)) {
  console.log(`  ${k}: ${v.length}`)
}
console.log()
console.log(`Master entries added: ${masterAdded}`)
console.log(`New total_confirmed: ${MASTER.metadata.total_confirmed}`)
console.log()
console.log("Per-language translation entries added (only where native_form is non-null):")
for (const lang of LANGS) {
  console.log(`  ${lang}: ${perLangAdded[lang]}`)
}
console.log()
if (skipped.length) {
  console.log(`Skipped: ${skipped.length}`)
  for (const s of skipped) console.log(`  - ${s.term} (${s.reason})`)
}
