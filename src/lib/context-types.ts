/**
 * Translation context types.
 *
 * A glossary term does not have one translation -- it has one per *context*,
 * because the same English word behaves differently in running text, in a
 * button label, and in a code identifier. These are the slots a translator
 * fills in and a reviewer votes on.
 *
 * The six slots below are the votable units of feedback. Five of them
 * (prose/heading/tag/ui/code) are populated for all 541 entries in all 24
 * languages. `plurals` is conditional: six languages do not mark plurals
 * grammatically at all, and among the eighteen that do, coverage ranges from
 * 260/541 (Bengali) to 490/541 (Polish). Never assume a fixed slot count --
 * always derive it from the entry via `applicableContexts()`.
 */

export type ContextId = "prose" | "heading" | "tag" | "ui" | "code" | "plurals"

export interface ContextType {
  id: ContextId
  /** Short label shown on the slot chip in the UI. */
  label: string
  /** One line, shown under the heading and in the tooltip. */
  summary: string
  /** The full explanation, shown in the reference panel. */
  detail: string
  /** A real example drawn from the Spanish glossary, term: "account". */
  example: { en: string; es: string }
}

export const CONTEXT_TYPES: ContextType[] = [
  {
    id: "prose",
    label: "Prose",
    summary: "Running text -- sentences, paragraphs, documentation.",
    detail:
      "The default form, used inside a sentence. It follows the target language's normal rules for an ordinary noun: lowercase unless the language capitalizes common nouns, inflected as the grammar requires. If you only read one slot, read this one -- most other forms are derived from it.",
    example: { en: "account", es: "cuenta" },
  },
  {
    id: "heading",
    label: "Heading",
    summary: "Section titles and page headings.",
    detail:
      "The same term as it appears in a title. Many languages capitalize the first word of a heading where they would not capitalize it mid-sentence, and some drop articles that prose would keep. This slot exists so a heading does not inherit sentence-case from prose and read as a typo.",
    example: { en: "Account", es: "Cuenta" },
  },
  {
    id: "tag",
    label: "Tag",
    summary: "Category chips, filter pills, metadata labels.",
    detail:
      "The compact form used where space is tight and the word stands alone with no surrounding grammar -- a filter chip, a topic tag, a table column header. Often identical to prose, but languages that inflect heavily may want an uninflected citation form here.",
    example: { en: "account", es: "cuenta" },
  },
  {
    id: "ui",
    label: "UI",
    summary: "Buttons, menu items, and other interface controls.",
    detail:
      "The term as it appears in an interactive control. This is the slot that most often diverges from prose, because a control names an action rather than a thing: English \"account\" becomes a button that says \"Connect account\". Translators should render what the control does in their language, not translate the noun in isolation.",
    example: { en: "Connect account", es: "Conectar cuenta" },
  },
  {
    id: "code",
    label: "Code",
    summary: "Identifiers, API fields, CLI flags -- usually untranslated.",
    detail:
      "The form used inside code: a JSON key, a function name, a CLI flag, a config value. This is almost always the English original, because translating it would break the thing it names. When a term's script_rule is always_latin, this slot is the reason. Change it only if the identifier genuinely differs in the target ecosystem.",
    example: { en: "account", es: "account" },
  },
  {
    id: "plurals",
    label: "Plurals",
    summary: "CLDR plural forms, where the language marks them.",
    detail:
      "Plural forms follow the Unicode CLDR categories -- one, two, few, many, other -- and not every language uses every category. Six of the 24 languages (Indonesian, Japanese, Korean, Vietnamese, and both Chinese variants) do not mark plurals grammatically, so this slot does not exist for them at all and no feedback is collected on it.",
    example: { en: "accounts", es: "cuentas" },
  },
]

export const CONTEXT_BY_ID: Record<ContextId, ContextType> = Object.fromEntries(
  CONTEXT_TYPES.map((c) => [c.id, c])
) as Record<ContextId, ContextType>

/** The five contexts that live under `entry.contexts`. */
export const NESTED_CONTEXTS = ["prose", "heading", "tag", "ui", "code"] as const

/**
 * Which slots are actually populated for one translation entry.
 *
 * This is the source of truth for "has this user covered every context?" --
 * a term with no plurals is complete at five slots, not incomplete at six.
 */
export function applicableContexts(entry: {
  contexts?: Record<string, { term?: string } | undefined>
  plurals?: Record<string, string | null> | null
}): ContextId[] {
  const out: ContextId[] = []

  for (const id of NESTED_CONTEXTS) {
    if (entry.contexts?.[id]?.term) out.push(id)
  }

  if (entry.plurals && Object.values(entry.plurals).some((v) => v)) {
    out.push("plurals")
  }

  return out
}

/**
 * The value a slot hash is computed over.
 *
 * Returns null when the slot is not populated. Plurals serialize as a stable
 * sorted key:value join so that reordering the JSON does not read as a change.
 */
export function slotValue(
  entry: {
    contexts?: Record<string, { term?: string } | undefined>
    plurals?: Record<string, string | null> | null
  },
  context: ContextId
): string | null {
  if (context === "plurals") {
    if (!entry.plurals) return null
    const pairs = Object.entries(entry.plurals)
      .filter(([, v]) => v)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
    return pairs.length ? pairs.join("|") : null
  }

  return entry.contexts?.[context]?.term ?? null
}

/**
 * Whether a term is worth putting in front of a reviewer for one language.
 *
 * The translate view exists to settle how a term should read in the target
 * language. Some entries have nothing to settle, and listing them just makes
 * the sidebar confusing -- "Albert Einstein" in a Spanish review queue being
 * the case that prompted this.
 *
 * The rule follows the v1 policy in docs/translation-policy.md:
 *
 *  - `always_latin` / `keep_latin` -- the term IS the English string, by rule.
 *    Tickers, standards, RPC identifiers. Nothing to vote on in any language.
 *  - `transliterate` -- real work in a non-Latin script, a no-op in a Latin
 *    one, where the output is character-for-character the English. All six
 *    person-name entries are in this bucket.
 *  - everything else (`translate`, `calque`, ...) -- always reviewable.
 *
 * Filtered terms are not deleted: /translate/:lang?all=1 shows the full list,
 * and every term stays reachable by direct URL.
 */
export function needsReview(
  term: { script_rule?: string },
  languageIsLatinScript: boolean
): boolean {
  const rule = term.script_rule

  if (rule === "always_latin" || rule === "keep_latin") return false
  if (rule === "transliterate") return !languageIsLatinScript

  return true
}
