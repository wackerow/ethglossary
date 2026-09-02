/**
 * Icon rendering.
 *
 * Lucide icons are imported straight out of the `lucide-static` package --
 * they are already .svg files on disk, so copying them into the repo would
 * only duplicate the package and let the two drift. Upgrading the whole set
 * is a version bump.
 *
 * `./icons/` holds custom artwork ONLY: Lucide ships no brand marks, so the
 * Discord, GitHub and Ethereum glyphs are hand-maintained there. Anything a
 * designer draws for us goes in the same place.
 *
 * Both kinds arrive as text through the `*.svg` Text rule in wrangler.jsonc,
 * which matches node_modules too. The outer <svg> is stripped once at module
 * load and re-emitted at the requested size, so a caller never has to care
 * where a glyph came from.
 *
 * Adding a Lucide icon: import it from `lucide-static/icons/<name>.svg` and
 * add it to SOURCES. Browse the set at https://lucide.dev/icons.
 */

import { raw } from "hono/html"

import arrowRight from "lucide-static/icons/arrow-right.svg"
import badgeCheck from "lucide-static/icons/badge-check.svg"
import bookType from "lucide-static/icons/book-type.svg"
import circleAlert from "lucide-static/icons/circle-alert.svg"
import info from "lucide-static/icons/info.svg"
import moon from "lucide-static/icons/moon.svg"
import squarePen from "lucide-static/icons/square-pen.svg"
import sun from "lucide-static/icons/sun.svg"
import thumbsDown from "lucide-static/icons/thumbs-down.svg"
import thumbsUp from "lucide-static/icons/thumbs-up.svg"
import users from "lucide-static/icons/users.svg"

import discord from "./icons/discord.svg"
import github from "./icons/github.svg"
import ethereum from "./icons/ethereum.svg"

const SOURCES = {
  "arrow-right": arrowRight,
  "badge-check": badgeCheck,
  "book-type": bookType,
  "circle-alert": circleAlert,
  info,
  moon,
  "square-pen": squarePen,
  sun,
  "thumbs-down": thumbsDown,
  "thumbs-up": thumbsUp,
  users,
  // Custom -- see ./icons. Discord is unused until the Phase 2 sign-in page
  // lists providers; it stays registered so that page is a one-liner.
  discord,
  github,
  ethereum,
} as const

export type IconName = keyof typeof SOURCES

/**
 * Everything between <svg ...> and </svg>. Computed once per icon at module
 * load so rendering is a string concat, not a parse.
 */
const INNER: Record<string, string> = {}
/** Whether the source paints with fill (brand marks) or strokes (Lucide). */
const FILLED: Record<string, boolean> = {}

for (const [name, source] of Object.entries(SOURCES)) {
  const svg = source as unknown as string
  INNER[name] = svg
    // lucide-static prefixes each file with a license comment.
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "")
    .trim()
  FILLED[name] = /<svg[^>]*fill="currentColor"/.test(svg)
}

interface IconProps {
  name: IconName
  /** Rendered square size in px. Lucide is drawn on a 24px grid. */
  size?: number
  class?: string
  /** Lucide stroke weight. Ignored for filled brand marks. */
  strokeWidth?: number
}

export const Icon = ({ name, size = 16, class: cls, strokeWidth = 2 }: IconProps) => {
  const filled = FILLED[name]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? undefined : "currentColor"}
      stroke-width={filled ? undefined : strokeWidth}
      stroke-linecap={filled ? undefined : "round"}
      stroke-linejoin={filled ? undefined : "round"}
      class={cls}
      aria-hidden="true"
    >
      {raw(INNER[name])}
    </svg>
  )
}
