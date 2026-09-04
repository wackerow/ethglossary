/**
 * English style guide -- the authoritative "how do I write this term?" view.
 *
 * Renders the master term list with casing, avoid forms and aliases. This is
 * the surface content authors use; translators use /translate instead.
 */

import { raw } from "hono/html"
import { Layout } from "../layout"
import { Icon } from "../icon"
import arrowRight from "lucide-static/icons/arrow-right.svg"
import { sanitizeDefinition, definitionToText } from "../../lib/sanitize"
import type { GlossaryTerm } from "../../lib/glossary-data"

const aliasText = (a: string | { term: string; status: string }): string =>
  typeof a === "string" ? a : a.term

const CELL = "border-b border-line-soft px-3.5 py-2.5 text-left align-top"
const CHIP = "inline-block rounded-full bg-surface-2 px-2 py-0.5 text-tiny text-ink-dim"
const CHIP_AVOID = "inline-block rounded-full bg-laser/15 px-2 py-0.5 text-tiny text-laser"

export const StyleGuidePage = ({
  terms,
  categories,
  activeCategory,
}: {
  terms: Array<GlossaryTerm & { key: string }>
  categories: string[]
  activeCategory?: string
}) => (
  <Layout
    title="Style guide -- ETHGlossary"
    description="Canonical English spelling, casing and usage for Ethereum terminology."
    nav="style-guide"
  >
    <div class="flex max-w-[62ch] flex-col gap-3 pt-10 pb-5">
      <p class="text-body font-bold text-ink-label">English</p>
      <h1 class="font-serif text-h3 font-medium text-ink">Style guide</h1>
      <p class="text-body text-ink-3">
        The canonical written form of {terms.length} Ethereum terms &mdash; how each one is
        spelled and capitalized, which forms to avoid, and what it means.
      </p>
    </div>

    <div class="mb-5 flex flex-wrap gap-2">
      <a
        class={`no-underline ${!activeCategory ? "inline-block rounded-full bg-green/15 px-2 py-0.5 text-tiny text-green" : CHIP}`}
        href="/style-guide"
      >
        All
      </a>
      {categories.map((c) => (
        <a
          class={`no-underline ${activeCategory === c ? "inline-block rounded-full bg-green/15 px-2 py-0.5 text-tiny text-green" : CHIP}`}
          href={`/style-guide?category=${encodeURIComponent(c)}`}
        >
          {c}
        </a>
      ))}
    </div>

    <div class="mb-14 overflow-x-auto rounded-card border border-line-soft">
      <table class="w-full border-collapse text-label-md">
        <thead>
          <tr>
            {["Term", "Category", "Casing", "Avoid", "Also known as"].map((h) => (
              <th
                scope="col"
                class={`${CELL} sticky top-0 whitespace-nowrap bg-surface text-tiny font-bold text-ink-dim`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {terms.map((t) => (
            <tr class="hover:bg-surface">
              <td class={CELL}>
                <a
                  class="font-bold text-ink no-underline hover:underline"
                  href={`/style-guide/${t.id}`}
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
              <td class={`${CELL} text-ink-dim`}>
                {(t.aliases ?? []).slice(0, 3).map(aliasText).filter(Boolean).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Layout>
)

export const TermDetailPage = ({ term }: { term: GlossaryTerm }) => (
  <Layout
    title={`${term.term} -- ETHGlossary style guide`}
    description={definitionToText(term.definition).slice(0, 155) || term.term}
    nav="style-guide"
  >
    <div class="flex max-w-[70ch] flex-col gap-8 pt-10 pb-14">
      <div class="flex flex-col gap-3">
        <p class="text-body font-bold text-ink-label">
          <a class="no-underline hover:underline" href="/style-guide">
            Style guide
          </a>
        </p>
        <h1 class="font-serif text-h3 font-medium text-ink">{term.term}</h1>
        <div class="flex flex-wrap gap-2">
          <span class={CHIP}>{term.category}</span>
          <span class={CHIP}>{term.casing}</span>
          {term.script_rule ? <span class={CHIP}>{term.script_rule}</span> : null}
        </div>
      </div>

      {term.definition ? (
        <div class="flex flex-col gap-3">
          <p class="text-body font-bold text-ink-label">Definition</p>
          <div class="definition-html rounded-md bg-surface px-4 py-4 text-body">
            {raw(sanitizeDefinition(term.definition))}
          </div>
        </div>
      ) : null}

      {term.avoid?.length ? (
        <div class="flex flex-col gap-3">
          <p class="text-body font-bold text-ink-label">Do not write</p>
          <div class="flex flex-wrap gap-2">
            {term.avoid.map((a) => (
              <span class={CHIP_AVOID}>{a}</span>
            ))}
          </div>
        </div>
      ) : null}

      {term.aliases?.length ? (
        <div class="flex flex-col gap-3">
          <p class="text-body font-bold text-ink-label">Also known as</p>
          <div class="flex flex-wrap gap-2">
            {term.aliases.map((a) => (
              <span class={CHIP}>{aliasText(a)}</span>
            ))}
          </div>
        </div>
      ) : null}

      {term.note ? (
        <div class="flex flex-col gap-3">
          <p class="text-body font-bold text-ink-label">Note</p>
          <p class="text-body text-ink-3">{term.note}</p>
        </div>
      ) : null}

      <a
        class="inline-flex items-center gap-1.5 self-start text-label-md text-accent"
        href={`/translate/es/${term.id}`}
      >
        See translations for this term
        <Icon svg={arrowRight} class="size-4" />
      </a>
    </div>
  </Layout>
)
