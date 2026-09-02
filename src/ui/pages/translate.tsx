/**
 * Translate view -- Figma frames 21:704 and 28:2320 (a slot row).
 *
 * Three columns: term list, term detail with one votable row per applicable
 * context, and the versions rail.
 *
 * Type follows the named Figma styles: the term title is Header-2-Medium
 * (Serif 500 32/40), eyebrow labels are Body-lg-bold (Sans 700 16/24) in
 * #909090, a slot term is Label-xl (Serif 400 20/20), a context label is
 * Label-md (Sans 400 14/14), and vote counts are Label-lg (Sans 400 16/16).
 *
 * Phase 0 renders the shell against the bundled glossary. Vote counts,
 * progress state and version history all arrive in later phases; until then
 * each surface renders its honest empty state rather than placeholder numbers.
 */

import { raw } from "hono/html"
import { Layout } from "../layout"
import { Icon } from "../icon"
import { TRANSLATE_ISLAND } from "../islands"
import { CONTEXT_BY_ID, applicableContexts } from "../../lib/context-types"
import type { ContextId } from "../../lib/context-types"
import { sanitizeDefinition } from "../../lib/sanitize"
import { listLanguages, getLanguageMeta } from "../../lib/language-meta"
import type { GlossaryTerm, TranslationEntry } from "../../lib/glossary-data"

export type ProgressState = "none" | "partial" | "full"

export interface TermListItem {
  key: string
  id: string
  term: string
  progress: ProgressState
}

interface TranslatePageProps {
  lang: string
  terms: TermListItem[]
  selected?: {
    key: string
    term: GlossaryTerm
    translation?: TranslationEntry
  }
  nextTermId?: string
}

/** Body-lg-bold in the Figma's label grey. */
const EYEBROW = "text-body font-bold text-ink-label"

const PROGRESS_TONE: Record<ProgressState, string> = {
  none: "text-ink-faint",
  partial: "text-green/60",
  full: "text-green",
}

const SlotRow = ({
  context,
  value,
  plurals,
  lang,
  dir,
}: {
  context: ContextId
  value: string
  plurals?: Array<[string, string]>
  lang: string
  dir: "ltr" | "rtl"
}) => {
  const meta = CONTEXT_BY_ID[context]

  return (
    <li class="overflow-hidden rounded-card border border-line bg-surface">
      <div class="flex items-center justify-between gap-4 px-4 py-3">
        {plurals ? (
          <span
            class="flex min-w-0 flex-wrap items-baseline gap-x-4.5 gap-y-1.5 font-serif text-label-xl text-ink"
            lang={lang}
            dir={dir}
          >
            {plurals.map(([form, term]) => (
              <span class="inline-flex items-baseline gap-1.5">
                <span class="font-sans text-tiny uppercase tracking-wider text-ink-faint">
                  {form}
                </span>
                {term}
              </span>
            ))}
          </span>
        ) : (
          <span
            class="min-w-0 break-words font-serif text-label-xl text-ink"
            lang={lang}
            dir={dir}
          >
            {value}
          </span>
        )}

        <span class="flex shrink-0 items-center gap-4">
          <button
            class="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-label-lg tabular-nums text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-dim"
            type="button"
            aria-pressed="false"
            aria-label={`Vote up the ${meta.label} translation`}
            data-context={context}
            data-vote="up"
            disabled
          >
            <Icon name="thumbs-up" size={18} />
            <span>&ndash;</span>
          </button>
          <button
            class="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-label-lg tabular-nums text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-dim"
            type="button"
            aria-pressed="false"
            aria-label={`Vote down the ${meta.label} translation`}
            data-context={context}
            data-vote="down"
            disabled
          >
            <Icon name="thumbs-down" size={18} />
            <span>&ndash;</span>
          </button>
          <button
            class="grid size-6 place-items-center rounded-md text-ink-dim transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-ink-dim"
            type="button"
            aria-label={`Suggest a different ${meta.label} translation`}
            data-context={context}
            data-action="suggest"
            disabled
          >
            <Icon name="square-pen" size={20} />
          </button>
        </span>
      </div>

      <div class="flex items-center justify-between gap-3 bg-callout px-4 py-2">
        <span class="inline-flex items-center gap-1.5 text-label-md text-ink-2">
          {meta.label}
          <a
            class="grid place-items-center rounded-full text-ink-3 opacity-75 hover:opacity-100"
            href={`/contexts#${context}`}
            title={meta.summary}
            aria-label={`What does ${meta.label} mean?`}
          >
            <Icon name="info" size={14} />
          </a>
        </span>
      </div>
    </li>
  )
}

export const TranslatePage = ({
  lang,
  terms,
  selected,
  nextTermId,
}: TranslatePageProps) => {
  const meta = getLanguageMeta(lang)
  const dir = meta?.dir ?? "ltr"
  const languages = listLanguages()

  const slots: Array<{
    context: ContextId
    value: string
    plurals?: Array<[string, string]>
  }> = []

  if (selected?.translation) {
    const entry = selected.translation
    for (const context of applicableContexts(entry)) {
      if (context === "plurals") {
        // Render the CLDR categories as labelled forms, not a flat string.
        const forms = Object.entries(entry.plurals ?? {}).filter(
          (pair): pair is [string, string] => Boolean(pair[1])
        )
        if (forms.length) {
          slots.push({ context, value: forms[0][1], plurals: forms })
        }
        continue
      }
      const value = entry.contexts?.[context]?.term
      if (value) slots.push({ context, value })
    }
  }

  return (
    <Layout
      title={
        selected
          ? `${selected.term.term} in ${meta?.name ?? lang} -- ETHGlossary`
          : `Translate to ${meta?.name ?? lang} -- ETHGlossary`
      }
      description={`Review and improve the ${meta?.name ?? lang} translation of Ethereum terminology.`}
      nav="translate"
      island={TRANSLATE_ISLAND}
    >
      <div class="flex flex-wrap items-center gap-4 pt-5">
        <label class="text-label-md text-ink-dim" for="lang-picker">
          Translating into
        </label>
        <select
          id="lang-picker"
          class="rounded-md border border-line bg-surface px-3 py-1.5 text-label-md text-ink-2 focus:border-accent focus:outline-none"
          aria-label="Choose a language"
        >
          {languages.map((l) => (
            <option value={l.code} selected={l.code === lang}>
              {l.endonym} &mdash; {l.name}
            </option>
          ))}
        </select>
      </div>

      <div class="grid items-start gap-8 py-8 pb-16 xl:grid-cols-[278px_minmax(0,1fr)_278px]">
        {/* ---------- Column 1: term list ---------- */}
        <aside class="rounded-card border border-line-soft bg-surface">
          <h2 class="px-5 pt-5 pb-3 text-body font-bold text-ink">Terms</h2>
          <div class="px-5 pb-3">
            <input
              type="search"
              id="term-search"
              class="w-full rounded-md border border-line bg-bg px-3 py-2 text-label-md text-ink-2 placeholder:text-ink-faint focus:border-accent focus:outline-none"
              placeholder="Search terms..."
              autocomplete="off"
              aria-label="Search terms"
            />
          </div>
          <ul
            id="term-list"
            class="flex max-h-[min(60vh,32rem)] flex-col gap-0.5 overflow-y-auto px-3 pb-3 xl:max-h-[calc(100vh-14rem)]"
          >
            {terms.map((t) => (
              <li>
                <a
                  class={`grid grid-cols-[16px_1fr] items-start gap-3 rounded-md p-2 text-label-md/snug no-underline hover:bg-surface-2 hover:text-ink hover:no-underline ${
                    selected?.key === t.key
                      ? "bg-surface-2 font-bold text-ink"
                      : "text-ink-3"
                  }`}
                  href={`/translate/${lang}/${t.id}`}
                  aria-current={selected?.key === t.key ? "true" : undefined}
                  data-term={t.term.toLowerCase()}
                >
                  <Icon
                    name="badge-check"
                    size={16}
                    class={`mt-0.5 shrink-0 ${PROGRESS_TONE[t.progress]}`}
                  />
                  <span>{t.term}</span>
                </a>
              </li>
            ))}
          </ul>
          <p class="border-t border-line-soft px-5 pt-2.5 pb-4 text-tiny text-ink-faint">
            <span id="term-count">{terms.length}</span> terms
          </p>
        </aside>

        {/* ---------- Column 2: detail ---------- */}
        <div class="flex min-w-0 flex-col gap-8">
          {!selected ? (
            <div class="flex flex-col gap-4">
              <p class={EYEBROW}>Get started</p>
              <h1 class="font-serif text-h3 font-medium text-ink">Pick a term to review</h1>
              <p class="max-w-[62ch] text-body text-ink-3">
                Every term carries a separate translation for each context it appears in.
                Choose one from the list and vote on the forms that read correctly to a
                native speaker &mdash; or suggest better ones.
              </p>
              <a
                class="inline-flex items-center gap-1.5 self-start text-label-md text-accent"
                href="/contexts"
              >
                What do prose, tag and UI mean?
                <Icon name="arrow-right" size={16} />
              </a>
            </div>
          ) : (
            <>
              <div class="flex flex-col gap-4">
                <p class={EYEBROW}>Term</p>
                <h1 class="font-serif text-h3 font-medium text-ink">
                  {selected.term.term}
                </h1>
              </div>

              {selected.term.definition ? (
                <div class="flex flex-col gap-3">
                  <p class={EYEBROW}>Definition</p>
                  <div class="rounded-md bg-surface px-4 py-4">
                    {/* Definitions carry curated markup -- links, lists, emphasis. */}
                    <div class="definition-html text-body">
                      {raw(sanitizeDefinition(selected.term.definition))}
                    </div>
                    <a
                      class="mt-2 inline-block font-serif text-label-md text-accent"
                      href={`/style-guide/${selected.term.id}`}
                    >
                      More in style guide
                    </a>
                  </div>
                </div>
              ) : null}

              <hr class="border-line-soft" />

              <div class="flex flex-col gap-3">
                <h2 class="text-h4 font-bold text-ink">Suggested translation</h2>
                <p class="max-w-[62ch] text-body text-ink-3">
                  <strong class="font-bold text-ink">
                    Cast your vote on the terms below
                  </strong>{" "}
                  to help the community select the best translation for each context.
                </p>

                {slots.length === 0 ? (
                  <p class="text-body text-ink-3">
                    No {meta?.name ?? lang} translation is recorded for this term yet.
                  </p>
                ) : (
                  <>
                    <div class="flex justify-end">
                      <button
                        id="thumbs-up-all"
                        class="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-label-md font-bold text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        type="button"
                        disabled
                      >
                        Thumbs up all
                        <Icon name="thumbs-up" size={16} />
                      </button>
                    </div>

                    <ul class="flex flex-col gap-3">
                      {slots.map((s) => (
                        <SlotRow
                          context={s.context}
                          value={s.value}
                          plurals={s.plurals}
                          lang={lang}
                          dir={dir}
                        />
                      ))}
                    </ul>
                  </>
                )}

                <p class="flex items-start gap-2 rounded-md bg-surface-2 px-3 py-2.5 text-tiny text-ink-dim">
                  <Icon name="circle-alert" size={15} class="mt-0.5 shrink-0" />
                  Voting and suggestions open once sign-in ships. Everything on this page
                  is live glossary data.
                </p>

                {nextTermId ? (
                  <a
                    class="inline-flex items-center gap-1.5 self-start text-label-md text-accent"
                    href={`/translate/${lang}/${nextTermId}`}
                  >
                    Go to next term
                    <Icon name="arrow-right" size={16} />
                  </a>
                ) : null}
              </div>

              <hr class="border-line-soft" />

              <div class="flex flex-col gap-2">
                <p class="text-body text-ink-3">
                  into <strong class="font-bold text-ink">{meta?.name ?? lang}</strong>
                </p>
                <label class="sr-only" for="suggest-term">
                  Your suggested translation
                </label>
                <input
                  id="suggest-term"
                  class="w-full border-0 border-b border-line bg-transparent px-0.5 py-2.5 font-serif text-h3 text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none disabled:cursor-not-allowed"
                  placeholder="Suggest a different translation"
                  disabled
                />
                <label class="sr-only" for="suggest-reason">
                  Why is this better?
                </label>
                <textarea
                  id="suggest-reason"
                  class="min-h-11 w-full resize-y border-0 border-b border-line bg-transparent px-0.5 py-2.5 text-body text-ink-2 placeholder:text-ink-faint focus:border-accent focus:outline-none disabled:cursor-not-allowed"
                  placeholder="Explain your reasoning (optional)"
                  disabled
                />
                <button
                  class="mt-3 self-start rounded-full bg-yellow px-5 py-3 text-body font-bold text-on-yellow transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
                  type="button"
                  disabled
                >
                  Suggest translation
                </button>
                <p class="mt-2 flex items-start gap-2 rounded-md bg-surface-2 px-3 py-2.5 text-tiny text-ink-dim">
                  <Icon name="info" size={15} class="mt-0.5 shrink-0" />
                  If your term matches an existing suggestion, we&rsquo;ll upvote that one
                  for you instead of creating a duplicate.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ---------- Column 3: versions ---------- */}
        <aside class="flex flex-col gap-3">
          <h2 class="border-b border-line pb-2.5 text-body font-bold text-ink">Versions</h2>
          <p class="text-tiny/relaxed text-ink-faint">
            Change history starts once the first build indexes the deployed glossary. Each
            entry will record which context changed, and in which release.
          </p>
        </aside>
      </div>
    </Layout>
  )
}
