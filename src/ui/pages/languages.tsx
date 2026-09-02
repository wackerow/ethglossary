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

const CELL = "border-b border-line-soft px-3.5 py-2.5 text-left"

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
                    class={`${CELL} sticky top-0 whitespace-nowrap bg-surface text-tiny font-bold text-ink-dim`}
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
              return (
                <tr class="hover:bg-surface">
                  <td class={CELL}>
                    <a class="no-underline hover:underline" href={`/translate/${l.code}`}>
                      <span class="font-bold text-ink" lang={l.code} dir={l.dir}>
                        {l.endonym}
                      </span>{" "}
                      <span class="text-ink-dim">{l.name}</span>
                    </a>
                  </td>
                  <td class={CELL}>
                    <span class="inline-block rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-ink-dim">
                      {l.code}
                    </span>
                  </td>
                  <td class={`${CELL} tabular-nums`}>{s?.translatedTerms ?? 0}</td>
                  <td class={`${CELL} tabular-nums`}>
                    {s ? `${s.completionPercent}%` : "--"}
                  </td>
                  <td class={`${CELL} tabular-nums`}>{s?.confidenceBreakdown.high ?? 0}</td>
                  <td class={CELL}>
                    {l.noPlurals ? (
                      <span class="inline-block rounded-full bg-surface-2 px-2 py-0.5 text-xs text-ink-dim">
                        not marked
                      </span>
                    ) : (
                      <span class="inline-block rounded-full bg-green/15 px-2 py-0.5 text-xs text-green">
                        yes
                      </span>
                    )}
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
