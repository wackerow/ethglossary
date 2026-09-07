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

/**
 * The term the /contexts page uses to demonstrate the slots.
 *
 * Chosen because it is the clearest teacher in the whole glossary: `tag`
 * collapses to the bare acronym, `heading` title-cases and appends it, `ui`
 * shortens for a control, `code` is a lowercase identifier -- and Russian
 * fills five CLDR plural categories where Spanish fills two.
 *
 * Keyed by canonical term name, never the id slug. See docs/gotchas.md.
 */
export const EXEMPLAR_KEY = "externally owned account (eoa)"

/** The two languages shown beside English: one Latin script, one not. */
export const EXEMPLAR_LANGS = ["es", "ru"] as const

export interface ContextType {
  id: ContextId
  /** Short label shown on the slot chip in the UI. */
  label: string
  /** One line, shown under the heading and in the tooltip. */
  summary: string
  /** The full explanation, shown in the reference panel. */
  detail: string
  /**
   * The English form. The translated columns are read from the live glossary
   * at render time (see EXEMPLAR_KEY), so they cannot drift from the data.
   */
  example: string
}

export const CONTEXT_TYPES: ContextType[] = [
  {
    id: "prose",
    label: "Prose",
    summary: "Running text -- sentences, paragraphs, documentation.",
    detail:
      "The default form, used inside a sentence. It follows the target language's normal rules for an ordinary noun: lowercase unless the language capitalizes common nouns, inflected as the grammar requires. If you only read one slot, read this one -- most other forms are derived from it.",
    example: "externally owned account",
  },
  {
    id: "heading",
    label: "Heading",
    summary: "Section titles and page headings.",
    detail:
      "The same term as it appears in a title. Many languages capitalize the first word of a heading where they would not capitalize it mid-sentence, and some drop articles that prose would keep. This slot exists so a heading does not inherit sentence-case from prose and read as a typo.",
    example: "Externally Owned Account (EOA)",
  },
  {
    id: "tag",
    label: "Tag",
    summary: "Category chips, filter pills, metadata labels.",
    detail:
      "The compact form used where space is tight and the word stands alone with no surrounding grammar -- a filter chip, a topic tag, a table column header. Often identical to prose, but a long term may collapse to its acronym here, as this one does in all three languages.",
    example: "EOA",
  },
  {
    id: "ui",
    label: "UI",
    summary: "Buttons, menu items, and other interface controls.",
    detail:
      "The term as it appears in an interactive control, where space is short and the label has to stay scannable. It often diverges from prose: here every language drops to a shorter form than the full phrase, and Russian sheds the acronym entirely. Render what the control does in your language rather than translating the phrase word for word.",
    example: "External account (EOA)",
  },
  {
    id: "code",
    label: "Code",
    summary: "Identifiers, API fields, CLI flags -- usually untranslated.",
    detail:
      "The form used inside code: a JSON key, a function name, a CLI flag, a config value. This is almost always the English original, because translating it would break the thing it names. When a term's script_rule is always_latin, this slot is the reason. Change it only if the identifier genuinely differs in the target ecosystem.",
    example: "eoa",
  },
  {
    id: "plurals",
    label: "Plurals",
    summary: "CLDR plural forms, where the language marks them.",
    detail:
      "Plural forms follow the Unicode CLDR categories -- one, two, few, many, other -- and languages use different numbers of them. Spanish marks two here where Russian marks five, which is why this cannot be a single field. Several languages do not mark plurals grammatically at all, so the slot does not exist for them and no feedback is collected on it.",
    example: "externally owned accounts",
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
