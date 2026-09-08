/**
 * English style guide -- the authoritative "how do I write this term?" view.
 *
 * Renders the master term list with casing, avoid forms and aliases. This is
 * the surface content authors use; translators use /translate instead.
 */

import { raw } from "hono/html"
import { Layout } from "../layout"
import type { PageUrl } from "../layout"
import { Icon } from "../icon"
import arrowRight from "lucide-static/icons/arrow-right.svg"
import info from "lucide-static/icons/info.svg"
import { sanitizeDefinition, definitionToText } from "../../lib/sanitize"
import { TERM_FILTER_ISLAND } from "../islands"
import { CONTEXT_BY_ID } from "../../lib/context-types"
import { ExternalLink } from "../link"
import { listLanguages } from "../../lib/language-meta"
import type { GlossaryTerm } from "../../lib/glossary-data"

const aliasText = (a: string | { term: string; status: string }): string =>
  typeof a === "string" ? a : a.term

const CELL = "border-b border-border-subtle px-3.5 py-2.5 text-left align-top"

/*
 * Whole-row link. A row holding exactly one link makes the entire row the
 * target; `data-row-link` is what src/ui/row-link.ts looks for. `group` is
 * how the link picks up the row's hover, since the pointer is no longer
 * literally over it.
 */
const HEAD = `${CELL} whitespace-nowrap bg-card text-tiny font-bold text-foreground-subtle`
const ROW = "group cursor-pointer hover:bg-card"
const ROW_LINK = "no-underline group-hover:underline"
/*
 * Pills. `whitespace-nowrap` because a chip that wraps stops reading as one
 * token -- "accounts-keys" broke across two lines in the Category column and
 * looked like two tags.
 */
const CHIP_BASE = "inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-tiny"
const CHIP = `${CHIP_BASE} bg-muted text-foreground-subtle`
const CHIP_AVOID = `${CHIP_BASE} bg-rose/15 text-rose`
const CHIP_ACTIVE = `${CHIP_BASE} bg-teal/15 text-teal`

export const StyleGuidePage = ({
  terms,
  categories,
  activeCategory,
  activeLang,
  url,
}: {
  terms: Array<GlossaryTerm & { key: string }>
  categories: string[]
  activeCategory?: string
  activeLang?: string
  url?: PageUrl
}) => (
  <Layout
    title="Style guide -- ETHGlossary"
    description="Canonical English spelling, casing and usage for Ethereum terminology."
    nav="style-guide"
    activeLang={activeLang}
    url={url}
    island={TERM_FILTER_ISLAND}
  >
    <div class="flex max-w-prose flex-col gap-3 pt-10 pb-5">
      <p class="text-body font-bold text-foreground-subtle">English</p>
      <h1 class="font-serif text-h3 font-medium text-foreground-strong">Style guide</h1>
      <p class="text-body text-foreground-muted">
        The canonical written form of {terms.length} Ethereum terms &mdash; how each one is
        spelled and capitalized, which forms to avoid, and what it means.
      </p>
    </div>

    {/*
      Filters the rendered table, same as the translate sidebar. Not its own
      route: there is nothing to fetch, every term is already on the page.
    */}
    <div class="mb-4 max-w-sm">
      <label class="sr-only" for="term-search">
        Filter terms
      </label>
      <input
        type="search"
        id="term-search"
        class="w-full rounded-sm border border-input bg-transparent p-2 text-tiny/6 text-foreground placeholder:text-foreground-muted focus:border-accent"
        placeholder="Filter terms..."
        autocomplete="off"
      />
    </div>

    <div class="mb-5 flex flex-wrap gap-2">
      <a
        class={`no-underline ${!activeCategory ? CHIP_ACTIVE : CHIP}`}
        href="/style-guide"
      >
        All
      </a>
      {categories.map((c) => (
        <a
          class={`no-underline ${activeCategory === c ? CHIP_ACTIVE : CHIP}`}
          href={`/style-guide?category=${encodeURIComponent(c)}`}
        >
          {c}
        </a>
      ))}
    </div>

    <div class="overflow-x-auto rounded-card border border-border-subtle">
      <table class="w-full border-collapse text-label-md">
        <thead>
          <tr>
            {["Term", "Category", "Casing", "Avoid", "Also known as"].map((h) => (
              <th
                scope="col"
                class={`${HEAD} sticky top-0`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody id="term-list">
          {terms.map((t) => (
            <tr class={ROW} data-row-link>
              <td class={CELL}>
                <a
                  class={`${ROW_LINK} font-bold text-foreground-strong`}
                  href={`/style-guide/${t.id}`}
                  data-term={t.term.toLowerCase()}
                >
                  {t.term}
                </a>
              </td>
              <td class={CELL}>
                <span class={CHIP}>{t.category}</span>
              </td>
              <td class={`${CELL} whitespace-nowrap`}>{t.casing}</td>
              <td class={CELL}>
                <span class="flex flex-wrap gap-1">
                  {(t.avoid ?? []).slice(0, 3).map((a) => (
                    <span class={CHIP_AVOID}>{a}</span>
                  ))}
                </span>
              </td>
              <td class={`${CELL} text-foreground-subtle`}>
                {(t.aliases ?? []).slice(0, 3).map(aliasText).filter(Boolean).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <p class="mt-2.5 mb-14 text-tiny text-foreground-subtle">
      <span id="term-count">{terms.length}</span> terms
    </p>
  </Layout>
)

export const TermDetailPage = ({
  term,
  translations = [],
  activeLang,
  url,
}: {
  term: GlossaryTerm
  /** The prose form in every language, in the order languages are listed. */
  translations?: Array<{ code: string; prose: string | null }>
  activeLang?: string
  url?: PageUrl
}) => (
  <Layout
    title={`${term.term} -- ETHGlossary style guide`}
    description={definitionToText(term.definition).slice(0, 155) || term.term}
    nav="style-guide"
    activeLang={activeLang}
    url={url}
  >
    <div class="flex max-w-prose flex-col gap-8 pt-10 pb-14">
      <div class="flex flex-col gap-3">
        <p class="text-body font-bold text-foreground-subtle">
          <a class="no-underline hover:underline" href="/style-guide">
            Style guide
          </a>
        </p>
        <h1 class="font-serif text-h3 font-medium text-foreground-strong">{term.term}</h1>
        <div class="flex flex-wrap gap-2">
          <span class={CHIP}>{term.category}</span>
          <span class={CHIP}>{term.casing}</span>
          {term.script_rule ? <span class={CHIP}>{term.script_rule}</span> : null}
        </div>
      </div>

      {term.definition ? (
        <div class="flex flex-col gap-3">
          <p class="text-body font-bold text-foreground-subtle">Definition</p>
          <div class="definition-html rounded-md bg-card px-4 py-4 text-body">
            {raw(sanitizeDefinition(term.definition))}
          </div>
        </div>
      ) : null}

      {/*
        Directly under the definition, because that is what these came out of.
        Definitions used to carry the links inline; they now hold prose only,
        and anything worth reading further sits here as its own section.
      */}
      {term.references?.length ? (
        <div class="flex flex-col gap-3">
          <p class="text-body font-bold text-foreground-subtle">Further reading</p>
          <ul class="flex flex-col gap-2">
            {term.references.map((r) => (
              <li>
                <ExternalLink
                  class="inline-flex items-baseline gap-1.5 text-body text-accent no-underline hover:underline"
                  href={r.url}
                >
                  {r.label}
                </ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {term.avoid?.length ? (
        <div class="flex flex-col gap-3">
          <p class="text-body font-bold text-foreground-subtle">Do not write</p>
          <div class="flex flex-wrap gap-2">
            {term.avoid.map((a) => (
              <span class={CHIP_AVOID}>{a}</span>
            ))}
          </div>
        </div>
      ) : null}

      {term.aliases?.length ? (
        <div class="flex flex-col gap-3">
          <p class="text-body font-bold text-foreground-subtle">Also known as</p>
          <div class="flex flex-wrap gap-2">
            {term.aliases.map((a) => (
              <span class={CHIP}>{aliasText(a)}</span>
            ))}
          </div>
        </div>
      ) : null}

      {term.note ? (
        <div class="flex flex-col gap-3">
          <p class="text-body font-bold text-foreground-subtle">Note</p>
          <p class="text-body text-foreground-muted">{term.note}</p>
        </div>
      ) : null}

      {/*
        Every language, not one. This page is the English reference, so the
        useful next question is "what did everyone else do with it?" -- and
        the answer used to be a link into Spanish, which was hardcoded.

        Prose only: it is the form the other five are derived from, and six
        columns would not fit beside a prose-width column of definitions.
        The full grid is one link away.
      */}
      <div class="flex flex-col gap-3">
        <p class="text-body font-bold text-foreground-subtle">Translations</p>
        <div class="overflow-x-auto rounded-card border border-border-subtle">
          <table class="w-full border-collapse text-label-md">
            <caption class="sr-only">
              The prose translation of {term.term} in each supported language
            </caption>
            <thead>
              <tr>
                <th scope="col" class={HEAD}>
                  Language
                </th>
                <th scope="col" class={HEAD}>
                  {/* Same affordance as the compare grid: the column header
                      explains the slot it holds, and links on to /contexts. */}
                  <span class="inline-flex items-center gap-1">
                    {CONTEXT_BY_ID.prose.label}
                    <button
                      type="button"
                      class="grid place-items-center rounded-full opacity-75 hover:opacity-100"
                      aria-label={`What does ${CONTEXT_BY_ID.prose.label} mean?`}
                      aria-expanded="false"
                      data-tip={CONTEXT_BY_ID.prose.summary}
                      data-tip-href="/contexts#prose"
                      data-tip-link={`More about ${CONTEXT_BY_ID.prose.label}`}
                    >
                      <Icon svg={info} class="size-3.5" />
                    </button>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {listLanguages().map((l) => {
                const prose = translations.find((t) => t.code === l.code)?.prose
                return (
                  <tr class={ROW} data-row-link>
                    <th scope="row" class={`${CELL} whitespace-nowrap font-normal`}>
                      <a class={ROW_LINK} href={`/translations/${l.code}/${term.id}`}>
                        <span class="font-bold text-foreground-strong" lang={l.code} dir={l.dir}>
                          {l.endonym}
                        </span>{" "}
                        <span class="text-foreground-subtle">{l.name}</span>
                      </a>
                    </th>
                    <td
                      class={`${CELL} ${prose ? "text-foreground" : "text-foreground-subtle"}`}
                      lang={prose ? l.code : undefined}
                      dir={prose ? l.dir : undefined}
                    >
                      {prose ?? "--"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <a
          class="inline-flex items-center gap-1.5 self-start text-label-md text-accent"
          href={`/translations/all/${term.id}`}
        >
          Compare every context, not just prose
          <Icon svg={arrowRight} class="size-4" />
        </a>
      </div>
    </div>
  </Layout>
)
