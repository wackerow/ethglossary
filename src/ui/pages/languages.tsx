/**
 * Languages index -- every supported language with its real completion stats.
 *
 * Stats come from the same computation the /api/v1/languages endpoint uses,
 * so the page and the API can never disagree.
 */

import { Layout } from "../layout"
import { Icon } from "../icon"
import { listLanguages } from "../../lib/language-meta"
import circleAlert from "lucide-static/icons/circle-alert.svg"
import { LANGUAGES_ISLAND } from "../islands"

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
}: {
  stats: LanguageStat[]
  notice?: LanguagesNotice
  activeLang?: string
}) => {
  const byCode = new Map(stats.map((s) => [s.code, s]))
  const languages = listLanguages()

  return (
    <Layout
      title="Languages -- ETHGlossary"
      description="The 24 languages ETHGlossary covers, with translation coverage and confidence for each."
      nav="languages"
      activeLang={activeLang}
      island={notice ? LANGUAGES_ISLAND : undefined}
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
          class="mt-6 flex items-center gap-2.5 rounded-card border border-accent bg-accent/10 px-4 py-3 text-body text-ink"
        >
          <Icon svg={circleAlert} class="size-5 shrink-0 text-accent" />
          {NOTICE_TEXT[notice]}
        </div>
      ) : null}

      {notice ? (
        /*
          Re-announcement lives here, not in the visible notice. A live region
          only speaks when its content changes, and emptying the visible text
          to force that collapsed the box by 4px and shifted the page. This is
          sr-only and absolutely positioned, so mutating it costs no layout.
        */
        <span
          id="lang-notice-live"
          class="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-message={NOTICE_TEXT[notice]}
        />
      ) : null}

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
              {["Language", "Terms", "Coverage", "High confidence", "Plurals"].map(
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
