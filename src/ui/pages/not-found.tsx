/**
 * 404. Keeps the nav (and the mobile drawer) so a wrong URL is a detour
 * rather than a dead end.
 *
 * When the miss happened under a section we know about, it offers the parent
 * directly -- most 404s here will be a mistyped term id or a language code
 * that does not exist, and the useful next step is the list it came from.
 */

import { Layout } from "../layout"
import type { PageUrl } from "../layout"
import { Icon } from "../icon"
import arrowRight from "lucide-static/icons/arrow-right.svg"

export interface NotFoundProps {
  /** The path that missed, so we can offer its parent. */
  path: string
  activeLang?: string
  url?: PageUrl
  /** Near-matches from the term index, when the miss looks like a term. */
  suggestions?: Array<{ id: string; term: string }>
}

/** The section a missed path belongs to, if it belongs to one we serve. */
function parentOf(path: string): { href: string; label: string } | undefined {
  if (path.startsWith("/style-guide")) {
    return { href: "/style-guide", label: "the English style guide" }
  }
  if (path.startsWith("/translations")) {
    // /translations/:lang/:termId -- offer that language's list, not the picker.
    const lang = path.split("/").filter(Boolean)[1]
    return lang && lang !== "all" && /^[a-z]{2}(-[a-z]{2})?$/.test(lang)
      ? { href: `/translations/${lang}`, label: `translations for ${lang}` }
      : { href: "/translations", label: "the language list" }
  }
  if (path.startsWith("/contexts")) return { href: "/contexts", label: "translation contexts" }
  return undefined
}

const LINK =
  "inline-flex items-center gap-1.5 text-label-md text-accent no-underline hover:underline"

export const NotFoundPage = ({ path, activeLang, url, suggestions = [] }: NotFoundProps) => {
  const parent = parentOf(path)

  return (
    <Layout
      title="Not found -- ETHGlossary"
      description="That page does not exist."
      activeLang={activeLang}
      url={url}
      noIndex
    >
      <div class="flex max-w-prose flex-col gap-5 py-20">
        <p class="text-body font-bold text-foreground-subtle">404</p>
        <h1 class="font-serif text-h3 font-medium text-foreground-strong">
          That page doesn&rsquo;t exist
        </h1>
        <p class="text-body text-foreground-muted">
          Nothing is served at <code class="font-mono text-label-sm">{path}</code>. It may
          have been a typo, or a link to a term that has since been renamed.
        </p>

        {suggestions.length ? (
          <div class="flex flex-col gap-2">
            <p class="text-body text-foreground-muted">Did you mean:</p>
            <ul class="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <li>
                  <a
                    class="inline-block rounded-full bg-muted px-3 py-1 text-label-md text-foreground no-underline hover:text-foreground-strong"
                    href={`/style-guide/${s.id}`}
                  >
                    {s.term}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div class="mt-2 flex flex-col gap-2.5">
          {parent ? (
            <a class={LINK} href={parent.href}>
              Back to {parent.label}
              <Icon svg={arrowRight} class="size-4" />
            </a>
          ) : null}
          <a class={LINK} href="/style-guide">
            Browse all terms
            <Icon svg={arrowRight} class="size-4" />
          </a>
          <a class={LINK} href="/">
            Go to the homepage
            <Icon svg={arrowRight} class="size-4" />
          </a>
        </div>
      </div>
    </Layout>
  )
}
