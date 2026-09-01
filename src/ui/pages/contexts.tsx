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

export const ContextsPage = () => {
  const noPlurals = listLanguages().filter((l) => l.noPlurals)

  return (
    <Layout
      title="Translation contexts -- ETHGlossary"
      description="What prose, heading, tag, UI, code and plural forms mean, and why a term needs a separate translation for each."
      nav="translate"
    >
      <div class="block" style="padding-block: 40px 24px; max-width: 62ch;">
        <p class="eyebrow">Reference</p>
        <h1 class="term-title">Translation contexts</h1>
        <p class="lede" style="margin-top: 12px;">
          A glossary term does not have one translation. The same English word behaves
          differently in a sentence, in a button, and in a code identifier &mdash; so
          ETHGlossary records each of those separately. These are the slots translators
          fill in and reviewers vote on.
        </p>
      </div>

      <ul class="ctx-list">
        {CONTEXT_TYPES.map((c) => (
          <li class="ctx" id={c.id}>
            <div>
              <h3>{c.label}</h3>
              <p class="id">{c.id}</p>
            </div>
            <div>
              <p class="summary">{c.summary}</p>
              <p>{c.detail}</p>
            </div>
            <div class="eg">
              <span class="row">
                <span class="k">en</span>
                <span class="v">{c.example.en}</span>
              </span>
              <span class="row">
                <span class="k">es</span>
                <span class="v" lang="es">
                  {c.example.es}
                </span>
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div class="block" style="padding-block: 32px 56px; max-width: 62ch;">
        <h2>Why the slot count varies</h2>
        <p class="lede">
          Five contexts &mdash; prose, heading, tag, UI and code &mdash; are filled in for
          every term in every language. Plurals are the exception. {noPlurals.length} of
          the {listLanguages().length} supported languages do not mark plurals
          grammatically at all:{" "}
          <strong>{noPlurals.map((l) => l.name).join(", ")}</strong>. For those, the plural
          slot does not exist and no feedback is collected on it.
        </p>
        <p class="lede">
          Among the languages that do mark plurals, coverage still varies term by term.
          &ldquo;Reviewed every context&rdquo; therefore means every context that is
          actually populated for that specific term in that specific language &mdash; never
          a fixed count.
        </p>
      </div>
    </Layout>
  )
}
