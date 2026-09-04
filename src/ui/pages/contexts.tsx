/**
 * Context reference -- explains what prose / heading / tag / ui / code /
 * plurals actually mean.
 *
 * Reviewers land here from the (i) beside every slot label, so each entry is
 * addressable by fragment (#prose, #ui, ...). The content lives in
 * lib/context-types.ts so the same text feeds the tooltips.
 */

import { Layout } from "../layout"
import { CONTEXT_TYPES } from "../../lib/context-types"
import { listLanguages } from "../../lib/language-meta"

export const ContextsPage = ({ activeLang }: { activeLang?: string }) => {
  const languages = listLanguages()
  const noPlurals = languages.filter((l) => l.noPlurals)

  return (
    <Layout
      title="Translation contexts -- ETHGlossary"
      description="What prose, heading, tag, UI, code and plural forms mean, and why a term needs a separate translation for each."
      nav="translate"
      activeLang={activeLang}
    >
      <div class="flex max-w-[62ch] flex-col gap-3 pt-10 pb-6">
        <p class="text-body font-bold text-ink-label">Reference</p>
        <h1 class="font-serif text-h3 font-medium text-ink">Translation contexts</h1>
        <p class="text-body text-ink-3">
          A glossary term does not have one translation. The same English word behaves
          differently in a sentence, in a button, and in a code identifier &mdash; so
          ETHGlossary records each of those separately. These are the slots translators
          fill in and reviewers vote on.
        </p>
      </div>

      <ul class="flex flex-col">
        {CONTEXT_TYPES.map((c) => (
          <li
            id={c.id}
            class="grid gap-6 border-t border-line-soft py-6 last:border-b lg:grid-cols-[8.5rem_minmax(0,1fr)_14rem]"
          >
            <div>
              <h2 class="text-body font-bold text-ink">{c.label}</h2>
              <p class="mt-0.5 font-mono text-tiny text-ink-faint">{c.id}</p>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-body text-ink">{c.summary}</p>
              <p class="text-body text-ink-3">{c.detail}</p>
            </div>
            <div class="flex h-fit flex-col gap-1.5 rounded-md bg-surface px-3.5 py-3 text-label-md">
              <span class="flex justify-between gap-2">
                <span class="font-mono text-tiny text-ink-faint">en</span>
                <span class="text-ink">{c.example.en}</span>
              </span>
              <span class="flex justify-between gap-2">
                <span class="font-mono text-tiny text-ink-faint">es</span>
                <span class="text-ink" lang="es">
                  {c.example.es}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div class="flex max-w-[62ch] flex-col gap-3 pt-8 pb-14">
        <h2 class="text-h4 font-bold text-ink">Why the slot count varies</h2>
        <p class="text-body text-ink-3">
          Five contexts &mdash; prose, heading, tag, UI and code &mdash; are filled in for
          every term in every language. Plurals are the exception. {noPlurals.length} of
          the {languages.length} supported languages do not mark plurals grammatically at
          all:{" "}
          <strong class="font-bold text-ink">
            {noPlurals.map((l) => l.name).join(", ")}
          </strong>
          . For those, the plural slot does not exist and no feedback is collected on it.
        </p>
        <p class="text-body text-ink-3">
          Among the languages that do mark plurals, coverage still varies term by term.
          &ldquo;Reviewed every context&rdquo; therefore means every context that is
          actually populated for that specific term in that specific language &mdash; never
          a fixed count.
        </p>
      </div>
    </Layout>
  )
}
