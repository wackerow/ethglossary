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

export const LanguagesPage = ({ stats }: { stats: LanguageStat[] }) => {
  const byCode = new Map(stats.map((s) => [s.code, s]))
  const languages = listLanguages()

  return (
    <Layout
      title="Languages -- ETHGlossary"
      description="The 24 languages ETHGlossary covers, with translation coverage and confidence for each."
      nav="languages"
    >
      <div class="block" style="padding-block: 40px 24px; max-width: 62ch;">
        <p class="eyebrow">Coverage</p>
        <h1 class="term-title">{languages.length} languages</h1>
        <p class="lede" style="margin-top: 12px;">
          Every language carries the same {stats[0]?.totalTerms ?? 0} terms, each with a
          translation for every context it appears in. Confidence is recorded per term by
          the translator or the model that proposed it.
        </p>
      </div>

      <div class="table-wrap" style="margin-bottom: 56px;">
        <table>
          <thead>
            <tr>
              <th scope="col">Language</th>
              <th scope="col">Code</th>
              <th scope="col">Terms</th>
              <th scope="col">Coverage</th>
              <th scope="col">High confidence</th>
              <th scope="col">Plurals</th>
            </tr>
          </thead>
          <tbody>
            {languages.map((l) => {
              const s = byCode.get(l.code)
              return (
                <tr>
                  <td>
                    <a href={`/translate/${l.code}`}>
                      <span class="term-col" lang={l.code} dir={l.dir}>
                        {l.endonym}
                      </span>{" "}
                      <span style="color: var(--ink-dim)">{l.name}</span>
                    </a>
                  </td>
                  <td>
                    <span class="chip">{l.code}</span>
                  </td>
                  <td>{s?.translatedTerms ?? 0}</td>
                  <td>{s ? `${s.completionPercent}%` : "--"}</td>
                  <td>{s?.confidenceBreakdown.high ?? 0}</td>
                  <td>
                    {l.noPlurals ? (
                      <span class="chip">not marked</span>
                    ) : (
                      <span class="chip chip-ok">yes</span>
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
