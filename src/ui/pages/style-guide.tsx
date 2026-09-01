/**
 * English style guide -- the authoritative "how do I write this term?" view.
 *
 * Renders the master term list with casing, avoid forms and aliases. This is
 * the surface content authors use; translators use /translate instead.
 */

import { raw } from "hono/html"
import { Layout } from "../layout"
import { sanitizeDefinition, definitionToText } from "../../lib/sanitize"
import type { GlossaryTerm } from "../../lib/glossary-data"

const aliasText = (a: string | { term: string; status: string }): string =>
  typeof a === "string" ? a : a.term

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
    <div class="block" style="padding-block: 40px 20px; max-width: 62ch;">
      <p class="eyebrow">English</p>
      <h1 class="term-title">Style guide</h1>
      <p class="lede" style="margin-top: 12px;">
        The canonical written form of {terms.length} Ethereum terms &mdash; how each one is
        spelled and capitalized, which forms to avoid, and what it means.
      </p>
    </div>

    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px;">
      <a class={`chip${!activeCategory ? " chip-ok" : ""}`} href="/style-guide">
        All
      </a>
      {categories.map((c) => (
        <a
          class={`chip${activeCategory === c ? " chip-ok" : ""}`}
          href={`/style-guide?category=${encodeURIComponent(c)}`}
        >
          {c}
        </a>
      ))}
    </div>

    <div class="table-wrap" style="margin-bottom:56px;">
      <table>
        <thead>
          <tr>
            <th scope="col">Term</th>
            <th scope="col">Category</th>
            <th scope="col">Casing</th>
            <th scope="col">Avoid</th>
            <th scope="col">Also known as</th>
          </tr>
        </thead>
        <tbody>
          {terms.map((t) => (
            <tr>
              <td>
                <a class="term-col" href={`/style-guide/${t.id}`}>
                  {t.term}
                </a>
              </td>
              <td>
                <span class="chip">{t.category}</span>
              </td>
              <td>{t.casing}</td>
              <td>
                {(t.avoid ?? []).slice(0, 3).map((a) => (
                  <span class="chip chip-avoid" style="margin-right:4px">
                    {a}
                  </span>
                ))}
              </td>
              <td style="color: var(--ink-dim)">
                {(t.aliases ?? [])
                  .slice(0, 3)
                  .map(aliasText)
                  .filter(Boolean)
                  .join(", ")}
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
    <div class="term-detail" style="padding-block:40px 56px; max-width:70ch;">
      <div>
        <p class="eyebrow">
          <a href="/style-guide">Style guide</a>
        </p>
        <h1 class="term-title">{term.term}</h1>
        <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
          <span class="chip">{term.category}</span>
          <span class="chip">{term.casing}</span>
          {term.script_rule ? <span class="chip">{term.script_rule}</span> : null}
        </div>
      </div>

      {term.definition ? (
        <div class="block">
          <p class="eyebrow">Definition</p>
          <div class="definition">
            <div>{raw(sanitizeDefinition(term.definition))}</div>
          </div>
        </div>
      ) : null}

      {term.avoid?.length ? (
        <div class="block">
          <p class="eyebrow">Do not write</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            {term.avoid.map((a) => (
              <span class="chip chip-avoid">{a}</span>
            ))}
          </div>
        </div>
      ) : null}

      {term.aliases?.length ? (
        <div class="block">
          <p class="eyebrow">Also known as</p>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            {term.aliases.map((a) => (
              <span class="chip">{aliasText(a)}</span>
            ))}
          </div>
        </div>
      ) : null}

      {term.note ? (
        <div class="block">
          <p class="eyebrow">Note</p>
          <p class="lede">{term.note}</p>
        </div>
      ) : null}

      <div class="block">
        <a class="next-term" href={`/translate/es/${term.id}`}>
          See translations for this term
        </a>
      </div>
    </div>
  </Layout>
)
