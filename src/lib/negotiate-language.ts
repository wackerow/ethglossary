/**
 * Picking a language for a visitor to /translate.
 *
 * Only an explicit choice counts: the cookie, which is set by actually
 * visiting a language page. With no cookie, /translate sends them to the
 * chooser at /languages.
 *
 * Accept-Language is deliberately NOT consulted. Being dropped into a
 * language you did not pick is disorienting even when the guess is a good
 * one, and the page gave no sign it had happened. The chooser costs one click
 * and is never wrong.
 */

import { SUPPORTED_LANGUAGES } from "./glossary-data"
import { LANG_COOKIE } from "./constants"

/** The stored choice, if it names a language we serve. */
export function languageFromCookie(cookieHeader?: string): string | undefined {
  const raw = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=([^;]+)`))?.[1]
  if (!raw) return undefined
  const value = decodeURIComponent(raw)
  return SUPPORTED_LANGUAGES.includes(value) ? value : undefined
}

/** Where /translate should send this request, or undefined to show the chooser. */
export function resolveLanguage(cookieHeader?: string): string | undefined {
  return languageFromCookie(cookieHeader)
}
