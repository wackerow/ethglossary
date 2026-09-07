/**
 * Languages index -- every supported language with its real completion stats.
 *
 * Stats come from the same computation the /api/v1/languages endpoint uses,
 * so the page and the API can never disagree.
 */

import { Layout } from "../layout"
import type { PageUrl } from "../layout"
import { Icon } from "../icon"
import { listLanguages } from "../../lib/language-meta"
import circleAlert from "lucide-static/icons/circle-alert.svg"

export interface LanguageStat {
  code: string
  translatedTerms: number
  totalTerms: number
  completionPercent: number
  confidenceBreakdown: { high: number; medium: number; low: number }
}

const CELL = "border-b border-border-subtle px-3.5 py-2.5 text-left"

/*
 * Whole-row link -- one stretched overlay, not an <a> per cell.
 *
 * This table used to carry a link in every <td> with `aria-hidden` on the
 * duplicates, which made the row clickable but hid the coverage numbers from
 * a screen reader entirely. See the `row-link` utility in app.css.
 */
const ROW = "relative hover:bg-card"
const ROW_LINK = "row-link no-underline hover:underline"

/** Why the chooser is showing, when the visitor did not navigate here directly. */
export type LanguagesNotice = "choose" | "changed"

const NOTICE_TEXT: Record<LanguagesNotice, string> = {
  choose: "Choose a language to start reviewing.",
  changed: "Language cleared. Choose another to carry on reviewing.",
}

export const LanguagesPage = ({
  stats,
  notice,
  activeLang,
  url,
}: {
  stats: LanguageStat[]
  notice?: LanguagesNotice
  activeLang?: string
  url?: PageUrl
}) => {
  const byCode = new Map(stats.map((s) => [s.code, s]))
  const languages = listLanguages()

  return (
    <Layout
      title="Languages -- ETHGlossary"
      description="The 24 languages ETHGlossary covers, with translation coverage and confidence for each."
      nav="translations"
      activeLang={activeLang}
      url={url}
    >
      {notice ? (
        /*
          Without this, arriving from the Translate tab with no language set
          looks like the tab did nothing -- same page, "Languages" still lit.
        */
        <div
          id="lang-notice"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          class="mt-6 flex items-center gap-2.5 rounded-card border border-accent bg-accent/10 px-4 py-3 text-body text-foreground-strong"
        >
          <Icon svg={circleAlert} class="size-5 shrink-0 text-accent" />
          {NOTICE_TEXT[notice]}
        </div>
      ) : null}

      <div class="flex max-w-prose flex-col gap-3 pt-10 pb-6">
        <p class="text-body font-bold text-foreground-subtle">Translations</p>
        <h1 class="font-serif text-h3 font-medium text-foreground-strong">
          Pick a language
        </h1>
        <p class="text-body text-foreground-muted">
          Every language carries the same {stats[0]?.totalTerms ?? 0} terms, each with a
          translation for every context it appears in. Choose one to review and give
          feedback &mdash; or compare all {languages.length} at once.
        </p>
      </div>

      <div class="mb-14 overflow-x-auto rounded-card border border-border-subtle">
        <table class="w-full border-collapse text-label-md">
          <thead>
            <tr>
              {["Language", "Terms", "Coverage", "High confidence", "Plurals"].map(
                (h) => (
                  <th
                    scope="col"
                    class={`${CELL} sticky top-0 whitespace-nowrap bg-card text-tiny font-bold text-foreground-subtle`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {/*
              "All" is an option in the same list, not a link off to the side
              -- it is one of the things you can pick here. It spans the stat
              columns because coverage figures mean nothing for it, and that
              space says what it does instead.
            */}
            <tr class={ROW}>
              <th scope="row" class={`${CELL} whitespace-nowrap font-normal`}>
                <a class={ROW_LINK} href="/translations/all">
                  <span class="font-bold text-foreground-strong">All languages</span>
                </a>
              </th>
              <td class={`${CELL} text-foreground-subtle`} colspan={4}>
                Compare one term across every language. Read-only &mdash; feedback is
                given inside a single language.
              </td>
            </tr>

            {languages.map((l) => {
              const s = byCode.get(l.code)
              const href = `/translations/${l.code}`
              const label = `Review the ${l.name} glossary`
              return (
                <tr class={ROW}>
                  <th scope="row" class={`${CELL} font-normal`}>
                    <a class={ROW_LINK} href={href} aria-label={label}>
                      <span class="font-bold text-foreground-strong" lang={l.code} dir={l.dir}>
                        {l.endonym}
                      </span>{" "}
                      <span class="text-foreground-subtle">{l.name}</span>
                    </a>
                  </th>
                  <td class={`${CELL} tabular-nums`}>{s?.translatedTerms ?? 0}</td>
                  <td class={`${CELL} tabular-nums`}>
                    {s ? `${s.completionPercent}%` : "--"}
                  </td>
                  <td class={`${CELL} tabular-nums`}>
                    {s?.confidenceBreakdown.high ?? 0}
                  </td>
                  <td class={CELL}>
                    {l.noPlurals ? (
                      <span class="inline-block whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-tiny text-foreground-subtle">
                        not marked
                      </span>
                    ) : (
                      <span class="inline-block whitespace-nowrap rounded-full bg-teal/15 px-2 py-0.5 text-tiny text-teal">
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
