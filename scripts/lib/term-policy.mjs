/**
 * Policy constants and doc slicing for the term-proposal workflow.
 *
 * Nothing in here is a restatement of policy. The enums mirror
 * docs/translation-policy.md sections 4 and 5 so the script can *reject*
 * out-of-policy values; the prose handed to the model is sliced verbatim out
 * of the doc at runtime, so the prompt cannot drift from the locked policy.
 *
 * scripts/audit-glossary.mjs carries its own copy of V1_SCRIPT_RULES and
 * ROLE_INFO (it predates this file). They must stay in agreement; if you
 * change the policy, change both. The authoritative source is the doc.
 */

import { readFileSync } from "node:fs"

// ---------------------------------------------------------------------------
// Enums (docs/translation-policy.md sections 4, 5; docs/data-shape.md casing)
// ---------------------------------------------------------------------------

export const V1_SCRIPT_RULES = [
  "translate",
  "calque",
  "transliterate",
  "keep_latin",
  "always_latin",
  "transliterate_with_translation",
]

/**
 * Term roles with their default script_rule and the values that are
 * defensible for that role. A value outside `acceptable` is not rejected --
 * policy section 4 allows per-entry overrides -- but it must come with a
 * written rationale in `note`, which is enforced in shape-term.mjs.
 */
export const ROLE_INFO = {
  concept: { default: "translate", acceptable: ["translate", "calque"] },
  "brand-or-project": {
    default: "transliterate",
    acceptable: [
      "transliterate",
      "keep_latin",
      "always_latin",
      "transliterate_with_translation",
    ],
  },
  "person-name": { default: "transliterate", acceptable: ["transliterate"] },
  "programming-language": { default: "always_latin", acceptable: ["always_latin"] },
  "os-platform": { default: "always_latin", acceptable: ["always_latin"] },
  "cryptographic-primitive": { default: "always_latin", acceptable: ["always_latin"] },
  "network-name": {
    default: "transliterate",
    acceptable: ["transliterate", "keep_latin", "always_latin"],
  },
  "file-extension": { default: "always_latin", acceptable: ["always_latin"] },
  "cli-command": { default: "always_latin", acceptable: ["always_latin"] },
  "ticker-or-standard": { default: "always_latin", acceptable: ["always_latin"] },
  identifier: { default: "always_latin", acceptable: ["always_latin"] },
}

export const TERM_ROLES = Object.keys(ROLE_INFO)

export const CASING_VALUES = ["standard", "proper", "uppercase", "fixed"]

export const CONFIDENCE_VALUES = ["high", "medium", "low"]

export const ALIAS_STATUSES = ["preferred", "accepted", "deprecated"]

export const PLACEMENTS = ["master", "always_latin_list"]

/** Categories of src/data/always-latin-tokens.json (excluding _metadata). */
export const FLAT_LIST_CATEGORIES = [
  "programming_languages",
  "os_platforms",
  "dev_tools",
  "brands",
  "people",
  "ticker_standards",
]

/**
 * Identifier families handled by STANDARD_PATTERNS in src/lib/content-filter.ts.
 * A term matching one of these is a pattern *instance*, not a glossary entry --
 * see AGENTS.md "DRY pattern families". The script refuses these outright
 * rather than spending tokens learning it from the model.
 */
export const PATTERN_FAMILY_INSTANCE = /^\s*(ERC|EIP|BIP|RIP|CIP)[-\s]?\d+\s*$/i

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

/**
 * The 24 target languages, with the policy section that governs each.
 *
 * `group` is the policy section 6 grouping; `policySection` is the section key
 * sliced out of the doc for that language's prompt. Latin-script languages
 * have no section 6 subsection -- transliteration is not applicable to them
 * (policy section 3) -- so they get section 3 instead.
 *
 * `intl` is the BCP-47 tag used for Intl.PluralRules, which is where the CLDR
 * plural categories come from. Never hardcode plural categories; derive them.
 */
export const LANGUAGES = [
  { code: "ar", name: "Arabic", script: "Arabic (Naskh)", group: "rtl", policySection: "6.3", intl: "ar" },
  { code: "bn", name: "Bengali", script: "Bengali", group: "indic", policySection: "6.1", intl: "bn" },
  { code: "cs", name: "Czech", script: "Latin", group: "latin", policySection: "3", intl: "cs" },
  { code: "de", name: "German", script: "Latin", group: "latin", policySection: "3", intl: "de" },
  { code: "es", name: "Spanish", script: "Latin", group: "latin", policySection: "3", intl: "es" },
  { code: "fr", name: "French", script: "Latin", group: "latin", policySection: "3", intl: "fr" },
  { code: "hi", name: "Hindi", script: "Devanagari", group: "indic", policySection: "6.1", intl: "hi" },
  { code: "id", name: "Indonesian", script: "Latin", group: "latin", policySection: "3", intl: "id" },
  { code: "it", name: "Italian", script: "Latin", group: "latin", policySection: "3", intl: "it" },
  { code: "ja", name: "Japanese", script: "Japanese (Katakana/Kanji)", group: "cjk-phonetic", policySection: "6.4", intl: "ja" },
  { code: "ko", name: "Korean", script: "Hangul", group: "cjk-phonetic", policySection: "6.4", intl: "ko" },
  { code: "mr", name: "Marathi", script: "Devanagari", group: "indic", policySection: "6.1", intl: "mr" },
  { code: "pl", name: "Polish", script: "Latin", group: "latin", policySection: "3", intl: "pl" },
  { code: "pt-br", name: "Portuguese (Brazil)", script: "Latin", group: "latin", policySection: "3", intl: "pt-BR" },
  { code: "ru", name: "Russian", script: "Cyrillic", group: "cyrillic", policySection: "6.2", intl: "ru" },
  { code: "sw", name: "Swahili", script: "Latin", group: "latin", policySection: "3", intl: "sw" },
  { code: "ta", name: "Tamil", script: "Tamil", group: "indic", policySection: "6.1", intl: "ta" },
  { code: "te", name: "Telugu", script: "Telugu", group: "indic", policySection: "6.1", intl: "te" },
  { code: "tr", name: "Turkish", script: "Latin", group: "latin", policySection: "3", intl: "tr" },
  { code: "uk", name: "Ukrainian", script: "Cyrillic", group: "cyrillic", policySection: "6.2", intl: "uk" },
  { code: "ur", name: "Urdu", script: "Arabic (Nastaliq)", group: "rtl", policySection: "6.3", intl: "ur" },
  { code: "vi", name: "Vietnamese", script: "Latin", group: "latin", policySection: "3", intl: "vi" },
  { code: "zh", name: "Chinese (Simplified)", script: "Han (Simplified)", group: "cjk-semantic", policySection: "6.5", intl: "zh-Hans" },
  { code: "zh-tw", name: "Chinese (Traditional)", script: "Han (Traditional)", group: "cjk-semantic", policySection: "6.5", intl: "zh-Hant" },
]

export const LANG_CODES = LANGUAGES.map((l) => l.code)

export const LANG_BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]))

/** Latin-script languages: transliteration is not applicable (policy section 3). */
export function isLatinScript(code) {
  return LANG_BY_CODE.get(code)?.group === "latin"
}

/** Canonical CLDR ordering. ICU reports categories alphabetically. */
const CLDR_ORDER = ["zero", "one", "two", "few", "many", "other"]

/**
 * CLDR plural categories this language actually uses, straight from ICU, in
 * canonical order. Used both to tell the model which keys to fill and to prune
 * keys it invents anyway -- so it must never be hardcoded per language.
 */
export function pluralCategories(code) {
  const lang = LANG_BY_CODE.get(code)
  if (!lang) throw new Error(`Unknown language code: ${code}`)
  const found = new Set(new Intl.PluralRules(lang.intl).resolvedOptions().pluralCategories)
  return CLDR_ORDER.filter((c) => found.has(c))
}

// ---------------------------------------------------------------------------
// Markdown section slicing
// ---------------------------------------------------------------------------

/**
 * Index a markdown doc by numbered heading, e.g. "2", "6.1".
 *
 * A section runs from its own heading to the next heading at the same or
 * shallower level, so slicing "6.1" does not drag in 6.2, and slicing "6"
 * would carry all of its subsections.
 */
function indexNumberedSections(md) {
  const lines = md.split("\n")
  const headings = []
  lines.forEach((line, i) => {
    const m = /^(#{2,4})\s+(\d+(?:\.\d+)*)\.?\s+(.+)$/.exec(line)
    if (m) headings.push({ level: m[1].length, key: m[2], title: m[3].trim(), line: i })
  })

  const sections = new Map()
  headings.forEach((h, idx) => {
    let end = lines.length
    for (let j = idx + 1; j < headings.length; j++) {
      if (headings[j].level <= h.level) {
        end = headings[j].line
        break
      }
    }
    sections.set(h.key, lines.slice(h.line, end).join("\n").trimEnd())
  })
  return sections
}

/**
 * Load docs/translation-policy.md and return a section lookup.
 *
 * Throws if any section the prompts depend on is missing, so renaming a
 * heading in the policy doc breaks the workflow loudly instead of quietly
 * shipping a prompt with the policy cut out of it.
 */
export function loadPolicySections(path) {
  const sections = indexNumberedSections(readFileSync(path, "utf8"))
  const required = ["2", "3", "4", "5", "6.1", "6.2", "6.3", "6.4", "6.5", "7"]
  const missing = required.filter((k) => !sections.has(k))
  if (missing.length) {
    throw new Error(
      `${path} is missing required section(s) ${missing.join(", ")}. ` +
        `The prompt builder slices policy by numbered heading; if the doc was ` +
        `restructured, update scripts/lib/term-policy.mjs to match.`
    )
  }
  return sections
}

/** Slice a single named section out of an arbitrary markdown doc. */
export function sliceSectionByTitle(path, title) {
  const md = readFileSync(path, "utf8")
  const lines = md.split("\n")
  const start = lines.findIndex(
    (l) => /^#{2,4}\s/.test(l) && l.replace(/^#+\s*/, "").trim() === title
  )
  if (start === -1) throw new Error(`No section titled "${title}" in ${path}`)
  const level = /^(#+)/.exec(lines[start])[1].length
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    const m = /^(#+)\s/.exec(lines[i])
    if (m && m[1].length <= level) {
      end = i
      break
    }
  }
  return lines.slice(start, end).join("\n").trimEnd()
}
