/**
 * Minimal HTML allowlist for glossary definitions.
 *
 * Definitions carry real markup -- <a> cross-links to other glossary terms,
 * <br>, <strong>, <ul>/<li>, <sup>. Stripping it produces run-on sentences;
 * rendering it raw is fine today because every definition comes from the
 * repo, but community suggestions will flow through the same components in
 * Phase 3, so the allowlist goes in now rather than later.
 *
 * This is not a general-purpose sanitizer. It is deliberately small and
 * deny-by-default: anything not on the list is dropped, attributes are
 * dropped except href on <a>, and href must be relative or https.
 */

const ALLOWED_TAGS = new Set([
  "a",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "code",
  "p",
  "ul",
  "ol",
  "li",
  "sup",
  "sub",
])

const VOID_TAGS = new Set(["br"])

/** Relative paths and https only -- no javascript:, data:, or protocol-relative. */
function safeHref(value: string): string | null {
  const href = value.trim()
  if (href.startsWith("/") && !href.startsWith("//")) return href
  if (href.startsWith("#")) return href
  if (/^https:\/\/[^\s"'<>]+$/i.test(href)) return href
  return null
}

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * Returns an HTML string safe to inject, with only allowlisted tags kept.
 * Unbalanced or unknown tags are dropped; their text content is preserved.
 */
export function sanitizeDefinition(input: string): string {
  if (!input) return ""

  const open: string[] = []
  let out = ""
  let cursor = 0

  const tagPattern = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g
  let match: RegExpExecArray | null

  while ((match = tagPattern.exec(input)) !== null) {
    out += escapeText(input.slice(cursor, match.index))
    cursor = match.index + match[0].length

    const closing = match[1] === "/"
    const tag = match[2].toLowerCase()
    const attrs = match[3] ?? ""

    if (!ALLOWED_TAGS.has(tag)) continue

    if (closing) {
      const idx = open.lastIndexOf(tag)
      if (idx === -1) continue
      // Close anything left dangling inside it, innermost first.
      while (open.length > idx) {
        out += `</${open.pop()}>`
      }
      continue
    }

    if (VOID_TAGS.has(tag)) {
      out += `<${tag} />`
      continue
    }

    if (tag === "a") {
      const hrefMatch = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i)
      const rawHref = hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? ""
      const href = safeHref(rawHref)
      if (!href) {
        // Keep the link text, drop the link.
        continue
      }
      out += `<a href="${escapeText(href)}" rel="noreferrer noopener">`
      open.push("a")
      continue
    }

    out += `<${tag}>`
    open.push(tag)
  }

  out += escapeText(input.slice(cursor))

  while (open.length) {
    out += `</${open.pop()}>`
  }

  return out
}

/** Plain-text form, for <meta description> and other attribute contexts. */
export function definitionToText(input: string): string {
  return (input ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|li|ul|ol)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
