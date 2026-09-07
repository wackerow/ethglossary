/**
 * Context reference -- explains what prose / heading / tag / ui / code /
 * plurals actually mean.
 *
 * Reviewers land here from the (i) beside every slot label, so each entry is
 * addressable by fragment (#prose, #ui, ...). The content lives in
 * lib/context-types.ts so the same text feeds the tooltips.
 */

import { Layout } from "../layout"
import type { PageUrl } from "../layout"
import { CONTEXT_TYPES, EXEMPLAR_KEY } from "../../lib/context-types"
import { listLanguages } from "../../lib/language-meta"

/** One row of the exemplar table: the same slot in three languages. */
export interface ExemplarRow {
  es: string
  ru: string
}

export interface Exemplar {
  /** The English term these are translations of. */
  term: string
  rows: Record<string, ExemplarRow>
  /** Russian transliteration, which the Latin-script column has no use for. */
  transliteration?: string
}

export const ContextsPage = ({
  activeLang,
  url,
  exemplar,
}: {
  activeLang?: string
  url?: PageUrl
  exemplar: Exemplar
}) => {
  const languages = listLanguages()
  const noPlurals = languages.filter((l) => l.noPlurals)

  return (
    <Layout
      title="Translation contexts -- ETHGlossary"
      description="What prose, heading, tag, UI, code and plural forms mean, and why a term needs a separate translation for each."
      nav="translations"
      activeLang={activeLang}
      url={url}
    >
      <div class="flex max-w-prose flex-col gap-3 pt-10 pb-6">
        <p class="text-body font-bold text-foreground-subtle">Reference</p>
        <h1 class="font-serif text-h3 font-medium text-foreground-strong">Translation contexts</h1>
        <p class="text-body text-foreground-muted">
          A glossary term does not have one translation. The same English word behaves
          differently in a sentence, in a button, and in a code identifier &mdash; so
          ETHGlossary records each of those separately. These are the slots translators
          fill in and reviewers vote on.
        </p>
        <p class="text-body text-foreground-muted">
          Every example below is the same term &mdash;{" "}
          <strong class="font-bold text-foreground-strong">{exemplar.term}</strong>{" "}
          &mdash; in English, in Spanish, and in Russian. All three are real
          translations: Russian renders it{" "}
          <span lang="ru">внешний аккаунт</span>, where{" "}
          <span lang="ru">внешний</span> is the Russian word for &ldquo;external&rdquo; and{" "}
          <span lang="ru">аккаунт</span> is &ldquo;account&rdquo; borrowed and spelled
          phonetically.
        </p>
        <p class="text-body text-foreground-muted">
          Because Cyrillic is not Latin script, the entry also records a romanization
          &mdash; <span class="font-mono text-label-sm">{exemplar.transliteration}</span>{" "}
          &mdash; which spells the Russian in Latin letters as a pronunciation aid. That
          is a separate field from the six slots below, and it is not the English
          transliterated.
        </p>
      </div>

      <ul class="flex flex-col">
        {CONTEXT_TYPES.map((c) => (
          <li
            id={c.id}
            class="grid gap-6 border-t border-border-subtle py-6 last:border-b lg:grid-cols-[8.5rem_minmax(0,1fr)_14rem]"
          >
            <div>
              <h2 class="text-body font-bold text-foreground-strong">{c.label}</h2>
              <p class="mt-0.5 font-mono text-tiny text-foreground-subtle">{c.id}</p>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-body text-foreground-strong">{c.summary}</p>
              <p class="text-body text-foreground-muted">{c.detail}</p>
            </div>
            <div class="flex h-fit flex-col gap-2 rounded-md bg-card px-3.5 py-3 text-label-md">
              {[
                { code: "en", value: c.example, dir: "ltr" as const },
                { code: "es", value: exemplar.rows[c.id]?.es, dir: "ltr" as const },
                { code: "ru", value: exemplar.rows[c.id]?.ru, dir: "ltr" as const },
              ].map((row) => (
                <span class="flex justify-between gap-3">
                  <span class="font-mono text-tiny text-foreground-subtle">{row.code}</span>
                  <span
                    class="text-right text-foreground-strong"
                    lang={row.code}
                    dir={row.dir}
                  >
                    {row.value ?? "--"}
                  </span>
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <div class="flex max-w-prose flex-col gap-3 pt-8 pb-14">
        <h2 class="text-h4 font-bold text-foreground-strong">Why the slot count varies</h2>
        <p class="text-body text-foreground-muted">
          Five contexts &mdash; prose, heading, tag, UI and code &mdash; are filled in for
          every term in every language. Plurals are the exception. {noPlurals.length} of
          the {languages.length} supported languages do not mark plurals grammatically at
          all:{" "}
          <strong class="font-bold text-foreground-strong">
            {noPlurals.map((l) => l.name).join(", ")}
          </strong>
          . For those, the plural slot does not exist and no feedback is collected on it.
        </p>
        <p class="text-body text-foreground-muted">
          Among the languages that do mark plurals, coverage still varies term by term.
          &ldquo;Reviewed every context&rdquo; therefore means every context that is
          actually populated for that specific term in that specific language &mdash; never
          a fixed count.
        </p>
      </div>
    </Layout>
  )
}
