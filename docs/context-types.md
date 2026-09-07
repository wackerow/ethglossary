# Translation contexts

Load this when working on anything that reads, writes, or votes on a
per-context translation form. The user-facing version of this page is served
at `/contexts`; the machine-readable source is `src/lib/context-types.ts`.

A glossary term does not have one translation. The same English word behaves
differently in running text, in a button label, and in a code identifier, so
each of those is stored separately. These are the votable units of community
feedback.

## The six slots

Worked example: **externally owned account (EOA)** in English, Spanish and
Russian. All three are genuine translations -- Russian gives
"внешний аккаунт", where "внешний" is the Russian for *external* and "аккаунт"
is *account* borrowed and spelled phonetically.

Because Cyrillic is not Latin script, the entry additionally records a
romanization in `transliteration` (`vneshniy akkaunt (EOA)`) -- the Russian
spelled in Latin letters, as a pronunciation aid. That is a separate field
from the six slots, and it is **not** the English transliterated.

| Slot | Where it appears | en | es | ru |
|------|------------------|----|----|----|
| `prose` | Running text, sentences, documentation | externally owned account | cuenta de propiedad externa | внешнего аккаунта |
| `heading` | Section titles and page headings | Externally Owned Account (EOA) | Cuenta de Propiedad Externa (EOA) | Внешний аккаунт (EOA) |
| `tag` | Category chips, filter pills, metadata labels | EOA | EOA | EOA |
| `ui` | Buttons, menu items, interface controls | External account (EOA) | Cuenta externa (EOA) | Внешний аккаунт |
| `code` | Identifiers, API fields, CLI flags | eoa | eoa | eoa |
| `plurals` | CLDR categories, where the language marks them | accounts | 2 forms | **5 forms** |

That row of `EOA`s is the point of `tag`, and two-versus-five is the point of
`plurals`. The /contexts page renders this table from the live glossary rather
than from authored copy, so it cannot drift from the data.

`prose` through `code` live under `entry.contexts.<slot>.term`. `plurals` is a
separate top-level object keyed by CLDR category (`one`, `two`, `few`, `many`,
`other`), not all of which every language uses.

### Why `ui` diverges most

`ui` is the slot that most often differs from `prose`, because a control has to
stay short and scannable. Above, every language drops below the full phrase and
Russian sheds the acronym entirely. Translators should render what the control
*does* in their language, not translate the phrase word for word.

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
