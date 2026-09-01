# Translation contexts

Load this when working on anything that reads, writes, or votes on a
per-context translation form. The user-facing version of this page is served
at `/contexts`; the machine-readable source is `src/lib/context-types.ts`.

A glossary term does not have one translation. The same English word behaves
differently in running text, in a button label, and in a code identifier, so
each of those is stored separately. These are the votable units of community
feedback.

## The six slots

| Slot | Where it appears | `account` in Spanish |
|------|------------------|----------------------|
| `prose` | Running text, sentences, documentation | `cuenta` |
| `heading` | Section titles and page headings | `Cuenta` |
| `tag` | Category chips, filter pills, metadata labels | `cuenta` |
| `ui` | Buttons, menu items, interface controls | `Conectar cuenta` |
| `code` | Identifiers, API fields, CLI flags | `account` |
| `plurals` | CLDR plural categories, where the language marks them | `cuenta` / `cuentas` |

`prose` through `code` live under `entry.contexts.<slot>.term`. `plurals` is a
separate top-level object keyed by CLDR category (`one`, `two`, `few`, `many`,
`other`), not all of which every language uses.

### Why `ui` diverges most

`ui` is the slot that most often differs from `prose`, because a control names
an action rather than a thing. English "account" becomes a button reading
"Connect account", and Spanish follows with "Conectar cuenta". Translators
should render what the control *does*, not translate the noun in isolation.

### Why `code` is usually English

`code` names something that would break if translated -- a JSON key, a CLI
flag, a function name. When a term's `script_rule` is `always_latin`, this
slot is the reason. Change it only if the identifier genuinely differs in the
target ecosystem.

## The slot count is never fixed

**Do not assume six slots.** Always derive them with
`applicableContexts(entry)` from `src/lib/context-types.ts`.

Measured across all 24 language files (541 entries each):

- `prose`, `heading`, `tag`, `ui`, `code` -- **100% coverage, every language**.
- `plurals` -- absent entirely for six languages, and partial for the rest.

| Plural coverage | Languages |
|-----------------|-----------|
| None (0 of 541) | `id`, `ja`, `ko`, `vi`, `zh`, `zh-tw` |
| Highest | `pl` 490, `cs` 488, `ru` 481 |
| Lowest | `bn` 260, `tr` 324, `ur` 363 |

The six languages with no plurals do not mark them grammatically, so their
absence is correct data, not missing data. No feedback is collected on a slot
that does not exist.

Because coverage also varies *term by term* within a language, "this user has
reviewed every context" has to be computed per term, per language, from the
slots actually populated in that entry. A term with no plural form is complete
at five slots, not incomplete at six.

## Consequences for feedback storage

- The unique key on a vote is `(user, lang, term_key, context)`.
- `term_key` is the **canonical term name** (`"proxy contract"`), never the
  `id` slug (`proxy-contract`). See `docs/gotchas.md`.
- Progress state is derived, never stored: compare the set of contexts a user
  has acted on against `applicableContexts(entry)`.
- A vote is stamped with the slot hash it was cast against, so that editing
  one context expires feedback on that context alone. See
  `slotValue()` in `src/lib/context-types.ts` for the hashed representation.
