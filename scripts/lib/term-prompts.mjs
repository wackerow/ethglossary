/**
 * Prompt assembly for scripts/propose-term.mjs.
 *
 * Every piece of policy in these prompts is sliced verbatim out of
 * docs/translation-policy.md at runtime -- none of it is paraphrased here.
 * That is the whole point: the locked policy is the source of truth, and a
 * prompt that restated it would drift the moment the doc changed.
 *
 * Worked examples come from the live data for the same reason. The shape the
 * model is asked to fill is demonstrated by real entries in the real files,
 * not by a template that can fall behind.
 */

import { LANG_BY_CODE, pluralCategories } from "./term-policy.mjs"

const PRODUCT_FRAMING = `ETHGlossary is the canonical source of truth for Ethereum-ecosystem terminology. Its consumers are the ethereum.org website and its translation pipeline, other Ethereum educational projects, and community translators, who query it instead of maintaining duplicate term banks. An entry added here propagates to localized educational content in 24 languages, so an entry that is merely plausible is worse than no entry at all.`

const NO_HTML = `Write the definition as plain prose. Do not emit HTML, markdown links, or /glossary/#anchor references -- some existing entries carry hand-authored cross-links, but inventing anchors that may not exist is worse than omitting them.`

/** Deterministic exemplar picks so the prompt is stable run to run. */
function pickMasterExemplars(terms) {
  const keys = Object.keys(terms).sort()
  const byRole = (role, preferred) => {
    if (preferred && terms[preferred]?.term_role === role) return preferred
    return keys.find((k) => terms[k].term_role === role && (terms[k].definition ?? "").length > 60) ?? null
  }
  return [
    byRole("concept", "validator"),
    byRole("brand-or-project", "metamask"),
    byRole("ticker-or-standard"),
    byRole("network-name"),
  ].filter(Boolean)
}

function pickTranslationExemplars(translations, terms) {
  const picks = []
  if (translations["validator"]) picks.push("validator")
  const brand = Object.keys(translations)
    .sort()
    .find((k) => terms[k]?.term_role === "brand-or-project" && translations[k])
  if (brand) picks.push(brand)
  return picks
}

function fence(label, body) {
  return `${label}\n\n\`\`\`json\n${body}\n\`\`\``
}

/**
 * Phase 1: propose the English master entry, or route the term to the
 * always-Latin flat list.
 */
export function buildMasterPrompt({
  term,
  hint,
  policy,
  casingDoc,
  terms,
  topicalCategories,
  flatListSemantics,
  existingKeys,
}) {
  const exemplars = pickMasterExemplars(terms).map((k) =>
    fence(`Existing entry \`${k}\` (term_role: ${terms[k].term_role}):`, JSON.stringify(terms[k], null, 2))
  )

  return `# Task

You are the terminology editor for ETHGlossary. Evaluate one candidate term and return a structured proposal for how it should be recorded.

${PRODUCT_FRAMING}

# Who reads the result

${policy.get("2")}

# Policy you must apply

${policy.get("4")}

${policy.get("5")}

${policy.get("7")}

# The \`casing\` field

${casingDoc}

# The \`category\` field

\`category\` is a *topical* axis, separate from \`term_role\`. Pick from the values already in use -- do not invent one:

${topicalCategories.map((c) => `- ${c}`).join("\n")}

# Placement: full entry, or always-Latin flat list

Not every term earns a full entry. A term with no established native-script form in any target language would get 24 hollow translation entries, which is why the flat list at \`src/data/always-latin-tokens.json\` exists. Source content matching a flat-list token still gets a keep-Latin hint from the API; it just carries no per-language data.

Set \`recommended_placement\` to \`always_latin_list\` when the term is a developer tool, a programming language, an OS or platform, a person with no widely-established transliteration, or a brand the local communities have not dubbed. Set it to \`master\` when the term is a concept that translates, or a brand, network, or person with real established forms in target languages.

Flat-list categories and what each implies:

${Object.entries(flatListSemantics)
  .map(([k, v]) => `- \`${k}\`: ${v}`)
  .join("\n")}

# Terms that must be refused

**Pattern-family instances.** \`ERC-20\`, \`EIP-1559\`, \`BIP-39\` and their siblings are numbered instances of families matched programmatically at request time. They are never added as individual entries. If the candidate is such an instance, set \`pattern_family\` to the family label (e.g. \`ERC\`) and stop -- leave the remaining fields at their least-committal valid values.

**Duplicates.** If the candidate is the same underlying concept as an existing entry, set \`duplicate_of\` to that entry's exact key and stop the same way. Different surface forms with genuinely different meanings are not duplicates. A term that is a *variant* of an existing entry (an acronym, a plural, a hyphenation) belongs in that entry's \`aliases\` or \`avoid\` list, not in a new entry -- flag it as a duplicate and say so in \`rationale\`.

# Existing canonical keys

These are the ${existingKeys.length} keys already in \`confirmed_terms\`. Check the candidate against them before anything else.

${existingKeys.join(", ")}

# Worked examples

The proposal is transposed into this shape by a script, so match the *content* depth of these entries, not their field names.

${exemplars.join("\n\n")}

# The candidate

**Term as dispatched:** \`${term}\`
${hint ? `\n**Context supplied by the maintainer:** ${hint}\n` : ""}
# Output contract

Return one JSON object. Conventions:

- Every field is required. Use an empty string \`""\` for a field that does not apply -- never null.
- \`canonical_term\` is the form the entry is keyed on. Use the spelling and capitalization the ecosystem actually uses. If the dispatched term is not itself the canonical form, put the dispatched form in \`aliases\` (if it is legitimate) or \`avoid\` (if it is a form to discourage), so it still resolves.
- \`forms_base\`: lowercase, hyphen-free, no affixes. \`proof-of-stake\` gives \`proof of stake\`.
- \`definition\`: one to three sentences, precise enough that a translator who does not know the term can render it correctly. ${NO_HTML}
- \`avoid\`: incorrect spellings, capitalizations, or hyphenations that appear in the wild and should be discouraged. \`on-chain\` is the avoid form of \`onchain\`.
- \`note\`: editorial guidance for English usage. **Required** if \`script_rule\` departs from the default for the chosen \`term_role\` -- state why.
- \`translation_note\`: what a translator needs to disambiguate this term. Name what it is NOT, if a near-miss exists.
- \`related_existing_terms\`: existing keys a reader of this entry would also want. Exact keys only.
- \`rationale\`: why this \`term_role\`, \`script_rule\`, and placement. This is read by a human in review.
- \`confidence\`: \`high\` only if you are confident the term is used as you describe across the ecosystem.`
}

/**
 * Phase 2: one language's translation entry, given the approved master entry.
 */
export function buildTranslationPrompt({
  langCode,
  master,
  policy,
  translations,
  terms,
  englishTerm,
}) {
  const lang = LANG_BY_CODE.get(langCode)
  const categories = pluralCategories(langCode)

  const exemplars = pickTranslationExemplars(translations, terms).map((k) =>
    fence(
      `Existing \`${langCode}\` entry for \`${k}\` (English script_rule: ${terms[k]?.script_rule ?? "unknown"}):`,
      JSON.stringify(translations[k], null, 2)
    )
  )

  const groupPolicy =
    lang.group === "latin"
      ? `${policy.get("3")}\n\n**${lang.name} is a Latin-script target.** Transliteration does not apply. Brand names stay Latin. Concept terms take their established ${lang.name} equivalent.`
      : policy.get(lang.policySection)

  return `# Task

Produce the **${lang.name} (\`${langCode}\`)** entry for one ETHGlossary term. Target script: ${lang.script}.

${PRODUCT_FRAMING}

# Who reads the result

${policy.get("2")}

# Policy for this language

${groupPolicy}

${policy.get("5")}

${policy.get("7")}

# The approved English entry

${fence("This is settled. Do not revisit the role or the script rule -- apply them.", JSON.stringify(master, null, 2))}

**Decided policy: \`script_rule: ${master.script_rule}\`, \`term_role: ${master.term_role}\`.**

${
  master.script_rule === "always_latin"
    ? `This term stays Latin in every language without exception. Return \`${englishTerm}\` verbatim as the term and in every context, and leave morphology, grammar, and plurals empty.`
    : master.script_rule === "keep_latin"
      ? `This term keeps its Latin form as an editorial choice. Return \`${englishTerm}\` as the term. Where the language's own grammar requires surrounding native-script material (an appositional head noun, a classifier, a gloss), put that in the relevant context field rather than inflecting the Latin form.`
      : `Render this term in ${lang.script}${lang.group === "latin" ? "" : " -- returning the English form here would be a policy violation"}. Apply \`${master.script_rule}\` as defined above.`
}

# Worked examples in this exact format

${exemplars.length ? exemplars.join("\n\n") : "_No existing entry available as an example; follow the output contract precisely._"}

# Plural categories

${langCode} uses these CLDR categories: ${categories.join(", ")}. Return forms only for these; anything else is discarded.

# Output contract

Return one JSON object. Conventions:

- Every field is required. Use an empty string \`""\` for anything that does not apply to this language -- never null. Empty is the correct answer for a grammatical feature the language lacks; inventing a value is not.
- \`term\`: the primary form, as it would appear in a glossary listing.
- \`aliases\`: other valid renderings a reader may encounter. Empty array if none.
- \`transliteration\`: romanization of \`term\`, for maintainers who do not read ${lang.script}.${lang.group === "latin" ? " Leave empty for a Latin-script language." : ""}
- \`policy_applied\`: which \`script_rule\` value you actually applied. Normally this echoes the decided policy; if the language forces something else, say so here and explain in \`notes\`.
- \`noun_singular\` / \`noun_plural\` / \`verb_infinitive\` / \`verb_participle\` / \`adjective\` / \`agent\` / \`negation\`: the morphological forms a pipeline needs to place this term in running prose. Empty where the language has no such form.
- \`compounds\`: common multi-word constructions built on this term, as \`english\` / \`translated\` pairs. Empty array if none are established.
- \`context_prose\`: the form used in running text, inflected as it would naturally appear. \`context_prose_example\` is one short sentence using it -- real ${lang.name}, not a gloss.
- \`context_heading\`: the form used in a page heading, with heading capitalization conventions applied. \`context_tag\`: a short label. \`context_ui\`: a button or menu label. These genuinely differ in some languages; return the same form where they do not.
- \`gender\` / \`animacy\` / \`part_of_speech\` / \`formality\`: grammatical metadata. Empty where the category does not exist in ${lang.name}.
- \`notes\`: anything a reviewer needs -- a contested rendering, a regional split, an established form you deliberately did not use. Empty if there is nothing to say.
- \`confidence\`: \`high\` only if this rendering is in established use in ${lang.name} Ethereum content. \`medium\` if you are constructing it by policy. \`low\` if you are guessing -- a \`low\` here routes the entry to a native-speaker review queue, which is the correct outcome for a guess.`
}
