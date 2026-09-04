/**
 * Page shell: <html> through </html>, plus the nav and footer every page shares.
 *
 * The theme script is inlined in <head> deliberately -- it has to run before
 * first paint or the page flashes the wrong palette. Everything else that is
 * interactive lives in an island loaded at the end of <body>.
 */

import type { Child } from "hono/jsx"
import { raw } from "hono/html"
import { Icon } from "./icon"
import { COMING_SOON_ISLAND } from "./coming-soon"
import moon from "lucide-static/icons/moon.svg"
import sun from "lucide-static/icons/sun.svg"
import discord from "./icons/discord.svg"
import ethglossary from "./icons/ethglossary.svg"
import github from "./icons/github.svg"
import { ExternalLink } from "./link"
import { ACCOUNTS_ENABLED, COMING_SOON_TITLE, DISCORD_URL, GITHUB_URL } from "../lib/constants"

export type NavKey = "translate" | "languages" | "style-guide" | null

/**
 * How the wordmark is colored.
 *
 * "hero" pins it yellow because the landing-page nav sits over the hero
 * artwork, which is dark in both themes. Everywhere else it takes --color-accent,
 * which is the brand yellow on a dark ground and violet on a light one.
 */
export type BrandTone = "default" | "hero"

interface LayoutProps {
  title: string
  description: string
  nav?: NavKey
  /** Full-bleed pages (the landing page) opt out of the shell container. */
  bare?: boolean
  /** Extra island script for this page, appended after the shared one. */
  island?: string
  /** Wordmark color. Pages whose nav sits over the hero art pass "hero". */
  brand?: BrandTone
  /** Language code the visitor has chosen, shown on the Translate tab. */
  activeLang?: string
  children?: Child
}

/**
 * Runs before paint. Reads the stored preference and stamps data-theme, so
 * the toggle wins over the OS setting in both directions. Wrapped in
 * try/catch because storage throws outright in some privacy modes.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("ethglossary-theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
})();
`

const TOGGLE_SCRIPT = `
(function () {
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", function () {
    var root = document.documentElement;
    var current = root.getAttribute("data-theme");
    if (!current) {
      current = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    var next = current === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    btn.setAttribute("aria-label", next === "light" ? "Switch to dark theme" : "Switch to light theme");
    try { localStorage.setItem("ethglossary-theme", next); } catch (e) {}
  });
})();
`

const NAV_ITEMS: Array<{ key: NavKey; href: string; label: string }> = [
  { key: "translate", href: "/translate", label: "Translate" },
  { key: "languages", href: "/languages", label: "Languages" },
  { key: "style-guide", href: "/style-guide", label: "Style guide" },
]

export const Nav = ({
  active,
  brand = "default",
  activeLang,
}: {
  active: NavKey
  brand?: BrandTone
  activeLang?: string
}) => (
  <nav
    class={`z-20 h-16 ${
      brand === "hero"
        ? // Floats over the hero artwork rather than sitting above it. Not
          // sticky, so it simply scrolls away instead of becoming an
          // unreadable transparent bar over the page content.
          "absolute inset-x-0 top-0 bg-transparent"
        : "sticky top-0 border-b border-line-soft bg-bg"
    }`}
  >
    <div class="wrap flex h-full items-center gap-6">
      <a
        class={`flex shrink-0 items-center gap-2.5 text-h4 font-bold tracking-tight no-underline hover:no-underline ${
          brand === "hero" ? "text-yellow" : "text-accent"
        }`}
        href="/"
      >
        <Icon svg={ethglossary} class="h-[26px]" />
        ETHGlossary
      </a>

      {/*
        Tabs are not part of the landing page -- it has its own CTAs, and the
        Figma's LP nav carries the wordmark and sign-in only.
      */}
      {brand === "hero" ? null : (
        <ul class="mx-auto hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <li>
              <a
                class={`block px-3.5 py-1.5 text-label-md transition-colors hover:no-underline ${
                  active === item.key
                    ? // A tab, not a pill: the hover surface, rounded on top
                      // only at 4px, sitting on a 1px accent rule.
                      "rounded-t-[4px] border-b border-accent bg-surface-2 font-bold text-accent"
                    : "rounded-md text-ink-dim hover:bg-surface-2 hover:text-ink"
                }`}
                href={item.href}
                aria-current={active === item.key ? "page" : undefined}
              >
                {item.label}
                {/*
                  The Translate tab carries the chosen language, so the choice
                  the cookie is making is visible from anywhere on the site.
                */}
                {item.key === "translate" && activeLang ? (
                  <span class="ml-1 font-normal opacity-70">({activeLang})</span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      )}

      <div class="ml-auto flex items-center gap-3">
        {ACCOUNTS_ENABLED ? (
          <a
            class="rounded-full bg-yellow px-4 py-2 text-label-md font-bold text-on-yellow no-underline transition-[filter] hover:brightness-110 hover:no-underline"
            href="/signin"
          >
            Sign in
          </a>
        ) : (
          <button
            type="button"
            class="cursor-not-allowed whitespace-nowrap rounded-full bg-yellow px-4 py-2 text-label-md font-bold text-on-yellow"
            aria-disabled="true"
            data-coming-soon={COMING_SOON_TITLE}
          >
            Sign in
          </button>
        )}
        <button
          id="theme-toggle"
          /*
            Matches the Sign in button beside it. --color-accent IS the brand
            yellow on a dark ground; on a light one it becomes violet, because
            the same yellow measures 1.29:1 there and the control would vanish.
          */
          class={`grid size-8 place-items-center rounded-md text-accent ${
            brand === "hero" ? "hover:bg-white/10" : "hover:bg-surface-2"
          } hover:brightness-110`}
          type="button"
          aria-label="Switch theme"
        >
          <Icon svg={sun} class="size-[18px] theme-icon-light" />
          <Icon svg={moon} class="size-[18px] theme-icon-dark" />
        </button>
      </div>
    </div>
  </nav>
)

export const Footer = () => (
  <footer class="bg-footer text-white">
    <div class="wrap flex flex-wrap items-center justify-between gap-4 py-8">
      <p class="text-tiny text-white/70">
        An open-source project for the Ethereum community. MPL-2.0.
      </p>
      <div class="flex items-center gap-5">
        <a class="text-tiny text-white/80 hover:text-white" href="/docs">
          API docs
        </a>
        <ExternalLink
          class="grid place-items-center text-white/80 hover:text-white"
          href={DISCORD_URL}
          aria-label="ETHGlossary on Discord"
          hideArrow
        >
          <Icon svg={discord} class="size-8" />
        </ExternalLink>
        <ExternalLink
          class="grid place-items-center text-white/80 hover:text-white"
          href={GITHUB_URL}
          aria-label="ETHGlossary on GitHub"
          hideArrow
        >
          <Icon svg={github} class="size-8" />
        </ExternalLink>
      </div>
    </div>
  </footer>
)

export const Layout = ({
  title,
  description,
  nav = null,
  bare,
  island,
  brand = "default",
  activeLang,
  children,
}: LayoutProps) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="color-scheme" content="dark light" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/favicon.svg" />
      <link rel="stylesheet" href="/assets/app.css" />
      <link
        rel="preload"
        href="/fonts/noto-sans-latin-400-normal.woff2"
        as="font"
        type="font/woff2"
        crossorigin="anonymous"
      />
      <link
        rel="preload"
        href="/fonts/noto-serif-latin-700-normal.woff2"
        as="font"
        type="font/woff2"
        crossorigin="anonymous"
      />
      <script>{raw(THEME_SCRIPT)}</script>
    </head>
    <body>
      <Nav active={nav} brand={brand} activeLang={activeLang} />
      {bare ? children : <main class="wrap">{children}</main>}
      <Footer />
      <script>{raw(TOGGLE_SCRIPT)}</script>
      {ACCOUNTS_ENABLED ? null : <script>{raw(COMING_SOON_ISLAND)}</script>}
      {island ? <script>{raw(island)}</script> : null}
    </body>
  </html>
)
