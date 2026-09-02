#!/usr/bin/env node
/**
 * Copies the Lucide icons this UI uses into src/ui/icons/.
 *
 * The .svg files are the source of truth -- they are committed, readable, and
 * a custom icon can be dropped alongside them without ceremony. Lucide has no
 * brand icons, so Discord and GitHub are hand-maintained under icons/brands/
 * and this script leaves them alone.
 *
 * Adding an icon: add its Lucide name to ICONS, run the script, then reference
 * it by name. Removing one: drop it from ICONS and delete the file.
 *
 * Usage: node scripts/build-icons.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const src = join(root, "node_modules", "lucide-static", "icons")
const outDir = join(root, "src", "ui", "icons")

/** Lucide icon names used by the viewer. Keep sorted. */
const ICONS = [
  "arrow-right",
  "badge-check",
  "book-type",
  "circle-alert",
  "info",
  "moon",
  "search",
  "square-pen",
  "sun",
  "thumbs-down",
  "thumbs-up",
  "users",
]

if (!existsSync(src)) {
  console.error("missing dependency: lucide-static -- run pnpm install")
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

let written = 0
const missing = []

for (const name of ICONS) {
  const file = join(src, `${name}.svg`)
  if (!existsSync(file)) {
    missing.push(name)
    continue
  }
  // Strip the license comment and collapse the attribute block onto one line;
  // the Icon component re-emits its own <svg> wrapper anyway.
  const svg = readFileSync(file, "utf8")
    .replace(/<!--[\s\S]*?-->\s*/g, "")
    .replace(/\s+/g, " ")
    .trim()
  writeFileSync(join(outDir, `${name}.svg`), svg + "\n")
  written++
}

if (missing.length) {
  console.error(`not in lucide-static: ${missing.join(", ")}`)
  process.exit(1)
}

const brands = existsSync(join(outDir, "brands"))
  ? readdirSync(join(outDir, "brands")).filter((f) => f.endsWith(".svg"))
  : []

console.log(`wrote ${written} lucide icons to src/ui/icons`)
console.log(`left ${brands.length} hand-maintained brand icons untouched`)
