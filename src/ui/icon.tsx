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
import messageSquare from "lucide-static/icons/message-square.svg"
import moon from "lucide-static/icons/moon.svg"
import squarePen from "lucide-static/icons/square-pen.svg"
import sun from "lucide-static/icons/sun.svg"
import thumbsDown from "lucide-static/icons/thumbs-down.svg"
import thumbsUp from "lucide-static/icons/thumbs-up.svg"
import users from "lucide-static/icons/users.svg"

import discord from "./icons/discord.svg"
import github from "./icons/github.svg"
import ethglossary from "./icons/ethglossary.svg"

const SOURCES = {
  "arrow-right": arrowRight,
  "badge-check": badgeCheck,
  "book-type": bookType,
  "circle-alert": circleAlert,
  info,
  "message-square": messageSquare,
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
  ethglossary,
} as const

export type IconName = keyof typeof SOURCES

/**
 * Everything between <svg ...> and </svg>. Computed once per icon at module
 * load so rendering is a string concat, not a parse.
 */
const INNER: Record<string, string> = {}
/** Whether the source paints with fill (brand marks) or strokes (Lucide). */
const FILLED: Record<string, boolean> = {}
/**
 * Whether the artwork carries its own colors. The wordmark ships explicit
 * fills and gradients, so it must inherit neither currentColor nor a stroke
 * -- applying Lucide's stroke would outline every shape in it.
 */
const SELF_COLORED: Record<string, boolean> = {}
/** The source viewBox. Lucide is 24x24; the wordmark is not. */
const VIEWBOX: Record<string, string> = {}
/** height / width, so a non-square mark keeps its proportions. */
const RATIO: Record<string, number> = {}

for (const [name, source] of Object.entries(SOURCES)) {
  const svg = source as unknown as string
  INNER[name] = svg
    // lucide-static prefixes each file with a license comment.
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>[\s\S]*$/, "")
    .trim()
  FILLED[name] = /<svg[^>]*fill="currentColor"/.test(svg)
  SELF_COLORED[name] = /fill="(#|url\()/.test(INNER[name])

  const box = svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24"
  VIEWBOX[name] = box
  const [, , w, h] = box.split(/\s+/).map(Number)
  RATIO[name] = w && h ? h / w : 1
}

interface IconProps {
  name: IconName
  /**
   * Rendered height in px. Width follows the source aspect ratio, so a
   * non-square mark like the wordmark is not squashed into a square.
   */
  size?: number
  class?: string
  /** Lucide stroke weight. Ignored for filled brand marks. */
  strokeWidth?: number
}

export const Icon = ({ name, size = 16, class: cls, strokeWidth = 2 }: IconProps) => {
  const filled = FILLED[name]
  const self = SELF_COLORED[name]
  const ratio = RATIO[name] ?? 1
  const stroked = !filled && !self

  return (
    <svg
      width={ratio === 1 ? size : Math.round(size / ratio)}
      height={size}
      viewBox={VIEWBOX[name]}
      fill={self ? "none" : filled ? "currentColor" : "none"}
      stroke={stroked ? "currentColor" : undefined}
      stroke-width={stroked ? strokeWidth : undefined}
      stroke-linecap={stroked ? "round" : undefined}
      stroke-linejoin={stroked ? "round" : undefined}
      class={cls}
      aria-hidden="true"
    >
      {raw(INNER[name])}
    </svg>
  )
}
