/**
 * Wire schemas, validation, and deterministic shaping for term proposals.
 *
 * The contract with the model is deliberately narrow: it supplies *values*,
 * this file supplies *structure*. Nothing the model returns is ever spread
 * into the data files. Every entry written to src/data is constructed here
 * field by field, so a model that invents a key, drops a key, or reorders
 * anything cannot change the shape of the glossary.
 *
 * Two conventions make the wire format strict-schema friendly:
 *   - No nulls. An empty string means "not applicable"; this file converts
 *     "" to null where the data format uses null.
 *   - No free-form maps. Compounds and plurals arrive as arrays of fixed-key
 *     objects and are folded into objects here.
 *
 * Invariants enforced regardless of what the model says:
 *   - contexts.code.term is always the English Latin form (policy 6.x: code
 *     identifiers are always Latin).
 *   - script_rule: always_latin forces every context to the English form in
 *     all 24 languages (policy 7.1, "without exception").
 *   - transliteration is null for Latin-script languages (policy 3).
 *   - plurals carry only the CLDR categories the language actually has.
 */

import {
  ALIAS_STATUSES,
  CASING_VALUES,
  CONFIDENCE_VALUES,
  FLAT_LIST_CATEGORIES,
  LANG_BY_CODE,
  PLACEMENTS,
  ROLE_INFO,
  TERM_ROLES,
  V1_SCRIPT_RULES,
  isLatinScript,
  pluralCategories,
} from "./term-policy.mjs"

// ---------------------------------------------------------------------------
// Wire schemas
// ---------------------------------------------------------------------------

const str = { type: "string" }
const strEnum = (values) => ({ type: "string", enum: values })

/** Phase 1: the English master-entry proposal. */
export function masterProposalSchema(topicalCategories) {
  const properties = {
    canonical_term: str,
    recommended_placement: strEnum(PLACEMENTS),
    flat_list_category: strEnum([...FLAT_LIST_CATEGORIES, ""]),
    term_role: strEnum(TERM_ROLES),
    category: strEnum(topicalCategories),
    script_rule: strEnum(V1_SCRIPT_RULES),
    casing: strEnum(CASING_VALUES),
    definition: str,
    forms_base: str,
    aliases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "status", "note"],
        properties: { term: str, status: strEnum(ALIAS_STATUSES), note: str },
      },
    },
    avoid: { type: "array", items: str },
    note: str,
    translation_note: str,
    related_existing_terms: { type: "array", items: str },
    duplicate_of: str,
    pattern_family: str,
    rationale: str,
    confidence: strEnum(CONFIDENCE_VALUES),
  }
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  }
}

/** Phase 2: one language's translation entry. */
export function translationSchema(cldrCategories) {
  const properties = {
    term: str,
    aliases: { type: "array", items: str },
    transliteration: str,
    policy_applied: strEnum(V1_SCRIPT_RULES),
    noun_singular: str,
    noun_plural: str,
    verb_infinitive: str,
    verb_participle: str,
    adjective: str,
    agent: str,
    negation: str,
    compounds: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["english", "translated"],
        properties: { english: str, translated: str },
      },
    },
    context_prose: str,
    context_prose_example: str,
    context_heading: str,
    context_tag: str,
    context_ui: str,
    gender: str,
    animacy: str,
    part_of_speech: str,
    formality: str,
    plurals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "form"],
        properties: { category: strEnum(cldrCategories), form: str },
      },
    },
    confidence: strEnum(CONFIDENCE_VALUES),
    notes: str,
  }
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  }
}

// ---------------------------------------------------------------------------
// Script detection
// ---------------------------------------------------------------------------

/**
 * Does this language's own script appear in the string?
 *
 * Used to catch the most common failure mode: a model returning the English
 * form for a language whose policy demands native script. Deterministic, so
 * it can drive a retry instead of a human noticing in review.
 */
const NATIVE_SCRIPT = {
  ar: /\p{Script=Arabic}/u,
  ur: /\p{Script=Arabic}/u,
  bn: /\p{Script=Bengali}/u,
  hi: /\p{Script=Devanagari}/u,
  mr: /\p{Script=Devanagari}/u,
  ta: /\p{Script=Tamil}/u,
  te: /\p{Script=Telugu}/u,
  ru: /\p{Script=Cyrillic}/u,
  uk: /\p{Script=Cyrillic}/u,
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  ko: /\p{Script=Hangul}/u,
  zh: /\p{Script=Han}/u,
  "zh-tw": /\p{Script=Han}/u,
}

/** script_rule values that require the target script to appear in the output. */
const REQUIRES_NATIVE_SCRIPT = new Set([
  "translate",
  "calque",
  "transliterate",
  "transliterate_with_translation",
])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clean = (v) => (typeof v === "string" ? v.trim() : "")
const nullIfEmpty = (v) => {
  const c = clean(v)
  return c === "" ? null : c
}

/** kebab-case slug, matching the existing ids in glossary-terms-enhanced.json. */
export function deriveId(term) {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Canonical master key: the term name, lowercased (never the id slug). */
export function deriveMasterKey(term) {
  return term.trim().toLowerCase()
}

/** forms.base: lowercase, hyphen-free, whitespace-collapsed (docs/data-shape.md). */
export function normalizeFormsBase(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Roles where policy 7.1 admits no exception. A non-always_latin script_rule
 * here is a hard error, not an override-with-rationale.
 */
const HARD_ALWAYS_LATIN_ROLES = new Set([
  "programming-language",
  "os-platform",
  "cryptographic-primitive",
  "file-extension",
  "cli-command",
  "ticker-or-standard",
  "identifier",
])

// ---------------------------------------------------------------------------
// Phase 1 validation
// ---------------------------------------------------------------------------

/**
 * Reasons to stop rather than retry.
 *
 * A model that sets duplicate_of or pattern_family is doing its job: it found
 * that the candidate should not become an entry at all. Feeding that back as a
 * validation failure would burn retries arguing with a correct answer, so these
 * short-circuit ahead of validation. The remaining fields are explicitly
 * unreliable in this case -- the prompt tells the model to stop filling them in.
 */
export function checkMasterRefusals(raw) {
  const p = raw ?? {}
  const duplicate = clean(p.duplicate_of)
  if (duplicate)
    return (
      `the proposal flags "${duplicate}" as an existing entry for the same concept. A variant of an existing ` +
      `term -- an acronym, a plural, a different hyphenation -- belongs in that entry's aliases or avoid list. ` +
      `See "Update a translation" and "Dedup two entries" in docs/common-fixes.md.` +
      (clean(p.rationale) ? `\n\nModel rationale: ${clean(p.rationale)}` : "")
    )
  const family = clean(p.pattern_family)
  if (family)
    return (
      `the proposal flags this as an instance of the "${family}" pattern family. Per AGENTS.md "DRY pattern ` +
      `families" these are matched at request time by STANDARD_PATTERNS in src/lib/content-filter.ts and never ` +
      `added as per-instance entries. If the family itself is missing, add it there instead.` +
      (clean(p.rationale) ? `\n\nModel rationale: ${clean(p.rationale)}` : "")
    )
  return null
}

/**
 * Validate a master proposal against policy. Returns errors (retry-worthy or
 * fatal) and warnings (surfaced in the PR body for a human to weigh).
 */
export function validateMasterProposal(raw, { inputTerm, topicalCategories }) {
  const errors = []
  const warnings = []
  const p = raw ?? {}

  const canonical = clean(p.canonical_term)
  if (!canonical) errors.push("canonical_term is empty")

  if (!PLACEMENTS.includes(p.recommended_placement))
    errors.push(`recommended_placement must be one of ${PLACEMENTS.join(", ")}`)
  if (!TERM_ROLES.includes(p.term_role)) errors.push(`term_role "${p.term_role}" is not in the policy taxonomy`)
  if (!topicalCategories.includes(p.category))
    errors.push(`category "${p.category}" is not one of the existing topical categories`)
  if (!V1_SCRIPT_RULES.includes(p.script_rule))
    errors.push(`script_rule "${p.script_rule}" is not in the v1 enum`)
  if (!CASING_VALUES.includes(p.casing)) errors.push(`casing "${p.casing}" is invalid`)
  if (!CONFIDENCE_VALUES.includes(p.confidence)) errors.push(`confidence "${p.confidence}" is invalid`)

  const definition = clean(p.definition)
  if (definition.length < 40)
    errors.push("definition is too short to be useful (needs at least 40 characters)")

  if (!clean(p.rationale)) errors.push("rationale is empty")

  // The dispatched surface form must resolve to this entry once merged,
  // otherwise the term the maintainer asked for silently stays unfindable.
  const surfaces = new Set([
    canonical.toLowerCase(),
    normalizeFormsBase(p.forms_base),
    ...(Array.isArray(p.aliases) ? p.aliases.map((a) => clean(a?.term).toLowerCase()) : []),
    ...(Array.isArray(p.avoid) ? p.avoid.map((a) => clean(a).toLowerCase()) : []),
  ])
  const asked = inputTerm.trim().toLowerCase()
  if (!surfaces.has(asked) && !surfaces.has(normalizeFormsBase(asked))) {
    errors.push(
      `the dispatched term "${inputTerm}" does not appear as the canonical form, an alias, or an avoid entry, ` +
        `so it would not resolve after merge -- add it to aliases or avoid, or make it the canonical form`
    )
  }

  // Placement coherence.
  if (p.recommended_placement === "always_latin_list") {
    if (!FLAT_LIST_CATEGORIES.includes(p.flat_list_category))
      errors.push(`flat_list_category must be set to one of ${FLAT_LIST_CATEGORIES.join(", ")} for always_latin_list placement`)
  } else if (clean(p.flat_list_category)) {
    errors.push("flat_list_category must be empty for master placement")
  }

  // Role / script_rule coherence.
  const role = ROLE_INFO[p.term_role]
  if (role && !role.acceptable.includes(p.script_rule)) {
    if (HARD_ALWAYS_LATIN_ROLES.has(p.term_role)) {
      errors.push(
        `term_role "${p.term_role}" is always_latin without exception per policy 7.1, but script_rule is "${p.script_rule}"`
      )
    } else if (!clean(p.note)) {
      errors.push(
        `script_rule "${p.script_rule}" departs from the default for role "${p.term_role}" ` +
          `(acceptable: ${role.acceptable.join(", ")}) -- a departure requires a written rationale in note`
      )
    } else {
      warnings.push(
        `script_rule "${p.script_rule}" departs from the "${p.term_role}" default "${role.default}"; rationale recorded in note`
      )
    }
  }

  // Casing plausibility. Advisory: the data uses all four values and the
  // model is often right about midcaps the regex would misread.
  if (canonical) {
    const expected =
      /^[A-Z0-9.\-\s]+$/.test(canonical) && /[A-Z]/.test(canonical)
        ? "uppercase"
        : /[a-z][A-Z]/.test(canonical)
          ? "fixed"
          : null
    if (expected && p.casing !== expected)
      warnings.push(`casing is "${p.casing}"; the surface form of "${canonical}" looks like "${expected}"`)
  }

  const derivedBase = normalizeFormsBase(canonical)
  const givenBase = normalizeFormsBase(p.forms_base)
  if (givenBase && derivedBase && givenBase !== derivedBase)
    warnings.push(`forms.base "${givenBase}" differs from the form derived from the term ("${derivedBase}")`)

  return { errors, warnings }
}

// ---------------------------------------------------------------------------
// Phase 2 validation
// ---------------------------------------------------------------------------

export function validateTranslation(raw, { langCode, master, englishTerm }) {
  const errors = []
  const warnings = []
  const t = raw ?? {}

  const term = clean(t.term)
  if (!term) errors.push("term is empty")
  if (!V1_SCRIPT_RULES.includes(t.policy_applied))
    errors.push(`policy_applied "${t.policy_applied}" is not in the v1 script_rule enum`)
  if (!CONFIDENCE_VALUES.includes(t.confidence)) errors.push(`confidence "${t.confidence}" is invalid`)

  const nativeRe = NATIVE_SCRIPT[langCode]
  const needsNative = nativeRe && REQUIRES_NATIVE_SCRIPT.has(master.script_rule)

  if (needsNative && term && !nativeRe.test(term)) {
    errors.push(
      `script_rule "${master.script_rule}" requires the ${LANG_BY_CODE.get(langCode).script} script, ` +
        `but term "${term}" contains none of it`
    )
  }

  if (master.script_rule === "always_latin" && term && term.toLowerCase() !== englishTerm.toLowerCase()) {
    // Not an error: the writer forces the English form anyway. Worth saying.
    warnings.push(`always_latin term was returned as "${term}"; forced back to "${englishTerm}"`)
  }

  if (needsNative && !clean(t.transliteration))
    warnings.push("transliteration is empty for a non-Latin-script language")

  const allowed = new Set(pluralCategories(langCode))
  const given = Array.isArray(t.plurals) ? t.plurals : []
  const extras = given.map((x) => clean(x?.category)).filter((c) => c && !allowed.has(c))
  if (extras.length)
    warnings.push(`dropped plural categories not used by ${langCode}: ${[...new Set(extras)].join(", ")}`)

  return { errors, warnings }
}

// ---------------------------------------------------------------------------
// Deterministic builders
// ---------------------------------------------------------------------------

/**
 * Build the master entry. Field order mirrors the entries added by
 * scripts/ingest-gemini-review.mjs so diffs against neighbouring entries stay
 * readable. Counters start at zero: this term has no measured content usage
 * yet, and inventing numbers would corrupt the signal content_occurrences
 * carries during dedup decisions.
 */
export function buildMasterEntry(proposal, { sourceTag }) {
  const term = clean(proposal.canonical_term)
  const aliases = (Array.isArray(proposal.aliases) ? proposal.aliases : [])
    .map((a) => {
      const t = clean(a?.term)
      if (!t) return null
      const status = ALIAS_STATUSES.includes(a?.status) ? a.status : "accepted"
      const note = clean(a?.note)
      return note ? { term: t, status, note } : { term: t, status }
    })
    .filter(Boolean)

  const avoid = [...new Set((Array.isArray(proposal.avoid) ? proposal.avoid : []).map(clean).filter(Boolean))]
  const note = clean(proposal.note)
  const translationNote = clean(proposal.translation_note)
  const formsBase = normalizeFormsBase(proposal.forms_base) || normalizeFormsBase(term)

  return {
    id: deriveId(term),
    term,
    category: proposal.category,
    term_role: proposal.term_role,
    definition: clean(proposal.definition),
    has_tooltip: true,
    in_glossary: true,
    content_occurrences: 0,
    content_files: 0,
    intl_keys: 0,
    sources: ["proposed", sourceTag],
    forms: { base: formsBase },
    script_rule: proposal.script_rule,
    casing: proposal.casing,
    aliases,
    ...(avoid.length ? { avoid } : {}),
    ...(note ? { note } : {}),
    ...(translationNote ? { translation_note: translationNote } : {}),
  }
}

/**
 * Build one language's translation entry.
 *
 * `englishTerm` is the canonical English form and is used wherever policy
 * demands Latin: the code context always, and every context when the entry is
 * always_latin.
 */
export function buildTranslationEntry(raw, { langCode, master, englishTerm, sourceTag, updated }) {
  const alwaysLatin = master.script_rule === "always_latin"
  const pick = (v) => (alwaysLatin ? englishTerm : clean(v) || englishTerm)

  const term = pick(raw.term)

  const compounds = {}
  for (const c of Array.isArray(raw.compounds) ? raw.compounds : []) {
    const key = clean(c?.english)
    const value = clean(c?.translated)
    if (key && value) compounds[key] = alwaysLatin ? key : value
  }

  const noun = clean(raw.noun_singular)
    ? {
        singular: pick(raw.noun_singular),
        ...(clean(raw.noun_plural) && !alwaysLatin ? { plural: clean(raw.noun_plural) } : {}),
      }
    : null

  const verb =
    !alwaysLatin && (clean(raw.verb_infinitive) || clean(raw.verb_participle))
      ? {
          ...(clean(raw.verb_infinitive) ? { infinitive: clean(raw.verb_infinitive) } : {}),
          ...(clean(raw.verb_participle) ? { participle: clean(raw.verb_participle) } : {}),
        }
      : null

  const allowed = new Set(pluralCategories(langCode))
  const plurals = {}
  for (const entry of Array.isArray(raw.plurals) ? raw.plurals : []) {
    const category = clean(entry?.category)
    const form = clean(entry?.form)
    if (category && form && allowed.has(category)) plurals[category] = form
  }

  return {
    term,
    aliases: alwaysLatin
      ? []
      : [...new Set((Array.isArray(raw.aliases) ? raw.aliases : []).map(clean).filter(Boolean))],
    // Transliteration is not applicable to Latin-script targets (policy 3),
    // and meaningless for a term that stays Latin everywhere.
    transliteration: isLatinScript(langCode) || alwaysLatin ? null : nullIfEmpty(raw.transliteration),
    morphology: {
      noun,
      verb,
      adjective: alwaysLatin ? null : nullIfEmpty(raw.adjective),
      agent: alwaysLatin ? null : nullIfEmpty(raw.agent),
      negation: alwaysLatin ? null : nullIfEmpty(raw.negation),
      compounds,
    },
    contexts: {
      prose: {
        term: pick(raw.context_prose),
        ...(clean(raw.context_prose_example) ? { example: clean(raw.context_prose_example) } : {}),
      },
      heading: { term: pick(raw.context_heading) },
      tag: { term: pick(raw.context_tag) },
      ui: { term: pick(raw.context_ui) },
      // Code identifiers are always Latin, in every language, without exception.
      code: { term: englishTerm },
    },
    grammar: {
      gender: alwaysLatin ? null : nullIfEmpty(raw.gender),
      animacy: alwaysLatin ? null : nullIfEmpty(raw.animacy),
      part_of_speech: nullIfEmpty(raw.part_of_speech),
      formality: nullIfEmpty(raw.formality),
    },
    plurals: Object.keys(plurals).length ? plurals : null,
    source: sourceTag,
    confidence: CONFIDENCE_VALUES.includes(raw.confidence) ? raw.confidence : "low",
    notes: nullIfEmpty(raw.notes),
    updated,
  }
}

/**
 * Latin-form entry used when generation for a language fails after retries.
 * Mirrors the existing convention that every master entry has an entry in
 * every translation file, and marks itself low-confidence so the PR body and
 * any later audit can single it out for a human.
 */
export function buildFallbackTranslationEntry(englishTerm, { reason, sourceTag, updated }) {
  return {
    term: englishTerm,
    aliases: [],
    transliteration: null,
    morphology: { noun: null, verb: null, adjective: null, agent: null, negation: null, compounds: {} },
    contexts: {
      prose: { term: englishTerm },
      heading: { term: englishTerm },
      tag: { term: englishTerm },
      ui: { term: englishTerm },
      code: { term: englishTerm },
    },
    grammar: { gender: null, animacy: null, part_of_speech: null, formality: null },
    plurals: null,
    source: sourceTag,
    confidence: "low",
    notes: `Latin form placeholder -- generation failed (${reason}). Needs a native-speaker pass.`,
    updated,
  }
}
