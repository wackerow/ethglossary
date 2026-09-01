/**
 * Translate view -- Figma frame 21:704.
 *
 * Three columns: term list, term detail with one votable row per applicable
 * context, and the versions rail.
 *
 * Phase 0 renders the shell against the existing read-only API. Vote counts,
 * progress state and version history all arrive in later phases; until then
 * each surface renders its honest empty state rather than placeholder numbers.
 */

import { raw } from "hono/html"
import { Layout } from "../layout"
import { TRANSLATE_ISLAND } from "../islands"
import {
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Info,
  ArrowRight,
  Decagram,
  DecagramFilled,
} from "../icons"
import { CONTEXT_BY_ID, applicableContexts } from "../../lib/context-types"
import { sanitizeDefinition } from "../../lib/sanitize"
import type { ContextId } from "../../lib/context-types"
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

const ProgressIcon = ({ state }: { state: ProgressState }) => {
  if (state === "full") {
    return <DecagramFilled class="status status-full" size={16} />
  }
  return (
    <Decagram
      class={`status ${state === "partial" ? "status-partial" : "status-none"}`}
      size={16}
    />
  )
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
    <li class="slot">
      <div class="slot-main">
        {plurals ? (
          <span class="slot-term slot-plurals" lang={lang} dir={dir}>
            {plurals.map(([form, term]) => (
              <span class="plural">
                <span class="plural-key">{form}</span>
                {term}
              </span>
            ))}
          </span>
        ) : (
          <span class="slot-term" lang={lang} dir={dir}>
            {value}
          </span>
        )}
        <span class="slot-votes">
          <button
            class="vote vote-up"
            type="button"
            aria-pressed="false"
            aria-label={`Vote up the ${meta.label} translation`}
            data-context={context}
            data-vote="up"
            disabled
          >
            <ThumbsUp size={15} />
            <span class="count">&ndash;</span>
          </button>
          <button
            class="vote vote-down"
            type="button"
            aria-pressed="false"
            aria-label={`Vote down the ${meta.label} translation`}
            data-context={context}
            data-vote="down"
            disabled
          >
            <ThumbsDown size={15} />
            <span class="count">&ndash;</span>
          </button>
          <button
            class="vote"
            type="button"
            aria-label={`Suggest a different ${meta.label} translation`}
            data-context={context}
            data-action="suggest"
            disabled
          >
            <Pencil size={15} />
          </button>
        </span>
      </div>
      <div class="slot-foot">
        <span class="slot-label">
          {meta.label}
          <a
            class="slot-help"
            href={`/contexts#${context}`}
            title={meta.summary}
            aria-label={`What does ${meta.label} mean?`}
          >
            <Info size={13} />
          </a>
        </span>
      </div>
    </li>
  )
}

export const TranslatePage = ({ lang, terms, selected, nextTermId }: TranslatePageProps) => {
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
      <div class="app-bar">
        <label for="lang-picker">Translating into</label>
        <select id="lang-picker" class="lang-select" aria-label="Choose a language">
          {languages.map((l) => (
            <option value={l.code} selected={l.code === lang}>
              {l.endonym} &mdash; {l.name}
            </option>
          ))}
        </select>
      </div>

      <div class="app">
        {/* ---------- Column 1: term list ---------- */}
        <aside class="panel">
          <h2 class="panel-head">Terms</h2>
          <div class="term-search">
            <input
              type="search"
              id="term-search"
              placeholder="Search terms..."
              autocomplete="off"
              aria-label="Search terms"
            />
          </div>
          <ul class="term-list" id="term-list">
            {terms.map((t) => (
              <li>
                <a
                  class="term-item"
                  href={`/translate/${lang}/${t.id}`}
                  aria-current={selected?.key === t.key ? "true" : undefined}
                  data-term={t.term.toLowerCase()}
                >
                  <ProgressIcon state={t.progress} />
                  <span>{t.term}</span>
                </a>
              </li>
            ))}
          </ul>
          <p class="term-count">
            <span id="term-count">{terms.length}</span> terms
          </p>
        </aside>

        {/* ---------- Column 2: detail ---------- */}
        <div class="term-detail">
          {!selected ? (
            <div class="block">
              <p class="eyebrow">Get started</p>
              <h1 class="term-title">Pick a term to review</h1>
              <p class="lede">
                Every term carries a separate translation for each context it appears in.
                Choose one from the list and vote on the forms that read correctly to a
                native speaker &mdash; or suggest better ones.
              </p>
              <a class="next-term" href="/contexts">
                What do prose, tag and UI mean?
                <ArrowRight size={14} />
              </a>
            </div>
          ) : (
            <>
              <div>
                <p class="eyebrow">Term</p>
                <h1 class="term-title">{selected.term.term}</h1>
              </div>

              {selected.term.definition ? (
                <div class="block">
                  <p class="eyebrow">Definition</p>
                  <div class="definition">
                    {/* Definitions carry curated markup -- links, lists, emphasis. */}
                    <div>{raw(sanitizeDefinition(selected.term.definition))}</div>
                    <a class="more" href={`/style-guide/${selected.term.id}`}>
                      More in the style guide
                    </a>
                  </div>
                </div>
              ) : null}

              <hr class="divider" />

              <div class="block">
                <h2>Suggested translation</h2>
                <p class="lede">
                  <strong>Cast your vote on the terms below</strong> to help the community
                  select the best translation for each context.
                </p>

                {slots.length === 0 ? (
                  <p class="lede">
                    No {meta?.name ?? lang} translation is recorded for this term yet.
                  </p>
                ) : (
                  <>
                    <div class="bulk-row">
                      <button class="bulk-vote" type="button" id="thumbs-up-all" disabled>
                        Thumbs up all
                        <ThumbsUp size={15} />
                      </button>
                    </div>

                    <ul class="slots">
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

                <p class="hint">
                  <Info size={14} />
                  Voting and suggestions open once sign-in ships. Everything on this page
                  is live glossary data.
                </p>

                {nextTermId ? (
                  <a class="next-term" href={`/translate/${lang}/${nextTermId}`}>
                    Go to next term
                    <ArrowRight size={14} />
                  </a>
                ) : null}
              </div>

              <hr class="divider" />

              <div class="block suggest">
                <p class="into">
                  into <strong>{meta?.name ?? lang}</strong>
                </p>
                <label class="sr-only" for="suggest-term">
                  Your suggested translation
                </label>
                <input
                  class="suggest-field"
                  id="suggest-term"
                  placeholder="Suggest a different translation"
                  disabled
                />
                <label class="sr-only" for="suggest-reason">
                  Why is this better?
                </label>
                <textarea
                  class="suggest-reason"
                  id="suggest-reason"
                  placeholder="Explain your reasoning (optional)"
                  disabled
                />
                <button class="btn btn-primary" type="button" disabled>
                  Suggest translation
                </button>
                <p class="hint">
                  <Info size={14} />
                  If your term matches an existing suggestion, we&rsquo;ll upvote that one
                  for you instead of creating a duplicate.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ---------- Column 3: versions ---------- */}
        <aside class="rail">
          <h2>Versions</h2>
          <p class="empty">
            Change history starts once the first build indexes the deployed glossary. Each
            entry will record which context changed, and in which release.
          </p>
        </aside>
      </div>
    </Layout>
  )
}
