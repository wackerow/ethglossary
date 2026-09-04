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
