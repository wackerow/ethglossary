/**
 * Link that handles external destinations for you.
 *
 * Any href starting with http gets `target="_blank"` plus the rel pair that
 * closes the reverse-tabnabbing hole, and picks up Lucide's external-link
 * glyph so the reader knows the tab will change. Internal hrefs render as a
 * plain anchor, so one component is safe to use everywhere.
 *
 * Pass `hideArrow` where the marker would be noise -- an icon-only link, or a
 * button-shaped CTA that already reads as an action.
 */

import type { Child } from "hono/jsx"
import { Icon } from "./icon"
import externalLink from "lucide-static/icons/external-link.svg"

interface LinkProps {
  href: string
  class?: string
  /** Suppress the external-link glyph. The new tab still opens. */
  hideArrow?: boolean
  /** Required when the link has no text -- an icon-only link needs a name. */
  "aria-label"?: string
  children?: Child
}

export const isExternal = (href: string): boolean => /^https?:\/\//i.test(href)

export const ExternalLink = ({
  href,
  class: cls,
  hideArrow,
  "aria-label": ariaLabel,
  children,
}: LinkProps) => {
  const external = isExternal(href)

  return (
    <a
      href={href}
      class={cls}
      aria-label={ariaLabel}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
    >
      {children}
      {external && !hideArrow ? (
        <Icon svg={externalLink} class="size-3.5 inline-block shrink-0 align-[-0.1em]" />
      ) : null}
    </a>
  )
}
