/**
 * Translate view -- Figma frames 21:704 and 28:2320 (a slot row).
 *
 * Three columns: term list, term detail with one votable row per applicable
 * context, and the versions rail.
 *
 * Type follows the named Figma styles: the term title is Header-2-Medium
 * (Serif 500 32/40), eyebrow labels are Body-lg-bold (Sans 700 16/24) in
 * #909090, a slot term is Label-xl (Serif 400 20/20), a context label is
 * Label-md (Sans 400 14/14), and vote counts are Label-lg (Sans 400 16/16).
 *
 * Phase 0 renders the shell against the bundled glossary. Vote counts,
 * progress state and version history all arrive in later phases; until then
 * each surface renders its honest empty state rather than placeholder numbers.
 */

import { raw } from "hono/html"
import { Layout } from "../layout"
import type { PageUrl } from "../layout"
import { Icon } from "../icon"
import arrowLeft from "lucide-static/icons/arrow-left.svg"
import arrowRight from "lucide-static/icons/arrow-right.svg"
import badgeCheck from "lucide-static/icons/badge-check.svg"
import circleAlert from "lucide-static/icons/circle-alert.svg"
import info from "lucide-static/icons/info.svg"
import squarePen from "lucide-static/icons/square-pen.svg"
import thumbsDown from "lucide-static/icons/thumbs-down.svg"
import thumbsUp from "lucide-static/icons/thumbs-up.svg"
import { TERM_FILTER_ISLAND } from "../islands"
import { CONTEXT_BY_ID, applicableContexts } from "../../lib/context-types"
import type { ContextId } from "../../lib/context-types"
import { sanitizeDefinition } from "../../lib/sanitize"
import { ACCOUNTS_ENABLED, COMING_SOON_TITLE } from "../../lib/constants"
import { getLanguageMeta } from "../../lib/language-meta"
import type { GlossaryTerm, TranslationEntry } from "../../lib/glossary-data"

export type ProgressState = "none" | "partial" | "full"

export interface TermListItem {
  key: string
  id: string
  term: string
  progress: ProgressState
}

interface TranslatePageProps {
  lang: string
  terms: TermListItem[]
  selected?: {
    key: string
    term: GlossaryTerm
    translation?: TranslationEntry
  }
  prevTermId?: string
  nextTermId?: string
  url?: PageUrl
}

/** Body-lg-bold in the Figma's label grey. */
const EYEBROW = "text-body font-bold text-foreground-subtle"

/**
 * The Figma draws two states: an outline mark with secondary text, and a
 * filled mark with accent/green text. "partial" interpolates between them --
 * green mark, secondary text -- for a term reviewed in some contexts but not
 * all. See docs/context-types.md for how coverage is computed.
 */
const PROGRESS_TONE: Record<ProgressState, { icon: string; text: string }> = {
  none: { icon: "text-foreground-subtle", text: "text-foreground" },
  partial: { icon: "text-teal", text: "text-foreground" },
  full: { icon: "text-teal", text: "text-teal" },
}

const SlotRow = ({
  context,
  value,
  plurals,
  lang,
  dir,
  confidence,
}: {
  context: ContextId
  value: string
  plurals?: Array<[string, string]>
  lang: string
  dir: "ltr" | "rtl"
  /** Set only where it is worth flagging -- see `lowConfidence` below. */
  confidence?: "medium" | "low"
}) => {
  const meta = CONTEXT_BY_ID[context]

  return (
    <li class="overflow-hidden rounded-card border border-border bg-card">
      <div class="flex items-center justify-between gap-4 px-4 py-3">
        {plurals ? (
          <span
            class="flex min-w-0 flex-wrap items-baseline gap-x-4.5 gap-y-1.5 font-serif text-label-xl text-foreground-strong"
            lang={lang}
            dir={dir}
          >
            {plurals.map(([form, term]) => (
              <span class="inline-flex items-baseline gap-1.5">
                <span class="font-sans text-tiny uppercase tracking-wider text-foreground-subtle">
                  {form}
                </span>
                {term}
              </span>
            ))}
          </span>
        ) : (
          <span
            class="min-w-0 break-words font-serif text-label-xl text-foreground-strong"
            lang={lang}
            dir={dir}
          >
            {value}
          </span>
        )}

        <span class="flex shrink-0 items-center gap-4">
          <button
            class="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-label-lg tabular-nums text-foreground-subtle transition-colors hover:bg-muted hover:text-foreground-strong aria-disabled:cursor-not-allowed"
            type="button"
            aria-pressed="false"
            aria-label={`Vote up the ${meta.label} translation`}
            data-context={context}
            data-vote="up"
            aria-disabled={ACCOUNTS_ENABLED ? undefined : "true"}
            data-tip={ACCOUNTS_ENABLED ? undefined : COMING_SOON_TITLE}
          >
            <Icon svg={thumbsUp} class="size-4.5" />
            <span>&ndash;</span>
          </button>
          <button
            class="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-label-lg tabular-nums text-foreground-subtle transition-colors hover:bg-muted hover:text-foreground-strong aria-disabled:cursor-not-allowed"
            type="button"
            aria-pressed="false"
            aria-label={`Vote down the ${meta.label} translation`}
            data-context={context}
            data-vote="down"
            aria-disabled={ACCOUNTS_ENABLED ? undefined : "true"}
            data-tip={ACCOUNTS_ENABLED ? undefined : COMING_SOON_TITLE}
          >
            <Icon svg={thumbsDown} class="size-4.5" />
            <span>&ndash;</span>
          </button>
          <button
            class="grid size-6 place-items-center rounded-md text-foreground-subtle transition-colors hover:bg-muted hover:text-foreground-strong aria-disabled:cursor-not-allowed"
            type="button"
            aria-label={`Suggest a different ${meta.label} translation`}
            data-context={context}
            data-action="suggest"
            aria-disabled={ACCOUNTS_ENABLED ? undefined : "true"}
            data-tip={ACCOUNTS_ENABLED ? undefined : COMING_SOON_TITLE}
          >
            <Icon svg={squarePen} class="size-5" />
          </button>
        </span>
      </div>

      <div class="flex items-center justify-between gap-3 bg-secondary px-4 py-2">
        <span class="inline-flex items-center gap-1.5 text-label-md text-foreground">
          {meta.label}
          {/*
            A button, not a link to /contexts. Tapping the icon should answer
            the question where you are -- a `title` never fires on touch, and
            navigating away loses the term you were reviewing. The link out
            lives inside the popover for when the one line is not enough.
          */}
          <button
            type="button"
            class="grid place-items-center rounded-full text-foreground-muted opacity-75 hover:opacity-100"
            aria-label={`What does ${meta.label} mean?`}
            aria-expanded="false"
            data-tip={meta.summary}
            data-tip-href={`/contexts#${context}`}
            data-tip-link={`More about ${meta.label}`}
          >
            <Icon svg={info} class="size-3.5" />
          </button>
          {/*
            After the info icon, which belongs to the label it explains.
            Only ever shown when confidence is not "high" -- a badge on every
            row would be wallpaper. This one marks a term that wants a native
            speaker's eye, which is the whole reason the field is recorded.
          */}
          {confidence ? (
            <span class="inline-block whitespace-nowrap rounded-full bg-rose/15 px-2 py-0.5 text-tiny text-rose">
              {confidence} confidence
            </span>
          ) : null}
        </span>
      </div>
    </li>
  )
}

export const TranslatePage = ({
  lang,
  terms,
  selected,
  prevTermId,
  nextTermId,
  url,
}: TranslatePageProps) => {
  const meta = getLanguageMeta(lang)
  const dir = meta?.dir ?? "ltr"
  const slots: Array<{
    context: ContextId
    value: string
    plurals?: Array<[string, string]>
  }> = []

  /*
   * Confidence is recorded per entry, not per slot, and prose is the form the
   * others are derived from -- so the flag rides on the prose row rather than
   * being repeated six times.
   */
  const conf = selected?.translation?.confidence
  const lowConfidence = conf === "medium" || conf === "low" ? conf : undefined

  if (selected?.translation) {
    const entry = selected.translation
    for (const context of applicableContexts(entry)) {
      if (context === "plurals") {
        // Render the CLDR categories as labelled forms, not a flat string.
        const forms = Object.entries(entry.plurals ?? {}).filter(
          (pair): pair is [string, string] => Boolean(pair[1])
        )
        if (forms.length) {
          slots.push({ context, value: forms[0][1], plurals: forms })
        }
        continue
      }
      const value = entry.contexts?.[context]?.term
      if (value) slots.push({ context, value })
    }
  }

  return (
    <Layout
      title={
        selected
          ? `${selected.term.term} in ${meta?.name ?? lang} -- ETHGlossary`
          : `Translate to ${meta?.name ?? lang} -- ETHGlossary`
      }
      description={`Review and improve the ${meta?.name ?? lang} translation of Ethereum terminology.`}
      nav="translations"
      activeLang={lang}
      url={url}
      island={TERM_FILTER_ISLAND}
    >
      {/*
        Two stages, not one.

        The term list earns its place beside the content well before there is
        room for the versions rail as well: at `lg` the three-column form
        would leave the detail column about 270px wide, which is narrower than
        a slot row needs. So `lg` puts the list on the left and drops Versions
        below the detail; `xl` promotes Versions back to its own rail.
      */}
      <div class="grid items-start gap-12 pt-8 pb-16 lg:grid-cols-[278px_minmax(0,1fr)] xl:grid-cols-[278px_minmax(0,1fr)_278px]">
        {/* ---------- Column 1: language, then term list ---------- */}
        <div class="flex flex-col gap-4">
          {/*
            Which language you are reviewing, and how to leave it. Without this
            the page gives no sign of the choice the cookie is making on your
            behalf, and no way to undo it.
          */}
          <div class="flex items-baseline justify-between gap-3">
            <span class="min-w-0">
              <span class="block text-tiny text-foreground-subtle">Reviewing</span>
              <span class="font-serif text-h4 font-bold text-foreground-strong" lang={lang} dir={dir}>
                {meta?.endonym ?? lang}
              </span>{" "}
              <span class="text-label-sm text-foreground-subtle">{meta?.name}</span>
            </span>
            <a class="shrink-0 text-label-md text-accent" href="/translations/change">
              Change
            </a>
          </div>

          {/* Figma 21:854: a black wash, square corners, no border, 24px pad. */}
          <aside class="bg-sidebar p-6">
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
                  class={`flex items-center gap-2 px-3 py-2 text-body no-underline hover:bg-muted hover:text-foreground-strong hover:no-underline ${
                    selected?.key === t.key
                      ? "border-b border-foreground-strong bg-muted font-bold text-foreground-strong"
                      : PROGRESS_TONE[t.progress].text
                  }`}
                  href={`/translations/${lang}/${t.id}`}
                  aria-current={selected?.key === t.key ? "true" : undefined}
                  data-term={t.term.toLowerCase()}
                >
                  <Icon
                    svg={badgeCheck}
                    class={`size-4 ${PROGRESS_TONE[t.progress].icon}`}
                  />
                  <span class="min-w-0 flex-1">{t.term}</span>
                </a>
              </li>
            ))}
          </ul>
          <p class="border-t border-border-subtle pt-2.5 text-tiny text-foreground-subtle">
            <span id="term-count">{terms.length}</span> terms
          </p>
          {/*
            A term missing from the glossary is the other half of this page's
            job, and there is nowhere else to report it. Gated like every
            other control that needs an account.
          */}
          <button
            type="button"
            class="mt-4 w-full cursor-not-allowed rounded-full border border-accent px-4 py-2 text-label-md font-bold text-accent"
            aria-disabled="true"
            data-tip={COMING_SOON_TITLE}
          >
            Suggest new term
          </button>
        </aside>
        </div>

        {/* ---------- Column 2: detail ---------- */}
        <div class="flex min-w-0 flex-col gap-10">
          {!selected ? (
            <div class="flex flex-col gap-4">
              <p class={EYEBROW}>Get started</p>
              <h1 class="font-serif text-h3 font-medium text-foreground-strong">Pick a term to review</h1>
              <p class="max-w-prose text-body text-foreground-muted">
                Every term carries a separate translation for each context it appears in.
                Choose one from the list and vote on the forms that read correctly to a
                native speaker &mdash; or suggest better ones.
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
              <div class="flex flex-col gap-4">
                <p class={EYEBROW}>Term</p>
                <h1 class="font-serif text-h3 font-medium text-foreground-strong">
                  {selected.term.term}
                </h1>
              </div>

              {selected.term.definition ? (
                <div class="flex flex-col gap-3">
                  <p class={EYEBROW}>Definition</p>
                  <div class="rounded-md bg-card px-4 py-4">
                    {/* Definitions carry curated markup -- links, lists, emphasis. */}
                    <div class="definition-html text-body">
                      {raw(sanitizeDefinition(selected.term.definition))}
                    </div>
                    <a
                      class="mt-2 inline-block font-serif text-label-md text-accent"
                      href={`/style-guide/${selected.term.id}`}
                    >
                      More in style guide
                    </a>
                  </div>
                </div>
              ) : null}

              <hr class="border-border-subtle" />

              <div class="flex flex-col gap-3">
                <h2 class="text-h4 font-bold text-foreground-strong">Suggested translation</h2>
                <p class="max-w-prose text-body text-foreground-muted">
                  <strong class="font-bold text-foreground-strong">
                    Cast your vote on the terms below
                  </strong>{" "}
                  to help the community select the best translation for each context.
                </p>

                {slots.length === 0 ? (
                  <p class="text-body text-foreground-muted">
                    No {meta?.name ?? lang} translation is recorded for this term yet.
                  </p>
                ) : (
                  <>
                    <div class="flex justify-end">
                      <button
                        id="thumbs-up-all"
                        class="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-label-md font-bold text-accent hover:bg-accent/10 aria-disabled:cursor-not-allowed"
                        type="button"
                        aria-disabled={ACCOUNTS_ENABLED ? undefined : "true"}
                        data-tip={ACCOUNTS_ENABLED ? undefined : COMING_SOON_TITLE}
                      >
                        Thumbs up all
                        <Icon svg={thumbsUp} class="size-4" />
                      </button>
                    </div>

                    <ul class="flex flex-col gap-4">
                      {slots.map((s) => (
                        <SlotRow
                          context={s.context}
                          value={s.value}
                          plurals={s.plurals}
                          lang={lang}
                          dir={dir}
                          confidence={s.context === "prose" ? lowConfidence : undefined}
                        />
                      ))}
                    </ul>
                  </>
                )}

                {ACCOUNTS_ENABLED ? null : (
                  <p class="flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-tiny text-foreground-subtle">
                    <Icon svg={circleAlert} class="mt-0.5 size-3.75 shrink-0" />
                    <span>
                      <b class="text-foreground">Coming soon:</b> voting and suggestions need an
                      account, which ships in a later phase. Everything shown here is live
                      glossary data.
                    </span>
                  </p>
                )}

                {/*
                  Next is the action -- it is how a reviewer works through the
                  list, so it is the button. Previous is a way back, not a way
                  forward, so it stays a plain link. `justify-between` with an
                  empty span keeps Next on the right at the start of the list,
                  where there is no Previous to push it there.
                */}
                {prevTermId || nextTermId ? (
                  <div class="flex items-center justify-between gap-4 pt-2">
                    {prevTermId ? (
                      <a
                        class="inline-flex items-center gap-1.5 text-label-md text-accent"
                        href={`/translations/${lang}/${prevTermId}`}
                      >
                        <Icon svg={arrowLeft} class="size-4" />
                        Previous term
                      </a>
                    ) : (
                      <span />
                    )}
                    {nextTermId ? (
                      <a
                        class="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-label-md font-bold text-primary-foreground no-underline transition-[filter] hover:brightness-110 hover:no-underline"
                        href={`/translations/${lang}/${nextTermId}`}
                      >
                        Next term
                        <Icon svg={arrowRight} class="size-4" />
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <hr class="border-border-subtle" />

              <div class="flex flex-col gap-2">
                <p class="text-body text-foreground-muted">
                  into <strong class="font-bold text-foreground-strong">{meta?.name ?? lang}</strong>
                </p>
                <label class="sr-only" for="suggest-term">
                  Your suggested translation
                </label>
                <input
                  id="suggest-term"
                  class="w-full border-0 border-b border-border bg-transparent px-0.5 py-2.5 font-serif text-h3 text-foreground-strong placeholder:text-foreground-subtle focus:border-accent aria-disabled:cursor-not-allowed"
                  placeholder="Suggest a different translation"
                  aria-disabled={ACCOUNTS_ENABLED ? undefined : "true"}
                  data-tip={ACCOUNTS_ENABLED ? undefined : COMING_SOON_TITLE}
                  readonly={!ACCOUNTS_ENABLED}
                />
                <label class="sr-only" for="suggest-reason">
                  Why is this better?
                </label>
                <textarea
                  id="suggest-reason"
                  class="min-h-11 w-full resize-y border-0 border-b border-border bg-transparent px-0.5 py-2.5 text-body text-foreground placeholder:text-foreground-subtle focus:border-accent aria-disabled:cursor-not-allowed"
                  placeholder="Explain your reasoning (optional)"
                  aria-disabled={ACCOUNTS_ENABLED ? undefined : "true"}
                  data-tip={ACCOUNTS_ENABLED ? undefined : COMING_SOON_TITLE}
                  readonly={!ACCOUNTS_ENABLED}
                />
                <button
                  class="mt-3 inline-flex items-center gap-2 self-start rounded-full bg-primary px-5 py-3 text-body font-bold text-primary-foreground transition-[filter] hover:brightness-110 aria-disabled:cursor-not-allowed"
                  type="button"
                  aria-disabled={ACCOUNTS_ENABLED ? undefined : "true"}
                  data-tip={ACCOUNTS_ENABLED ? undefined : COMING_SOON_TITLE}
                >
                  Suggest translation
                </button>
                <p class="mt-2 flex items-start gap-2 rounded-md bg-muted px-3 py-2.5 text-tiny text-foreground-subtle">
                  <Icon svg={info} class="size-3.75 mt-0.5 shrink-0" />
                  If your term matches an existing suggestion, we&rsquo;ll upvote that one
                  for you instead of creating a duplicate.
                </p>
              </div>
            </>
          )}
        </div>

        {/* ---------- Versions: under the detail at lg, own rail at xl ---------- */}
        <aside class="flex flex-col gap-3 lg:col-start-2 xl:col-start-3 xl:row-start-1">
          <h2 class="border-b border-border pb-2.5 text-body font-bold text-foreground-strong">Versions</h2>
          <p class="text-tiny/relaxed text-foreground-subtle">
            Change history starts once the first build indexes the deployed glossary. Each
            entry will record which context changed, and in which release.
          </p>
        </aside>
      </div>
    </Layout>
  )
}
