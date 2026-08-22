#!/usr/bin/env node
// Self-checks for the term-proposal pipeline. No network, no tokens, no writes.
//
//   node scripts/test-propose-term.mjs      (or: pnpm run test:propose-term)
//
// What this is actually guarding:
//
//   - Policy slicing. The prompts splice docs/translation-policy.md by numbered
//     heading. Renaming or renumbering a heading there would otherwise ship a
//     prompt with the policy silently cut out of it, and the output would still
//     look plausible. loadPolicySections throws on a missing section; these
//     checks catch the subtler failure where a section is present but bleeds
//     into its neighbour, or where a language is handed another group's rules.
//   - Deterministic shaping. Every invariant that holds regardless of what the
//     model returns: code contexts stay Latin, always_latin forces English
//     everywhere, transliteration is dropped for Latin-script targets, plurals
//     are pruned to the language's real CLDR categories, ids are derived.
//   - Policy validation. Each rejection path, including the ones a model is
//     most likely to trip: an out-of-enum script_rule, an always_latin role
//     given something else, a term that would not resolve after merge.
//
// Exits non-zero on the first failing run, so it works as a pre-commit gate.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, resolve } from "node:path"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const L = (p) => import(join(ROOT, p))

const policyMod = await L("scripts/lib/term-policy.mjs")
const shape = await L("scripts/lib/shape-term.mjs")
const prompts = await L("scripts/lib/term-prompts.mjs")
const llm = await L("scripts/lib/adapters.mjs")

const master = JSON.parse(readFileSync(join(ROOT, "src/data/glossary-terms-enhanced.json"), "utf8"))
const terms = master.confirmed_terms
const flat = JSON.parse(readFileSync(join(ROOT, "src/data/always-latin-tokens.json"), "utf8"))
const policy = policyMod.loadPolicySections(join(ROOT, "docs/translation-policy.md"))
const casingDoc = policyMod.sliceSectionByTitle(join(ROOT, "docs/data-shape.md"), "`casing` semantics")

let fails = 0
const check = (name, cond, detail = "") => {
  if (!cond) fails++
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? ` -- ${detail}` : ""}`)
}

console.log("=== policy slicing ===")
for (const k of ["2", "3", "4", "5", "6.1", "6.2", "6.3", "6.4", "6.5", "7"]) {
  const s = policy.get(k)
  check(`section ${k} sliced`, s && s.length > 200, `${s?.length ?? 0} chars, starts "${s?.split("\n")[0]}"`)
}
check("6.1 does not bleed into 6.2", !policy.get("6.1").includes("Cyrillic group"))
check("6.5 does not bleed into section 7", !policy.get("6.5").includes("Standards and tickers"))
check("casing doc sliced", casingDoc.includes("uppercase") && casingDoc.includes("fixed"), `${casingDoc.length} chars`)

console.log("\n=== CLDR plural categories from ICU ===")
for (const code of ["ar", "ru", "pl", "zh", "ja", "cs", "hi", "vi"]) {
  if (!policyMod.LANG_BY_CODE.has(code)) continue
  console.log(`  ${code}: ${policyMod.pluralCategories(code).join(", ")}`)
}
check("ar has 6 categories", policyMod.pluralCategories("ar").length === 6)
check("zh has only other", policyMod.pluralCategories("zh").join() === "other")
check("ru is in canonical CLDR order", policyMod.pluralCategories("ru").join() === "one,few,many,other", policyMod.pluralCategories("ru").join())
check("ar is in canonical CLDR order", policyMod.pluralCategories("ar").join() === "zero,one,two,few,many,other", policyMod.pluralCategories("ar").join())

console.log("\n=== prompt assembly ===")
const topicalCategories = [...new Set(Object.values(terms).map((t) => t.category))].sort()
const p1 = prompts.buildMasterPrompt({
  term: "based rollup",
  hint: "L2 that inherits sequencing from L1 proposers",
  policy,
  casingDoc,
  terms,
  topicalCategories,
  flatListSemantics: flat._metadata.semantics,
  existingKeys: Object.keys(terms).sort(),
})
check("phase-1 prompt built", p1.length > 8000, `${p1.length} chars (~${Math.round(p1.length / 4)} tokens)`)
check("phase-1 carries audience section", p1.includes("ethereum.org reader profile"))
check("phase-1 carries role taxonomy", p1.includes("transliterate_with_translation"))
check("phase-1 carries always-latin cross-cutting", p1.includes("Standards and tickers"))
check("phase-1 lists existing keys", p1.includes("proxy contract"))
check("phase-1 has worked examples", (p1.match(/```json/g) ?? []).length >= 3)
check("phase-1 refuses pattern families", p1.includes("pattern_family"))

for (const code of ["ja", "ru", "ta", "ur", "zh-tw", "de"]) {
  const p2 = prompts.buildTranslationPrompt({
    langCode: code,
    master: terms["validator"],
    policy,
    translations: JSON.parse(readFileSync(join(ROOT, `src/data/translations/glossary-${code}.json`), "utf8")),
    terms,
    englishTerm: "validator",
  })
  const lang = policyMod.LANG_BY_CODE.get(code)
  const expected = lang.group === "latin" ? "Latin-script" : { "6.1": "Indic group", "6.2": "Cyrillic group", "6.3": "RTL group", "6.4": "CJK phonetic", "6.5": "CJK semantic" }[lang.policySection]
  check(`phase-2 ${code} carries its own group policy`, p2.includes(expected), `${p2.length} chars`)
  // A language must not be handed another group's rules. Phrase matching would
  // false-positive on section 5, whose calque row names the CJK semantic group,
  // so count spliced section-6 headings instead.
  const spliced = (p2.match(/^### 6\.\d /gm) ?? []).map((h) => h.trim())
  check(
    `phase-2 ${code} splices exactly its own group section`,
    lang.group === "latin" ? spliced.length === 0 : spliced.length === 1 && spliced[0] === `### ${lang.policySection}`,
    spliced.join(" + ") || "none"
  )
}

console.log("\n=== phase-1 validation ===")
const goodProposal = {
  canonical_term: "based rollup",
  recommended_placement: "master",
  flat_list_category: "",
  term_role: "concept",
  category: "scaling",
  script_rule: "translate",
  casing: "standard",
  definition: "A rollup that delegates sequencing to Ethereum L1 block proposers instead of running its own sequencer.",
  forms_base: "based rollup",
  aliases: [{ term: "based sequencing", status: "accepted", note: "Refers to the mechanism." }],
  avoid: ["Based Rollup"],
  note: "",
  translation_note: "Not a synonym for native rollup.",
  related_existing_terms: ["rollups"],
  duplicate_of: "",
  pattern_family: "",
  rationale: "Concept term with an established meaning; translates.",
  confidence: "high",
}
const v = shape.validateMasterProposal(goodProposal, { inputTerm: "based rollup", topicalCategories })
check("clean proposal validates", v.errors.length === 0, JSON.stringify(v.errors))

const cases = [
  ["bad script_rule enum", { ...goodProposal, script_rule: "hybrid" }, "based rollup", /not in the v1 enum/],
  ["invented category", { ...goodProposal, category: "layer2" }, "based rollup", /not one of the existing/],
  ["short definition", { ...goodProposal, definition: "A rollup." }, "based rollup", /too short/],
  ["ticker must be always_latin", { ...goodProposal, term_role: "ticker-or-standard", script_rule: "transliterate", note: "because" }, "based rollup", /without exception/],
  ["role departure needs a note", { ...goodProposal, term_role: "brand-or-project", script_rule: "translate" }, "based rollup", /requires a written rationale/],
  ["dispatched term must resolve", goodProposal, "totally unrelated phrase", /would not resolve after merge/],
  ["flat placement needs a category", { ...goodProposal, recommended_placement: "always_latin_list" }, "based rollup", /flat_list_category must be set/],
  ["master placement forbids a category", { ...goodProposal, flat_list_category: "dev_tools" }, "based rollup", /must be empty for master/],
]
for (const [name, proposal, inputTerm, re] of cases) {
  const r = shape.validateMasterProposal(proposal, { inputTerm, topicalCategories })
  check(name, r.errors.some((e) => re.test(e)), r.errors.join(" | ") || "no errors raised")
}

// duplicate_of / pattern_family are refusals, not retry-able validation errors:
// the model setting them means it correctly found the term should not be an entry.
check("duplicate is refused ahead of validation",
  /existing entry for the same concept/.test(shape.checkMasterRefusals({ ...goodProposal, duplicate_of: "rollups" }) ?? ""),
  shape.checkMasterRefusals({ ...goodProposal, duplicate_of: "rollups" }))
check("pattern family is refused ahead of validation",
  /pattern family/.test(shape.checkMasterRefusals({ ...goodProposal, pattern_family: "ERC" }) ?? ""),
  shape.checkMasterRefusals({ ...goodProposal, pattern_family: "ERC" }))
check("a clean proposal is not refused", shape.checkMasterRefusals(goodProposal) === null)

// A departure WITH a note should pass, downgraded to a warning.
const withNote = { ...goodProposal, term_role: "brand-or-project", script_rule: "translate", note: "Community translates this one." }
const wn = shape.validateMasterProposal(withNote, { inputTerm: "based rollup", topicalCategories })
check("documented departure passes with a warning", wn.errors.length === 0 && wn.warnings.some((w) => /departs/.test(w)), JSON.stringify(wn))

console.log("\n=== deterministic master shaping ===")
const built = shape.buildMasterEntry(goodProposal, { sourceTag: "gemini-3.1-pro-preview-2026-08-21" })
console.log(JSON.stringify(built, null, 2))
const sample = terms["validator"]
check("id is derived, not trusted", built.id === "based-rollup")
check("master key is lowercased term", shape.deriveMasterKey("Based Rollup") === "based rollup")
check("counters start at zero", built.content_occurrences === 0 && built.content_files === 0 && built.intl_keys === 0)
check("forms.base normalized", shape.normalizeFormsBase("Proof-Of-Stake") === "proof of stake")
check("field names match live entries", Object.keys(built).every((k) => k in sample || ["avoid", "note"].includes(k)), Object.keys(built).filter((k) => !(k in sample)).join(","))
check("empty note omitted", !("note" in built))
check("translation_note kept", built.translation_note === "Not a synonym for native rollup.")

console.log("\n=== deterministic translation shaping ===")
const rawJa = {
  term: "ベースドロールアップ",
  aliases: ["ベースド・ロールアップ"],
  transliteration: "bēsudo rōruappu",
  policy_applied: "transliterate",
  noun_singular: "ベースドロールアップ",
  noun_plural: "",
  verb_infinitive: "",
  verb_participle: "",
  adjective: "",
  agent: "",
  negation: "",
  compounds: [{ english: "based sequencing", translated: "ベースドシーケンシング" }, { english: "", translated: "dropped" }],
  context_prose: "ベースドロールアップ",
  context_prose_example: "ベースドロールアップはL1の提案者にシーケンシングを委ねます。",
  context_heading: "ベースドロールアップ",
  context_tag: "ベースドロールアップ",
  context_ui: "ベースドロールアップ",
  gender: "",
  animacy: "",
  part_of_speech: "noun",
  formality: "neutral",
  plurals: [{ category: "other", form: "ベースドロールアップ" }, { category: "one", form: "invented" }],
  confidence: "medium",
  notes: "",
}
const ja = shape.buildTranslationEntry(rawJa, {
  langCode: "ja",
  master: built,
  englishTerm: "based rollup",
  sourceTag: "gemini-3.1-pro-preview-2026-08-21",
  updated: "2026-08-21T00:00:00Z",
})
console.log(JSON.stringify(ja, null, 2))
const jaSample = JSON.parse(readFileSync(join(ROOT, "src/data/translations/glossary-ja.json"), "utf8"))["validator"]
check("code context forced to English", ja.contexts.code.term === "based rollup")
check("empty strings became null", ja.morphology.adjective === null && ja.grammar.gender === null && ja.notes === null)
check("compounds folded, blanks dropped", Object.keys(ja.morphology.compounds).join() === "based sequencing")
check("plurals pruned to ja categories", Object.keys(ja.plurals).join() === "other", JSON.stringify(ja.plurals))
check("field names match live ja entries", Object.keys(ja).every((k) => k in jaSample || k === "updated"), Object.keys(ja).filter((k) => !(k in jaSample)).join(","))

// Latin-script target: transliteration must be dropped.
const de = shape.buildTranslationEntry({ ...rawJa, term: "Based-Rollup", transliteration: "should be dropped" }, {
  langCode: "de", master: built, englishTerm: "based rollup", sourceTag: "x", updated: "2026-08-21T00:00:00Z",
})
check("transliteration null for Latin script", de.transliteration === null)

// always_latin master: every context forced to English.
const alwaysLatinMaster = { ...built, script_rule: "always_latin", term_role: "ticker-or-standard" }
const ru = shape.buildTranslationEntry({ ...rawJa, term: "Эфириум" }, {
  langCode: "ru", master: alwaysLatinMaster, englishTerm: "based rollup", sourceTag: "x", updated: "2026-08-21T00:00:00Z",
})
check("always_latin forces English in every context",
  [ru.term, ru.contexts.prose.term, ru.contexts.heading.term, ru.contexts.tag.term, ru.contexts.ui.term, ru.contexts.code.term].every((t) => t === "based rollup"),
  JSON.stringify([ru.term, ru.contexts.prose.term]))
check("always_latin clears morphology and transliteration",
  ru.transliteration === null && ru.morphology.adjective === null && ru.aliases.length === 0)

console.log("\n=== phase-2 validation ===")
const okJa = shape.validateTranslation(rawJa, { langCode: "ja", master: built, englishTerm: "based rollup" })
check("valid ja translation passes", okJa.errors.length === 0, JSON.stringify(okJa.errors))

const englishBackAsJa = shape.validateTranslation({ ...rawJa, term: "based rollup", transliteration: "" }, { langCode: "ja", master: built, englishTerm: "based rollup" })
check("English returned for a transliterate target is caught", englishBackAsJa.errors.some((e) => /script/.test(e)), englishBackAsJa.errors.join(" | "))

for (const [code, wrong] of [["ru", "based rollup"], ["ar", "based rollup"], ["ta", "ரோல்அப்"], ["ko", "based rollup"], ["zh", "基于卷叠"]]) {
  const r = shape.validateTranslation({ ...rawJa, term: wrong }, { langCode: code, master: built, englishTerm: "based rollup" })
  const shouldFail = !/\p{Script=Cyrillic}|\p{Script=Arabic}|\p{Script=Tamil}|\p{Script=Hangul}|\p{Script=Han}/u.test(wrong)
  check(`${code} native-script check (${wrong})`, shouldFail === r.errors.some((e) => /script/.test(e)), r.errors.join(" | "))
}

const badPlural = shape.validateTranslation({ ...rawJa, plurals: [{ category: "one", form: "x" }] }, { langCode: "ja", master: built, englishTerm: "based rollup" })
check("invented plural category warns", badPlural.warnings.some((w) => /dropped plural/.test(w)), badPlural.warnings.join(" | "))

console.log("\n=== adapters ===")
// Temperature 0 first for a reproducible answer; escalating after a rejection,
// because a retry at 0 reproduces the same wrong answer.
check("attempt 1 is deterministic", llm.temperatureForAttempt(1) === 0)
check("retries escalate", [2, 3, 4].map(llm.temperatureForAttempt).join() === "0.5,1,1",
  [1, 2, 3, 4, 5].map(llm.temperatureForAttempt).join(","))
check("ladder is capped at 1", llm.temperatureForAttempt(99) === 1)

// A trailer is only emitted for a provider whose address this project already
// establishes. Anything else returns null and the workflow omits the line
// rather than inventing an address.
check("google maps to the sibling repos' trailer",
  llm.coAuthorForModel("google/gemini-3.1-pro-preview") === "Gemini <gemini@google.com>")
check("anthropic maps to the project's trailer",
  llm.coAuthorForModel("anthropic/claude-opus-4") === "Claude <noreply@anthropic.com>")
check("an unlisted provider yields no trailer rather than a guess",
  ["mistralai/mistral-large", "meta-llama/llama-4-scout", "deepseek/deepseek-r1"].every(
    (m) => llm.coAuthorForModel(m) === null))

check("model ids must be provider-namespaced",
  ["google/gemini-3.1-pro-preview", "x/y.z:free"].every((m) => llm.MODEL_ID_PATTERN.test(m)) &&
    ["gemini-3.1-pro", "", "Google/Gemini", "a/b c"].every((m) => !llm.MODEL_ID_PATTERN.test(m)))

check("the default adapter resolves", llm.resolveAdapter("").name === "OpenRouter")
check("an unknown provider names the registered ones", (() => {
  try { llm.resolveAdapter("gemini"); return false } catch (e) { return /Registered: openrouter/.test(e.message) }
})())
check("the adapter exposes the full interface",
  ["name", "tag", "envKey", "defaultModel", "isAvailable", "complete", "keyStatus", "usage"]
    .every((k) => llm.adapters.openrouter[k] !== undefined))

console.log("\n=== wire schemas ===")
const s1 = shape.masterProposalSchema(topicalCategories)
check("phase-1 schema requires every property", s1.required.length === Object.keys(s1.properties).length)
check("phase-1 schema is closed", s1.additionalProperties === false)
const s2 = shape.translationSchema(policyMod.pluralCategories("ru"))
check("phase-2 schema requires every property", s2.required.length === Object.keys(s2.properties).length)
check("phase-2 plural enum is the language's own", JSON.stringify(s2.properties.plurals.items.properties.category.enum) === JSON.stringify(["one", "few", "many", "other"]))
const noNulls = JSON.stringify(s1) + JSON.stringify(s2)
check("no nullable types anywhere in the wire schemas", !noNulls.includes("null"))

console.log(`\n${fails === 0 ? "ALL CHECKS PASSED" : `${fails} CHECK(S) FAILED`}`)
process.exit(fails === 0 ? 0 : 1)
