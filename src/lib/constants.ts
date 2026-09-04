/**
 * Canonical external URLs and shared UI constants.
 *
 * Anything that appears in more than one place, or that would need changing
 * if the project moved, belongs here rather than inline in a template.
 */

/** Where the translation community coordinates. */
export const DISCORD_URL = "https://ethereum.org/discord"

/** Source repository. Moves to the `ethereum` org eventually -- see AGENTS.md. */
export const GITHUB_URL = "https://github.com/wackerow/ethglossary"

/** The project this glossary serves. */
export const ETHEREUM_ORG_URL = "https://ethereum.org"

/** Cookie holding the reviewer's last chosen language. */
export const LANG_COOKIE = "ethglossary-lang"

/** One year, in seconds. */
export const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/**
 * Whether the accounts system is live.
 *
 * Sign-in, votes and suggestions all depend on a database and OAuth that ship
 * in a later phase. Until then every control that would need an account is
 * rendered disabled and labelled, rather than hidden -- a reviewer should be
 * able to see what the page will do, and understand why they cannot do it yet.
 *
 * Flip this to true when the auth phase lands.
 */
export const ACCOUNTS_ENABLED = false

/**
 * Tooltip for the controls ACCOUNTS_ENABLED gates.
 *
 * A hover string rather than text inside the button: the control should still
 * look like itself, so the page reads as the finished thing it will be.
 */
export const COMING_SOON_TITLE = "Coming soon -- this needs an account, which ships in a later phase"
