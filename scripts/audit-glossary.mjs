#!/usr/bin/env node
// Audits ETHGlossary bundled data against the v1 translation policy
// (locked 2026-05-10). Outputs a Markdown report to stdout.
//
// Run from repo root:
//   node scripts/audit-glossary.mjs > audit-report.md
//   node scripts/audit-glossary.mjs --section script-rule    # one section
//
// No data is modified. All term-role assignments are heuristic --
// they need human review (and Gemini consultation for language-specific
// calls) before being applied to the data.
//
// Heuristics in this script are starting points for human review, not
// policy. The authoritative policy is at:
//   .agents/skills/ethglossary/references/translation-policy.md

import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, resolve } from "node:path"

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const DATA_FILE = join(REPO_ROOT, "src/data/glossary-terms-enhanced.json")
const TRANS_DIR = join(REPO_ROOT, "src/data/translations")

// ----------------------------------------------------------------------------
// Policy reference (from references/translation-policy.md)
// ----------------------------------------------------------------------------

// v1 target enum for script_rule. hybrid and context_dependent are removed;
// calque and transliterate_with_translation are added.
const V1_SCRIPT_RULES = new Set([
  "translate",
  "calque",
  "transliterate",
  "keep_latin",
  "always_latin",
  "transliterate_with_translation",
])

// v1 term-role taxonomy with default script_rule per role (§4).
// brand-or-project and network-name are "transliterate per group rules" --
// keep_latin / always_latin are also acceptable for dev-tool brands.
const ROLE_INFO = {
  concept:                  { default: "translate",    acceptable: ["translate", "calque"] },
  "brand-or-project":       { default: "transliterate", acceptable: ["transliterate", "keep_latin", "always_latin", "transliterate_with_translation"] },
  "person-name":            { default: "transliterate", acceptable: ["transliterate"] },
  "programming-language":   { default: "always_latin",  acceptable: ["always_latin"] },
  "os-platform":            { default: "always_latin",  acceptable: ["always_latin"] },
  "cryptographic-primitive":{ default: "always_latin",  acceptable: ["always_latin"] },
  "network-name":           { default: "transliterate", acceptable: ["transliterate", "keep_latin", "always_latin"] },
  "file-extension":         { default: "always_latin",  acceptable: ["always_latin"] },
  "cli-command":            { default: "always_latin",  acceptable: ["always_latin"] },
  "ticker-or-standard":     { default: "always_latin",  acceptable: ["always_latin"] },
  identifier:               { default: "always_latin",  acceptable: ["always_latin"] },
}

// Known-name lists for high-confidence term_role assignment.
// Conservative; misses default to "needs review" rather than wrong-confident.
const KNOWN_PROGRAMMING_LANGUAGES = new Set([
  "Solidity", "Vyper", "Python", "JavaScript", "TypeScript",
  "Rust", "Go", "Yul", "Huff", "Fe", "Cairo", "Move", "Sway",
  "C++", "Java", "Ruby",
])
const KNOWN_OS_PLATFORMS = new Set([
  "Linux", "macOS", "Windows", "iOS", "Android", "Ubuntu", "Debian",
])
const KNOWN_NETWORKS = new Set([
  "Sepolia", "Holesky", "Goerli", "Ropsten", "Rinkeby", "Kovan",
])
const CRYPTO_PRIM_RX = /^(Keccak|SHA[-\d]|BLS\b|secp256k1|ECDSA|EdDSA|AES|RSA|Poseidon|MiMC|Pedersen|Blake2|Schnorr)/i
const TICKER_RX = /^(ERC-?\d+|EIP-?\d+|BIP-?\d+)$/
const KNOWN_PEOPLE_SUBSTRINGS = [
  "Buterin", "Wood", "Dai", "Lubin", "Hoskinson", "Garzik", "Szilágyi", "Tual",
  "Jentzsch", "Nakamoto", "Larimer", "Hayden", "Adams",
]

// ----------------------------------------------------------------------------
// Loaders
// ----------------------------------------------------------------------------

function loadMaster() {
  const data = JSON.parse(readFileSync(DATA_FILE, "utf8"))
  if (!data.confirmed_terms) {
    throw new Error(`${DATA_FILE} has no confirmed_terms field`)
  }
  return data.confirmed_terms
}

function loadAllTranslations() {
  const out = {}
  for (const f of readdirSync(TRANS_DIR)) {
    if (!f.startsWith("glossary-") || !f.endsWith(".json")) continue
    const lang = f.slice("glossary-".length, -".json".length)
    out[lang] = JSON.parse(readFileSync(join(TRANS_DIR, f), "utf8"))
  }
  return out
}

// ----------------------------------------------------------------------------
// Heuristic term_role assignment
// ----------------------------------------------------------------------------

function inferTermRole(key, entry) {
  const term = (entry.term ?? key).trim()

  // HIGH confidence rules
  if (term.startsWith(".") && term.length > 1 && !/\s/.test(term)) {
    return { role: "file-extension", confidence: "HIGH" }
  }
  if (TICKER_RX.test(term)) {
    return { role: "ticker-or-standard", confidence: "HIGH" }
  }
  if (entry.casing === "uppercase" && term.length <= 5 && !/\s/.test(term)) {
    return { role: "ticker-or-standard", confidence: "HIGH" }
  }
  if (KNOWN_PROGRAMMING_LANGUAGES.has(term)) {
    return { role: "programming-language", confidence: "HIGH" }
  }
  if (KNOWN_OS_PLATFORMS.has(term)) {
    return { role: "os-platform", confidence: "HIGH" }
  }
  if (CRYPTO_PRIM_RX.test(term)) {
    return { role: "cryptographic-primitive", confidence: "HIGH" }
  }
  if (KNOWN_PEOPLE_SUBSTRINGS.some(s => term.includes(s))) {
    return { role: "person-name", confidence: "HIGH" }
  }

  // MEDIUM confidence rules
  if (KNOWN_NETWORKS.has(term)) {
    return { role: "network-name", confidence: "MEDIUM" }
  }
  const hasMidCap = /[a-z][A-Z]/.test(term)
  if (entry.casing === "fixed" && hasMidCap) {
    return { role: "brand-or-project", confidence: "MEDIUM" }
  }
  if (
    entry.casing === "fixed" &&
    (entry.script_rule === "keep_latin" || entry.script_rule === "always_latin")
  ) {
    return { role: "brand-or-project", confidence: "MEDIUM" }
  }
  if (entry.casing === "proper" && (entry.script_rule === "keep_latin" || entry.script_rule === "always_latin")) {
    return { role: "brand-or-project", confidence: "MEDIUM" }
  }

  // LOW confidence (needs review)
  if (entry.script_rule === "hybrid" || entry.script_rule === "context_dependent") {
    return { role: "NEEDS_REVIEW", confidence: "LOW", reason: "script_rule removed by v1; must be reassigned or entry split" }
  }
  if (entry.casing === "proper") {
    return { role: "NEEDS_REVIEW", confidence: "LOW", reason: "proper-cased; brand/person/network ambiguous" }
  }

  // Default
  return { role: "concept", confidence: "MEDIUM" }
}

function isMismatch(entry, role) {
  if (role === "NEEDS_REVIEW") return true
  const info = ROLE_INFO[role]
  if (!info) return true
  return !info.acceptable.includes(entry.script_rule)
}

// ----------------------------------------------------------------------------
// Section: overview
// ----------------------------------------------------------------------------

function sectionOverview(entries, translations) {
  const lines = []
  lines.push("# ETHGlossary Audit Report")
  lines.push("")
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Master entries: **${entries.length}**`)
  lines.push(`Languages: **${Object.keys(translations).length}**`)
  lines.push(`Policy: v1 (locked 2026-05-10) -- see \`.agents/skills/ethglossary/references/translation-policy.md\``)
  lines.push("")
  lines.push("All term_role assignments below are **heuristic** -- they need human review (and Gemini consultation for language-specific calls) before being applied to the data.")
  lines.push("")
  return lines.join("\n")
}

// ----------------------------------------------------------------------------
// Section: script_rule
// ----------------------------------------------------------------------------

function sectionScriptRule(entries) {
  const lines = []
  lines.push("## 1. script_rule distribution")
  lines.push("")
  lines.push("Current values in `confirmed_terms` vs the v1 policy target enum.")
  lines.push("")
  const counts = new Map()
  for (const [, v] of entries) {
    counts.set(v.script_rule, (counts.get(v.script_rule) ?? 0) + 1)
  }
  lines.push("| script_rule | count | v1 status |")
  lines.push("|---|---:|---|")
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  for (const [rule, n] of sorted) {
    let status
    if (rule === "hybrid" || rule === "context_dependent") {
      status = "**REMOVE per v1 (reassign or split entries)**"
    } else if (V1_SCRIPT_RULES.has(rule)) {
      status = "kept in v1"
    } else {
      status = "unknown -- not in any enum"
    }
    lines.push(`| \`${rule}\` | ${n} | ${status} |`)
  }
  lines.push("")
  lines.push("v1 adds two values not yet present in any entry: `calque`, `transliterate_with_translation`.")
  lines.push("")

  // Listing of hybrid + context_dependent entries
  const needsMigration = entries
    .filter(([, v]) => v.script_rule === "hybrid" || v.script_rule === "context_dependent")
    .sort(([a], [b]) => a.localeCompare(b))

  lines.push(`### 1a. Entries needing migration off hybrid/context_dependent (${needsMigration.length})`)
  lines.push("")
  if (needsMigration.length === 0) {
    lines.push("None. Skip this section.")
  } else {
    lines.push("Per policy §5, terms whose handling genuinely varies by context should be **split into multiple entries** with distinct IDs (e.g. `gas-concept` vs `gas-limit-variable`). Reassigning to a single new value is also acceptable where context-dependence was overstated.")
    lines.push("")
    lines.push("| key | id | rule | category | casing | note |")
    lines.push("|---|---|---|---|---|---|")
    for (const [key, v] of needsMigration) {
      const note = (v.note ?? v.translation_note ?? "").slice(0, 80).replace(/\n/g, " ").replace(/\|/g, "\\|")
      lines.push(`| \`${key}\` | \`${v.id}\` | \`${v.script_rule}\` | \`${v.category}\` | \`${v.casing}\` | ${note || "(none)"} |`)
    }
  }
  lines.push("")
  return lines.join("\n")
}

// ----------------------------------------------------------------------------
// Section: category (topical)
// ----------------------------------------------------------------------------

function sectionCategory(entries) {
  const lines = []
  lines.push("## 2. category distribution (currently topical)")
  lines.push("")
  lines.push("Note: the v1 policy uses `category` as **term role** (11 values). The current data uses `category` as a **topical** classifier (15 values). These are two different axes; the recommended migration is to add a new `term_role` field and keep `category` topical.")
  lines.push("")
  const counts = new Map()
  for (const [, v] of entries) counts.set(v.category, (counts.get(v.category) ?? 0) + 1)
  lines.push("| category | count |")
  lines.push("|---|---:|")
  for (const [cat, n] of Array.from(counts.entries()).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${cat}\` | ${n} |`)
  }
  lines.push("")
  return lines.join("\n")
}

// ----------------------------------------------------------------------------
// Section: casing
// ----------------------------------------------------------------------------

function sectionCasing(entries) {
  const lines = []
  lines.push("## 3. casing distribution")
  lines.push("")
  const counts = new Map()
  for (const [, v] of entries) counts.set(v.casing, (counts.get(v.casing) ?? 0) + 1)
  lines.push("| casing | count |")
  lines.push("|---|---:|")
  for (const [c, n] of Array.from(counts.entries()).sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${c}\` | ${n} |`)
  }
  lines.push("")
  return lines.join("\n")
}

// ----------------------------------------------------------------------------
// Section: heuristic term_role assignment
// ----------------------------------------------------------------------------

function sectionTermRole(entries) {
  const lines = []
  lines.push("## 4. Heuristic term_role assignments")
  lines.push("")
  lines.push("Each entry was assigned a `term_role` (v1 policy §4) using conservative heuristics. **All assignments need human review** before being written to data.")
  lines.push("")

  const assignments = entries.map(([key, v]) => ({
    key,
    entry: v,
    ...inferTermRole(key, v),
  }))

  // Distribution
  const roleCounts = new Map()
  for (const a of assignments) {
    const k = `${a.role} (${a.confidence})`
    roleCounts.set(k, (roleCounts.get(k) ?? 0) + 1)
  }
  lines.push("| proposed term_role (confidence) | count |")
  lines.push("|---|---:|")
  for (const [k, n] of Array.from(roleCounts.entries()).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${k} | ${n} |`)
  }
  lines.push("")

  // HIGH-confidence assignments listed in full
  const highs = assignments.filter(a => a.confidence === "HIGH")
  lines.push(`### 4a. HIGH-confidence assignments (${highs.length}) -- safe to apply with light review`)
  lines.push("")
  lines.push("| key | term | proposed role | current script_rule |")
  lines.push("|---|---|---|---|")
  for (const a of highs.sort((x, y) => x.role.localeCompare(y.role) || x.key.localeCompare(y.key))) {
    lines.push(`| \`${a.key}\` | ${a.entry.term} | \`${a.role}\` | \`${a.entry.script_rule}\` |`)
  }
  lines.push("")

  // MEDIUM-confidence
  const mediums = assignments.filter(a => a.confidence === "MEDIUM" && a.role !== "concept")
  lines.push(`### 4b. MEDIUM-confidence non-concept assignments (${mediums.length}) -- review individually`)
  lines.push("")
  if (mediums.length === 0) {
    lines.push("None.")
  } else {
    lines.push("| key | term | proposed role | current script_rule | casing |")
    lines.push("|---|---|---|---|---|")
    for (const a of mediums.sort((x, y) => x.role.localeCompare(y.role) || x.key.localeCompare(y.key))) {
      lines.push(`| \`${a.key}\` | ${a.entry.term} | \`${a.role}\` | \`${a.entry.script_rule}\` | \`${a.entry.casing}\` |`)
    }
  }
  lines.push("")

  // LOW (needs review)
  const lows = assignments.filter(a => a.confidence === "LOW")
  lines.push(`### 4c. LOW-confidence / NEEDS_REVIEW (${lows.length})`)
  lines.push("")
  if (lows.length === 0) {
    lines.push("None.")
  } else {
    lines.push("These entries need explicit human or Gemini judgment. Common reasons: proper-cased with non-translate rule; hybrid/context_dependent script_rule.")
    lines.push("")
    lines.push("| key | term | current script_rule | casing | reason |")
    lines.push("|---|---|---|---|---|")
    for (const a of lows.sort((x, y) => x.key.localeCompare(y.key))) {
      lines.push(`| \`${a.key}\` | ${a.entry.term} | \`${a.entry.script_rule}\` | \`${a.entry.casing}\` | ${a.reason ?? ""} |`)
    }
  }
  lines.push("")

  // Concept default count
  const concepts = assignments.filter(a => a.role === "concept")
  lines.push(`### 4d. Default concept assignment (${concepts.length})`)
  lines.push("")
  lines.push("Entries that fell through to the default `concept` role. The vast majority should be correct, but spot-check the boundary cases (proper-noun-looking terms, fixed-casing terms).")
  lines.push("")
  return lines.join("\n")
}

// ----------------------------------------------------------------------------
// Section: role/script_rule mismatches (policy §9.3 candidates)
// ----------------------------------------------------------------------------

function sectionMismatches(entries) {
  const lines = []
  lines.push("## 5. Role vs script_rule mismatches (policy §9.3 candidates)")
  lines.push("")
  lines.push("Entries where the heuristic-assigned term_role suggests a different `script_rule` than the entry currently has. These are the candidates for the 47-entry audit per policy §9.3.")
  lines.push("")

  const mismatches = []
  for (const [key, v] of entries) {
    const inf = inferTermRole(key, v)
    if (inf.confidence === "LOW") continue // already surfaced in 4c
    if (isMismatch(v, inf.role)) {
      mismatches.push({ key, entry: v, ...inf })
    }
  }

  if (mismatches.length === 0) {
    lines.push("None detected by heuristic. The 47-count from policy §9.3 may include LOW-confidence cases in section 4c -- review those too.")
  } else {
    lines.push(`Found **${mismatches.length}** candidates by heuristic.`)
    lines.push("")
    lines.push("| key | term | proposed role | current script_rule | role default | confidence |")
    lines.push("|---|---|---|---|---|---|")
    for (const m of mismatches.sort((x, y) => x.role.localeCompare(y.role) || x.key.localeCompare(y.key))) {
      const def = ROLE_INFO[m.role]?.default ?? "?"
      lines.push(`| \`${m.key}\` | ${m.entry.term} | \`${m.role}\` | \`${m.entry.script_rule}\` | \`${def}\` | ${m.confidence} |`)
    }
  }
  lines.push("")
  return lines.join("\n")
}

// ----------------------------------------------------------------------------
// Section: per-language coverage
// ----------------------------------------------------------------------------

function sectionCoverage(entries, translations) {
  const lines = []
  lines.push("## 6. Per-language translation coverage")
  lines.push("")
  lines.push("Coverage counts only translations whose keys match master entry keys (orphans excluded, matching the production API behavior).")
  lines.push("")

  const masterKeys = new Set(entries.map(([k]) => k))
  const langs = Object.keys(translations).sort()
  const total = entries.length

  lines.push("| lang | translated | % | high | medium | low | orphans |")
  lines.push("|---|---:|---:|---:|---:|---:|---:|")
  for (const lang of langs) {
    const t = translations[lang]
    let valid = 0, high = 0, medium = 0, low = 0, orphan = 0
    for (const [k, v] of Object.entries(t)) {
      if (masterKeys.has(k)) {
        valid++
        const c = v.confidence ?? "high"
        if (c === "high") high++
        else if (c === "medium") medium++
        else if (c === "low") low++
      } else {
        orphan++
      }
    }
    const pct = Math.round((valid / total) * 100)
    lines.push(`| ${lang} | ${valid} | ${pct}% | ${high} | ${medium} | ${low} | ${orphan} |`)
  }
  lines.push("")
  return lines.join("\n")
}

// ----------------------------------------------------------------------------
// Section: orphan translation keys
// ----------------------------------------------------------------------------

function sectionOrphans(entries, translations) {
  const lines = []
  lines.push("## 7. Orphan translation keys")
  lines.push("")
  lines.push("Translation entries whose keys do not match any current master entry. These are leftovers from prior pruning passes -- filtered at the API layer, but accumulate over time.")
  lines.push("")

  const masterKeys = new Set(entries.map(([k]) => k))
  const orphanByKey = new Map() // key -> Set of langs where it appears

  for (const [lang, t] of Object.entries(translations)) {
    for (const k of Object.keys(t)) {
      if (!masterKeys.has(k)) {
        if (!orphanByKey.has(k)) orphanByKey.set(k, new Set())
        orphanByKey.get(k).add(lang)
      }
    }
  }

  if (orphanByKey.size === 0) {
    lines.push("None. Translation files are clean.")
  } else {
    const sorted = Array.from(orphanByKey.entries()).sort((a, b) => b[1].size - a[1].size)
    lines.push(`Found ${orphanByKey.size} orphan keys across all languages.`)
    lines.push("")
    lines.push("| orphan key | appears in (lang count) | langs |")
    lines.push("|---|---:|---|")
    for (const [k, langs] of sorted) {
      const list = Array.from(langs).sort().join(", ")
      lines.push(`| \`${k}\` | ${langs.size} | ${list} |`)
    }
  }
  lines.push("")
  return lines.join("\n")
}

// ----------------------------------------------------------------------------
// Section: suggested next steps
// ----------------------------------------------------------------------------

function sectionNextSteps(entries) {
  const lines = []
  lines.push("## 8. Suggested next steps")
  lines.push("")
  const hybridCount = entries.filter(([, v]) => v.script_rule === "hybrid" || v.script_rule === "context_dependent").length
  lines.push(`1. **Schema enum cleanup** (single-file edit): update \`src/data/glossary-schema.json\`'s \`script_rule\` enum to the v1 target set. Add \`calque\`, \`always_latin\`, \`transliterate_with_translation\`; remove \`hybrid\`, \`context_dependent\`.`)
  lines.push(`2. **Migrate ${hybridCount} hybrid/context_dependent entries** per policy §5. See section 1a for the list. Decide per entry: split into multiple entries (preferred for genuinely context-varying terms) or reassign to a single new value.`)
  lines.push(`3. **Apply HIGH-confidence term_role assignments** (section 4a) as a single mechanical pass. These are unambiguous (tickers, programming languages, OS names, crypto primitives, file extensions).`)
  lines.push(`4. **Review MEDIUM-confidence assignments** (section 4b) one batch at a time. Many will be correct; the failures cluster around what counts as a "brand" vs "concept".`)
  lines.push(`5. **Resolve LOW-confidence / NEEDS_REVIEW entries** (section 4c) with Gemini consultation per entry.`)
  lines.push(`6. **Audit role/script_rule mismatches** (section 5) -- these are the policy §9.3 candidates. For non-Latin-script languages, transliterated forms may need to be added to per-language files where they are missing.`)
  lines.push(`7. **Optionally clean up orphan translation keys** (section 7) -- low priority since the API filters them.`)
  lines.push("")
  return lines.join("\n")
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

function main() {
  const master = loadMaster()
  const entries = Object.entries(master)
  const translations = loadAllTranslations()

  const arg = process.argv[2]
  const all = !arg || arg === "--all"

  const out = []
  if (all) out.push(sectionOverview(entries, translations))
  if (all || arg === "--section=script-rule")  out.push(sectionScriptRule(entries))
  if (all || arg === "--section=category")     out.push(sectionCategory(entries))
  if (all || arg === "--section=casing")       out.push(sectionCasing(entries))
  if (all || arg === "--section=term-role")    out.push(sectionTermRole(entries))
  if (all || arg === "--section=mismatches")   out.push(sectionMismatches(entries))
  if (all || arg === "--section=coverage")     out.push(sectionCoverage(entries, translations))
  if (all || arg === "--section=orphans")      out.push(sectionOrphans(entries, translations))
  if (all || arg === "--section=next-steps")   out.push(sectionNextSteps(entries))

  process.stdout.write(out.join("\n") + "\n")
}

main()
