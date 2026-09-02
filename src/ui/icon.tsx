/**
 * Icon rendering from real .svg files.
 *
 * The .svg files under icons/ are the source of truth -- Lucide's set copied
 * by scripts/build-icons.mjs, plus hand-maintained brand marks under
 * icons/brands/ (Lucide has no brand icons). They are imported as text via
 * the Text rule in wrangler.jsonc and re-emitted with our own sizing, so a
 * caller never has to care whether an icon came from Lucide or was drawn here.
 *
 * Adding a Lucide icon: add its name to ICONS in scripts/build-icons.mjs, run
 * `pnpm run build:icons`, then import and register it below.
 * Adding a custom icon: drop the .svg into icons/brands/ and register it.
 */

import { raw } from "hono/html"

import arrowRight from "./icons/arrow-right.svg"
import badgeCheck from "./icons/badge-check.svg"
import bookType from "./icons/book-type.svg"
import circleAlert from "./icons/circle-alert.svg"
import info from "./icons/info.svg"
import moon from "./icons/moon.svg"
import search from "./icons/search.svg"
import squarePen from "./icons/square-pen.svg"
import sun from "./icons/sun.svg"
import thumbsDown from "./icons/thumbs-down.svg"
import thumbsUp from "./icons/thumbs-up.svg"
import users from "./icons/users.svg"

import discord from "./icons/brands/discord.svg"
import github from "./icons/brands/github.svg"
import ethereum from "./icons/brands/ethereum.svg"

const SOURCES = {
  "arrow-right": arrowRight,
  "badge-check": badgeCheck,
  "book-type": bookType,
  "circle-alert": circleAlert,
  info,
  moon,
  search,
  "square-pen": squarePen,
  sun,
  "thumbs-down": thumbsDown,
  "thumbs-up": thumbsUp,
  users,
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
/** Whether the source paints with fill (brands) or strokes (Lucide). */
const FILLED: Record<string, boolean> = {}

for (const [name, source] of Object.entries(SOURCES)) {
  const svg = source as unknown as string
  INNER[name] = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")
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
