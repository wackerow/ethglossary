/**
 * All 24 languages, side by side, for one term.
 *
 * The counterpart to /translations/:lang. That view is for contributing to one
 * language; this one is for seeing how a term landed everywhere at once --
 * useful to a content author deciding whether a term is even translatable,
 * and to a translator checking what neighboring languages did.
 *
 * Nothing here is votable. Feedback is always cast against a single language,
 * so every row is a link into that language's own page.
 */

import { Layout } from "../layout"
import type { PageUrl } from "../layout"
import { Icon } from "../icon"
import arrowRight from "lucide-static/icons/arrow-right.svg"
import globe from "lucide-static/icons/globe.svg"
import info from "lucide-static/icons/info.svg"
import { TERM_FILTER_ISLAND } from "../islands"
import { CONTEXT_BY_ID } from "../../lib/context-types"
import type { ContextId } from "../../lib/context-types"
import { listLanguages } from "../../lib/language-meta"
import type { GlossaryTerm } from "../../lib/glossary-data"
import type { TermListItem } from "./translate"

/** One language's forms for the selected term. */
export interface CompareRow {
  code: string
  /** Rendered value per context, already flattened -- null where absent. */
  values: Partial<Record<ContextId, string | null>>
  /** How many CLDR categories this language marks for the term. */
  pluralCount?: number
}

interface ComparePageProps {
  /** Every master term, for the picker. */
  terms: TermListItem[]
  selected?: GlossaryTerm
  rows?: CompareRow[]
  /** Contexts any language populates for this term, in canonical order. */
  contexts?: ContextId[]
  /** The visitor's chosen language, if they have one. */
  activeLang?: string
  url?: PageUrl
}

const CELL = "border-b border-border-subtle px-3.5 py-2.5 text-left align-top"

/**
 * The banner that answers "why can't I vote here?".
 *
 * Two states, because the honest answer differs: someone with a language set
 * is one click from contributing, and someone without has to choose first.
 */
const ViewingAll = ({ activeLang, termId }: { activeLang?: string; termId?: string }) => {
  const meta = activeLang ? listLanguages().find((l) => l.code === activeLang) : undefined

  return (
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-border bg-card px-4 py-3">
      <span class="inline-flex items-center gap-2 text-body text-foreground">
        <Icon svg={globe} class="size-4.5 shrink-0 text-foreground-subtle" />
        <span>
          <b class="font-bold text-foreground-strong">Viewing all languages.</b> Voting and
          suggestions happen inside one language.
        </span>
      </span>

      {meta ? (
        <a
          class="inline-flex items-center gap-1.5 text-label-md text-accent"
          href={termId ? `/translations/${meta.code}/${termId}` : `/translations/${meta.code}`}
        >
          Contribute in {meta.name}
          <Icon svg={arrowRight} class="size-4" />
        </a>
      ) : (
        <a
          class="inline-flex items-center gap-1.5 text-label-md text-accent"
          href="/translations?choose=1"
        >
          Choose a language to contribute
          <Icon svg={arrowRight} class="size-4" />
        </a>
      )}
    </div>
  )
}

export const ComparePage = ({
  terms,
  selected,
  rows = [],
  contexts = [],
  activeLang,
  url,
}: ComparePageProps) => {
  const byCode = new Map(rows.map((r) => [r.code, r]))
  const languages = listLanguages()

  return (
    <Layout
      title={
        selected
          ? `${selected.term} in 24 languages -- ETHGlossary`
          : "Translate -- ETHGlossary"
      }
      description={
        selected
          ? `How "${selected.term}" is translated across all 24 ETHGlossary languages, context by context.`
          : "Compare how any Ethereum term is translated across all 24 ETHGlossary languages."
      }
      nav="translations"
      activeLang={activeLang}
      url={url}
      island={TERM_FILTER_ISLAND}
    >
      <div class="grid items-start gap-12 pt-8 pb-16 lg:grid-cols-[278px_minmax(0,1fr)]">
        {/* ---------- The grid ---------- */}
        <div class="flex min-w-0 flex-col gap-6">
          <ViewingAll activeLang={activeLang} termId={selected?.id} />

          {!selected ? (
            <div class="flex flex-col gap-4">
              <p class="text-body font-bold text-foreground-subtle">Get started</p>
              <h1 class="font-serif text-h3 font-medium text-foreground-strong">
                Pick a term to compare
              </h1>
              <p class="max-w-prose text-body text-foreground-muted">
                Choose a term and you will see its translation in all {languages.length}{" "}
                languages, split by the context it appears in &mdash; running prose, a
                heading, a filter chip, a button, a code identifier.
              </p>
              <a
                class="inline-flex items-center gap-1.5 self-start text-label-md text-accent"
                href="/contexts"
              >
                What do prose, tag and UI mean?
                <Icon svg={arrowRight} class="size-4" />
              </a>
            </div>
          ) : (
            <>
              <div class="flex flex-col gap-3">
                <p class="text-body font-bold text-foreground-subtle">Term</p>
                <h1 class="font-serif text-h3 font-medium text-foreground-strong">
                  {selected.term}
                </h1>
                <a
                  class="inline-flex items-center gap-1.5 self-start text-label-md text-accent"
                  href={`/style-guide/${selected.id}`}
                >
                  Definition and English usage
                  <Icon svg={arrowRight} class="size-4" />
                </a>
              </div>

              <div class="overflow-x-auto rounded-card border border-border-subtle">
                {/*
                  A floor on the width, not just overflow-x. Squeezed into a
                  phone the seven columns wrap every cell to three lines and
                  the rows grow past the viewport height, so the table keeps
                  readable columns and scrolls sideways instead.
                */}
                <table class="w-full min-w-3xl border-collapse text-label-md">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        class={`${CELL} whitespace-nowrap bg-card text-tiny font-bold text-foreground-subtle`}
                      >
                        Language
                      </th>
                      {contexts.map((id) => (
                        <th
                          scope="col"
                          class={`${CELL} whitespace-nowrap bg-card text-tiny font-bold text-foreground-subtle`}
                        >
                          <span class="inline-flex items-center gap-1">
                            {CONTEXT_BY_ID[id].label}
                            <button
                              type="button"
                              class="grid place-items-center rounded-full opacity-75 hover:opacity-100"
                              aria-label={`What does ${CONTEXT_BY_ID[id].label} mean?`}
                              aria-expanded="false"
                              data-tip={CONTEXT_BY_ID[id].summary}
                              data-tip-href={`/contexts#${id}`}
                              data-tip-link={`More about ${CONTEXT_BY_ID[id].label}`}
                            >
                              <Icon svg={info} class="size-3.5" />
                            </button>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {languages.map((l) => {
                      const row = byCode.get(l.code)
                      return (
                        <tr class="group cursor-pointer hover:bg-card" data-row-link>
                          <th scope="row" class={`${CELL} whitespace-nowrap font-normal`}>
                            <a
                              class="no-underline group-hover:underline"
                              href={`/translations/${l.code}/${selected.id}`}
                            >
                              <span
                                class="font-bold text-foreground-strong"
                                lang={l.code}
                                dir={l.dir}
                              >
                                {l.endonym}
                              </span>{" "}
                              <span class="text-foreground-subtle">{l.name}</span>
                            </a>
                          </th>
                          {contexts.map((id) => {
                            const value = row?.values[id]
                            return (
                              <td
                                class={`${CELL} ${value ? "text-foreground" : "text-foreground-subtle"}`}
                              >
                                {/*
                                  The count is Latin digits and an English
                                  word, so it gets its own LTR line. Inside an
                                  RTL cell the bidi algorithm moves a "6
                                  forms:" prefix to the far side of the forms
                                  it labels, which reads as a typo.
                                */}
                                {id === "plurals" && value ? (
                                  <span class="block text-tiny text-foreground-subtle" dir="ltr">
                                    {row?.pluralCount} forms
                                  </span>
                                ) : null}
                                <span lang={value ? l.code : undefined} dir={value ? l.dir : undefined}>
                                  {value ?? "--"}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/*
          Second in the DOM, first in the grid.

          Below `lg` the grid collapses to one column, and a 532-item list
          ahead of the content pushed the table entirely below the fold --
          on a phone and on a 1024px laptop alike. Source order now puts the
          answer first for everyone, a screen reader included.
        */}
        <aside class="bg-sidebar p-6 lg:order-first">
          <h2 class="text-body font-bold text-foreground-strong">Terms</h2>
          <div class="pt-3">
            <input
              type="search"
              id="term-search"
              class="w-full rounded-sm border border-input bg-transparent p-2 text-tiny/6 text-foreground placeholder:text-foreground-muted focus:border-accent"
              placeholder="Search terms..."
              autocomplete="off"
              aria-label="Search terms"
            />
          </div>
          <ul
            id="term-list"
            class="flex max-h-[min(60vh,32rem)] flex-col gap-1 overflow-y-auto pt-5 pb-6 lg:max-h-[calc(100vh-16rem)]"
          >
            {terms.map((t) => (
              <li>
                <a
                  class={`block px-3 py-2 text-body no-underline hover:bg-muted hover:text-foreground-strong hover:no-underline ${
                    selected?.id === t.id
                      ? "border-b border-foreground-strong bg-muted font-bold text-foreground-strong"
                      : "text-foreground"
                  }`}
                  href={`/translations/all/${t.id}`}
                  aria-current={selected?.id === t.id ? "true" : undefined}
                  data-term={t.term.toLowerCase()}
                >
                  {t.term}
                </a>
              </li>
            ))}
          </ul>
          <p class="border-t border-border-subtle pt-2.5 text-tiny text-foreground-subtle">
            <span id="term-count">{terms.length}</span> terms
          </p>
        </aside>
      </div>
    </Layout>
  )
}
