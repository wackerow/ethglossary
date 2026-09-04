/**
 * Languages index -- every supported language with its real completion stats.
 *
 * Stats come from the same computation the /api/v1/languages endpoint uses,
 * so the page and the API can never disagree.
 */

import { Layout } from "../layout"
import { listLanguages } from "../../lib/language-meta"

export interface LanguageStat {
  code: string
  translatedTerms: number
  totalTerms: number
  completionPercent: number
  confidenceBreakdown: { high: number; medium: number; low: number }
}

const CELL = "border-b border-line-soft text-left"
/**
 * The link fills the cell so the whole row is a target, not just the words.
 * A row of <a>s rather than one wrapping <a>, because an anchor cannot
 * legally contain <td>.
 */
const CELL_LINK = "block px-3.5 py-2.5 no-underline"

export const LanguagesPage = ({ stats }: { stats: LanguageStat[] }) => {
  const byCode = new Map(stats.map((s) => [s.code, s]))
  const languages = listLanguages()

  return (
    <Layout
      title="Languages -- ETHGlossary"
      description="The 24 languages ETHGlossary covers, with translation coverage and confidence for each."
      nav="languages"
    >
      <div class="flex max-w-[62ch] flex-col gap-3 pt-10 pb-6">
        <p class="text-body font-bold text-ink-label">Coverage</p>
        <h1 class="font-serif text-h3 font-medium text-ink">
          {languages.length} languages
        </h1>
        <p class="text-body text-ink-3">
          Every language carries the same {stats[0]?.totalTerms ?? 0} terms, each with a
          translation for every context it appears in. Confidence is recorded per term by
          the translator or the model that proposed it.
        </p>
      </div>

      <div class="mb-14 overflow-x-auto rounded-card border border-line-soft">
        <table class="w-full border-collapse text-label-md">
          <thead>
            <tr>
              {["Language", "Code", "Terms", "Coverage", "High confidence", "Plurals"].map(
                (h) => (
                  <th
                    scope="col"
                    class={`${CELL} sticky top-0 whitespace-nowrap bg-surface px-3.5 py-2.5 text-tiny font-bold text-ink-dim`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {languages.map((l) => {
              const s = byCode.get(l.code)
              const href = `/translate/${l.code}`
              const label = `Review the ${l.name} glossary`
              return (
                <tr class="group hover:bg-surface">
                  <td class={CELL}>
                    <a class={CELL_LINK} href={href} aria-label={label}>
                      <span class="font-bold text-ink" lang={l.code} dir={l.dir}>
                        {l.endonym}
                      </span>{" "}
                      <span class="text-ink-dim">{l.name}</span>
                    </a>
                  </td>
                  <td class={CELL}>
                    <a class={CELL_LINK} href={href} tabindex={-1} aria-hidden="true">
                      <span class="inline-block rounded-full bg-surface-2 px-2 py-0.5 font-mono text-tiny text-ink-dim">
                        {l.code}
                      </span>
                    </a>
                  </td>
                  <td class={CELL}>
                    <a class={`${CELL_LINK} tabular-nums`} href={href} tabindex={-1} aria-hidden="true">
                      {s?.translatedTerms ?? 0}
                    </a>
                  </td>
                  <td class={CELL}>
                    <a class={`${CELL_LINK} tabular-nums`} href={href} tabindex={-1} aria-hidden="true">
                      {s ? `${s.completionPercent}%` : "--"}
                    </a>
                  </td>
                  <td class={CELL}>
                    <a class={`${CELL_LINK} tabular-nums`} href={href} tabindex={-1} aria-hidden="true">
                      {s?.confidenceBreakdown.high ?? 0}
                    </a>
                  </td>
                  <td class={CELL}>
                    <a class={CELL_LINK} href={href} tabindex={-1} aria-hidden="true">
                      {l.noPlurals ? (
                        <span class="inline-block rounded-full bg-surface-2 px-2 py-0.5 text-tiny text-ink-dim">
                          not marked
                        </span>
                      ) : (
                        <span class="inline-block rounded-full bg-green/15 px-2 py-0.5 text-tiny text-green">
                          yes
                        </span>
                      )}
                    </a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
