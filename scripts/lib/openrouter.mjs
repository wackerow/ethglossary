/**
 * OpenRouter transport for scripts/propose-term.mjs.
 *
 * Why OpenRouter and not a provider API directly: an OpenRouter key carries a
 * server-side, prepaid credit limit and rejects with 402 once it is exhausted.
 * That ceiling holds even when the guards in this repo are wrong. Model ids are
 * provider-namespaced, so it is also the seam for moving off Google without
 * touching the caller.
 *
 * Two guards ride on every request:
 *   - provider.max_price refuses the call outright if no provider serves the
 *     model at or under the expected rate, so a provider-side price change
 *     cannot quietly multiply the bill.
 *   - provider.require_parameters keeps routing to providers that honour
 *     response_format, so structured output is never silently dropped.
 *
 * One accounting note: OpenRouter folds thinking tokens into
 * completion_tokens and bills them as output. A short prompt can return a
 * large output bill that is nearly all reasoning, so reasoning_tokens is
 * surfaced rather than left invisible.
 */

const BASE = "https://openrouter.ai/api/v1"

/**
 * Rate ceiling passed to provider.max_price, USD per 1M tokens. Set from
 * Gemini 3.1 Pro standard-tier list pricing with headroom; a provider quoting
 * above this is refused rather than served.
 */
export const MAX_INPUT_RATE_USD_PER_1M = 3.0
export const MAX_OUTPUT_RATE_USD_PER_1M = 18.0

function apiKey() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error("Missing OPENROUTER_API_KEY")
  return key
}

/** Running spend for this process, so the caller can trip a fuse mid-run. */
const meter = { calls: 0, inputTokens: 0, outputTokens: 0, reasoningTokens: 0, costUsd: 0 }

export function usage() {
  return { ...meter }
}

function record({ inputTokens, outputTokens, reasoningTokens, costUsd }) {
  meter.calls += 1
  meter.inputTokens += inputTokens ?? 0
  meter.outputTokens += outputTokens ?? 0
  meter.reasoningTokens += reasoningTokens ?? 0
  // Fall back to list-price estimation when the provider reports no cost, so
  // an unmetered response still moves the fuse.
  meter.costUsd +=
    costUsd ??
    ((inputTokens ?? 0) / 1e6) * MAX_INPUT_RATE_USD_PER_1M +
      ((outputTokens ?? 0) / 1e6) * MAX_OUTPUT_RATE_USD_PER_1M
}

/**
 * Key budget as OpenRouter sees it. Read at startup so a run announces the
 * ceiling it is operating under, and warns when the key has none.
 */
export async function keyStatus() {
  const res = await fetch(`${BASE}/key`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
  })
  if (!res.ok) throw new Error(`OpenRouter key lookup failed: ${res.status} ${await res.text()}`)
  const body = await res.json()
  return {
    limit: body.data?.limit ?? null,
    limitRemaining: body.data?.limit_remaining ?? null,
    limitReset: body.data?.limit_reset ?? null,
    usage: body.data?.usage ?? 0,
  }
}

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504])

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Signals that no provider would serve the request with response_format
 * attached. require_parameters is what turns a silently-dropped parameter into
 * a routing refusal, so this is the shape that refusal takes.
 */
/**
 * Process-wide, not per-call: once one refusal proves this provider set will
 * not serve structured output, the remaining 24 language calls must not each
 * re-discover it with a wasted round-trip.
 */
let structuredOutputSupported = true

function isStructuredOutputUnsupported(status, body) {
  if (status !== 400 && status !== 404) return false
  const b = body.toLowerCase()
  return (
    b.includes("response_format") ||
    b.includes("structured output") ||
    b.includes("no endpoints found") ||
    b.includes("no allowed providers")
  )
}

/**
 * One JSON completion.
 *
 * `schema` is sent as a strict json_schema response format, and falls back to
 * schema-in-prompt if no provider will serve it. Either way the caller must
 * validate the parsed object: structured output constrains shape, not meaning.
 * Returns the parsed object plus the usage the call was billed for.
 */
export async function completeJson({
  model,
  prompt,
  schema,
  schemaName,
  temperature = 0.2,
  timeoutMs = 5 * 60 * 1000,
  attempts = 3,
}) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Dropping response_format is safe because the schema was never the real
    // enforcement -- the caller validates every field either way -- but it does
    // mean the model is free-forming the JSON, so the first drop is announced.
    const structured = structuredOutputSupported
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey()}`,
          "Content-Type": "application/json",
          "X-Title": "ethglossary propose-term",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: structured
                ? prompt
                : `${prompt}\n\n# Response format\n\nRespond with a single JSON object and nothing else -- no prose, no markdown fence -- conforming exactly to this JSON Schema:\n\n\`\`\`json\n${JSON.stringify(schema)}\n\`\`\``,
            },
          ],
          temperature,
          ...(structured
            ? {
                response_format: {
                  type: "json_schema",
                  json_schema: { name: schemaName, strict: true, schema },
                },
              }
            : {}),
          provider: {
            // Only meaningful while response_format is attached: it is what
            // keeps a provider from accepting the call and ignoring the schema.
            ...(structured ? { require_parameters: true } : {}),
            max_price: {
              prompt: MAX_INPUT_RATE_USD_PER_1M,
              completion: MAX_OUTPUT_RATE_USD_PER_1M,
            },
          },
        }),
      })

      if (res.status === 402) {
        // Credit ceiling. Retrying cannot help.
        throw Object.assign(
          new Error(`OpenRouter 402: key credit limit exhausted (${await res.text()})`),
          { fatal: true }
        )
      }
      if (!res.ok) {
        const text = await res.text()
        if (structured && isStructuredOutputUnsupported(res.status, text)) {
          structuredOutputSupported = false
          console.warn(
            `! OpenRouter would not route ${model} with structured output (${res.status}). ` +
              `Falling back to a schema-in-prompt request; the caller's validation still gates every field.`
          )
          attempt-- // the fallback gets its own attempt, not one of the retries
          continue
        }
        const err = new Error(`OpenRouter ${res.status}: ${text}`)
        if (!RETRYABLE_STATUS.has(res.status)) err.fatal = true
        throw err
      }

      const body = await res.json()

      // A 200 can still carry an error payload from the upstream provider. The
      // prompt was processed either way, so meter whatever usage it reports
      // before throwing.
      if (body.error) {
        if (body.usage) {
          record({
            inputTokens: body.usage.prompt_tokens,
            outputTokens: body.usage.completion_tokens,
            reasoningTokens: body.usage.completion_tokens_details?.reasoning_tokens,
            costUsd: body.usage.cost ?? body.usage.cost_details?.upstream_inference_cost,
          })
        }
        throw new Error(`OpenRouter error: ${body.error.message ?? "unknown"}`)
      }

      const choice = body.choices?.[0]
      const billed = {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        reasoningTokens: body.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
        // usage.cost is OpenRouter's own charge; upstream_inference_cost is
        // what the provider charged them. Prefer the former -- it is our bill.
        costUsd: body.usage?.cost ?? body.usage?.cost_details?.upstream_inference_cost,
      }
      record(billed)

      const finish = choice?.finish_reason
      if (finish && finish !== "stop") {
        // length/content_filter means the JSON is very likely truncated.
        throw new Error(`Non-stop finish_reason: ${finish}`)
      }

      return { data: parseJson(choice?.message?.content ?? ""), billed }
    } catch (err) {
      lastError = err
      if (err.fatal || attempt === attempts) break
      await sleep(1000 * 2 ** (attempt - 1))
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError
}

/**
 * Parse a JSON payload that may arrive fenced despite response_format. Kept
 * tolerant on purpose: the schema is the constraint, the fence is cosmetic.
 */
function parseJson(text) {
  const trimmed = text.trim()
  const unfenced = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed
  try {
    return JSON.parse(unfenced)
  } catch {
    // Last resort: the outermost brace-balanced span.
    const first = unfenced.indexOf("{")
    const last = unfenced.lastIndexOf("}")
    if (first !== -1 && last > first) {
      return JSON.parse(unfenced.slice(first, last + 1))
    }
    throw new Error(`Response was not JSON: ${unfenced.slice(0, 400)}`)
  }
}
