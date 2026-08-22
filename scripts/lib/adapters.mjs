/**
 * LLM adapter interface and registry.
 *
 * The caller references the active adapter, never a specific provider. Mirrors
 * the registry shape in ethereum-org-website's `intl-pipeline/lib/llm/adapters.ts`
 * and blog's `scripts/intl/lib/adapters.ts` so the pattern is recognizable
 * across the three repos.
 *
 * Only one transport is registered today, and that is deliberate: OpenRouter is
 * itself a multi-model router, so switching models -- including switching off
 * Google entirely -- is a model-id change with no code change. What genuinely
 * needed the seam is the git trailer, which was previously hardcoded to Gemini
 * and would have misattributed a run against any other model.
 *
 * To add a transport: implement the shape below, register it, and add a
 * `llm_provider` dispatch input to .github/workflows/propose-term.yml. The
 * caller needs no changes.
 *
 * An adapter provides:
 *   name          display name for logs
 *   tag           lowercase log prefix
 *   envKey        env var holding the API key
 *   defaultModel  model id used when none is given
 *   isAvailable() whether the key is present
 *   complete()    one validated JSON completion; see openrouter.mjs
 *   keyStatus()   optional; account-level spend ceiling, for startup logging
 *   usage()       running spend for this process, for the run fuse
 */

import { completeJson, keyStatus, usage } from "./openrouter.mjs"

/** `provider/model`, as OpenRouter namespaces them. */
export const MODEL_ID_PATTERN = /^[a-z0-9-]+\/[A-Za-z0-9._:-]+$/

/**
 * Git trailer for the model that generated the content.
 *
 * Only providers whose address is already established in this project's own
 * conventions are listed. For anything else this returns null and the caller
 * omits the trailer rather than inventing an address -- attribution still
 * survives, because the commit body names the model id either way.
 */
const MODEL_CO_AUTHORS = [
  // Used by both sibling repos' adapters for the same models.
  [/^google\//, "Gemini <gemini@google.com>"],
  [/^anthropic\//, "Claude <noreply@anthropic.com>"],
]

export function coAuthorForModel(modelId) {
  for (const [pattern, trailer] of MODEL_CO_AUTHORS) {
    if (pattern.test(modelId)) return trailer
  }
  return null
}

/**
 * Temperature for a given validation attempt: 0 first, escalating on retries.
 *
 * The same ladder both sibling repos use (`intl-pipeline/lib/llm/gemini.ts`,
 * `scripts/intl/lib/gemini.ts`). Temperature 0 gives the best and fully
 * reproducible answer on the first attempt, which is what a classification task
 * feeding a data file wants. But determinism cuts both ways: a retry at
 * temperature 0 against a near-identical prompt tends to reproduce the same
 * wrong answer, so a rejected attempt needs variation to escape it. Capped at 1.
 *
 * This applies to *validation* retries only. A transport retry (429, 5xx,
 * timeout) reuses the same temperature, because the model never answered.
 */
export function temperatureForAttempt(attempt) {
  return attempt === 1 ? 0 : Math.min(0.5 * (attempt - 1), 1)
}

export const adapters = {
  // Same models as calling a provider directly, but the key carries a
  // server-side prepaid credit limit the script cannot exceed, and model ids
  // are provider-namespaced -- which is also the seam for moving off any one
  // vendor without touching the caller.
  openrouter: {
    name: "OpenRouter",
    tag: "openrouter",
    envKey: "OPENROUTER_API_KEY",
    defaultModel: "google/gemini-3.1-pro-preview",
    isAvailable: () => Boolean(process.env.OPENROUTER_API_KEY),
    complete: completeJson,
    keyStatus,
    usage,
  },
}

export function resolveAdapter(name) {
  const key = (name ?? "").trim() || "openrouter"
  const adapter = adapters[key]
  if (!adapter) {
    throw new Error(
      `Unknown LLM_PROVIDER "${key}". Registered: ${Object.keys(adapters).join(", ")}. ` +
        `See scripts/lib/adapters.mjs to add one.`
    )
  }
  return adapter
}
