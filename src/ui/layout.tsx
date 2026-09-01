/**
 * Page shell: <html> through </html>, plus the nav and footer every page shares.
 *
 * The theme script is inlined in <head> deliberately -- it has to run before
 * first paint or the page flashes the wrong palette. Everything else that is
 * interactive lives in an island loaded at the end of <body>.
 */

import type { Child } from "hono/jsx"
import { raw } from "hono/html"
import { Logo, Sun, Moon, Discord, GitHub } from "./icons"

export type NavKey = "translate" | "languages" | "style-guide" | null

interface LayoutProps {
  title: string
  description: string
  nav?: NavKey
  /** Full-bleed pages (the landing page) opt out of the .wrap container. */
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

export const Nav = ({ active }: { active: NavKey }) => (
  <nav class="nav">
    <div class="wrap">
      <a class="brand" href="/">
        <Logo class="mark" />
        <span>
          ETH<span class="dim">Glossary</span>
        </span>
      </a>

      <ul class="nav-links">
        <li>
          <a
            class="nav-link"
            href="/translate"
            aria-current={active === "translate" ? "page" : undefined}
          >
            Translate
          </a>
        </li>
        <li>
          <a
            class="nav-link"
            href="/languages"
            aria-current={active === "languages" ? "page" : undefined}
          >
            Languages
          </a>
        </li>
        <li>
          <a
            class="nav-link"
            href="/style-guide"
            aria-current={active === "style-guide" ? "page" : undefined}
          >
            Style guide
          </a>
        </li>
      </ul>

      <div class="nav-actions">
        <a class="btn btn-primary btn-sm" href="/signin">
          <Discord size={16} />
          Sign in
        </a>
        <button
          id="theme-toggle"
          class="theme-toggle"
          type="button"
          aria-label="Switch theme"
        >
          <Sun class="sun" />
          <Moon class="moon" />
        </button>
      </div>
    </div>
  </nav>
)

export const Footer = () => (
  <footer class="site-footer">
    <div class="wrap">
      <p>An open-source project for the Ethereum community. MPL-2.0.</p>
      <div class="links">
        <a href="/docs" title="API documentation">
          API docs
        </a>
        <a
          href="https://github.com/wackerow/ethglossary"
          rel="noreferrer noopener"
          aria-label="GitHub repository"
        >
          <GitHub />
        </a>
      </div>
    </div>
  </footer>
)

export const Layout = ({ title, description, nav = null, bare, island, children }: LayoutProps) => (
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
        href="/fonts/noto-serif-latin-500-normal.woff2"
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
