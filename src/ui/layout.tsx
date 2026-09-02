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

export type NavKey = "translate" | "languages" | "style-guide" | null

interface LayoutProps {
  title: string
  description: string
  nav?: NavKey
  /** Full-bleed pages (the landing page) opt out of the shell container. */
  bare?: boolean
  /** Extra island script for this page, appended after the shared one. */
  island?: string
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

export const Nav = ({ active }: { active: NavKey }) => (
  <nav class="sticky top-0 z-20 h-16 border-b border-line-soft bg-bg">
    <div class="wrap flex h-full items-center gap-6">
      <a
        class="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-ink no-underline hover:no-underline"
        href="/"
      >
        <Icon name="ethereum" size={22} />
        <span>
          ETH<span class="font-normal text-ink-dim">Glossary</span>
        </span>
      </a>

      <ul class="mx-auto hidden items-center gap-1 md:flex">
        {NAV_ITEMS.map((item) => (
          <li>
            <a
              class={`block rounded-md px-3.5 py-1.5 text-label-md transition-colors hover:bg-surface-2 hover:text-ink hover:no-underline ${
                active === item.key ? "bg-surface-2 font-bold text-accent" : "text-ink-dim"
              }`}
              href={item.href}
              aria-current={active === item.key ? "page" : undefined}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      <div class="ml-auto flex items-center gap-3">
        <a
          class="rounded-full bg-yellow px-4 py-2 text-label-md font-bold text-on-yellow no-underline transition-[filter] hover:brightness-110 hover:no-underline"
          href="/signin"
        >
          Sign in
        </a>
        <button
          id="theme-toggle"
          class="grid size-8 place-items-center rounded-md text-ink-dim hover:bg-surface-2 hover:text-ink"
          type="button"
          aria-label="Switch theme"
        >
          <Icon name="sun" size={18} class="theme-icon-light" />
          <Icon name="moon" size={18} class="theme-icon-dark" />
        </button>
      </div>
    </div>
  </nav>
)

export const Footer = () => (
  <footer class="border-t border-line-soft bg-bg">
    <div class="wrap flex flex-wrap items-center justify-between gap-4 py-8">
      <p class="text-tiny text-ink-faint">
        An open-source project for the Ethereum community. MPL-2.0.
      </p>
      <div class="flex items-center gap-4">
        <a class="text-tiny text-ink-dim hover:text-ink" href="/docs">
          API docs
        </a>
        <a
          class="grid place-items-center text-ink-dim hover:text-ink"
          href="https://github.com/wackerow/ethglossary"
          rel="noreferrer noopener"
          aria-label="GitHub repository"
        >
          <Icon name="github" size={18} />
        </a>
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
      <Nav active={nav} />
      {bare ? children : <main class="wrap">{children}</main>}
      <Footer />
      <script>{raw(TOGGLE_SCRIPT)}</script>
      {island ? <script>{raw(island)}</script> : null}
    </body>
  </html>
)
