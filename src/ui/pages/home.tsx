/**
 * Landing page -- Figma frame 1:219 ("LP, Non-logged in user").
 *
 * Type is transcribed from the frame rather than the named text styles, which
 * the landing page mostly does not use: h1 is Noto Serif Bold 72/80, section
 * headings are Serif Bold 64/72 at -0.64px tracking, the hero lede is Sans
 * Medium 24/32, and section body is Sans 18/26.
 *
 * Two deliberate corrections against the Figma, which is boilerplate on this
 * point: it says "25 languages" and its grid lists Danish, Dutch, Finnish and
 * Cantonese, none of which exist in the data. Both come from the real list.
 */

import { Layout } from "../layout"
import { Icon } from "../icon"
import { listLanguages } from "../../lib/language-meta"

const CTA_PRIMARY =
  "inline-flex items-center gap-2 rounded-full bg-yellow px-5 py-3 text-body font-bold text-on-yellow no-underline transition-[filter] hover:brightness-110 hover:no-underline"

const CTA_GHOST =
  "inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-body font-bold text-ink-2 no-underline transition-colors hover:border-ink-dim hover:bg-surface hover:no-underline"

const CTA_OUTLINE =
  "inline-flex items-center gap-2 self-start rounded-full border border-accent px-4 py-2 text-label-md font-bold text-accent no-underline transition-colors hover:bg-accent/10 hover:no-underline"

export const HomePage = () => {
  const languages = listLanguages()

  return (
    <Layout
      title="ETHGlossary"
      description="Community-reviewed Ethereum terminology in 24 languages, with an English style guide and a simple API."
      bare
      brand="hero"
    >
      {/* ---------- Hero: frame 1:390, 1440x640 ---------- */}
      <header class="relative overflow-hidden border-b border-line-soft">
        <img
          src="/img/ethglossary-hero.png"
          alt=""
          class="absolute inset-0 size-full object-cover object-right"
          width="1440"
          height="640"
          fetchpriority="high"
        />
        {/* Legibility scrim -- the artwork is bright on its left third. */}
        <div
          class="absolute inset-0 bg-linear-to-r from-bg via-bg/80 to-transparent"
          aria-hidden="true"
        />

        {/* pt clears the nav, which floats over this section. */}
        <div class="wrap relative flex flex-col justify-center gap-4 pt-32 pb-24 drop-shadow-hero md:min-h-[640px]">
          <h1 class="max-w-[15ch] font-serif text-h1 font-bold text-ink-hero">
            A shared language for <span class="block text-yellow">Ethereum</span>
          </h1>
          <p class="max-w-[746px] font-medium text-lede text-ink-hero">
            ETHGlossary gives apps and the wider ecosystem community-reviewed Ethereum
            terminology. Ready to use in {languages.length} languages through a simple API.
          </p>
          <div class="mt-3 flex flex-wrap gap-3">
            <a class={CTA_PRIMARY} href="/signin">
              Join as a translator
            </a>
            <a class={CTA_GHOST} href="/docs">
              Explore the API
              <Icon name="arrow-right" size={18} />
            </a>
          </div>
        </div>
      </header>

      {/* ---------- What is ETHGlossary ---------- */}
      <section class="wrap py-18 md:py-24">
        <div class="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div class="flex flex-col gap-8">
            <div class="flex items-start gap-5">
              <span class="bubble text-laser" aria-hidden="true" />
              <h2 class="max-w-[14ch] font-serif text-h2 font-bold text-ink">
                What is ETHGlossary?
              </h2>
            </div>
            <div class="flex max-w-[555px] flex-col gap-6 text-body-lg text-ink-3">
              <p class="font-medium">Ethereum is global. Its language should be too.</p>
              <p class="font-medium">
                ETHGlossary is an open, multilingual glossary for Ethereum: a shared place
                to{" "}
                <strong class="font-bold text-ink">
                  define concepts, review translations, and make the best available
                  language reusable
                </strong>{" "}
                across the ecosystem.
              </p>
              <p>
                Used and optimized for years by{" "}
                <strong class="font-bold text-ink">ethereum.org</strong>.
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-6 text-body-lg text-ink-3">
            <p>
              Every term carries more than one translation. A word behaves differently in a
              sentence, in a button label, and in a code identifier &mdash; so the glossary
              records each of those separately, along with plural forms and grammatical
              gender where the language needs them.
            </p>
            <a class={CTA_OUTLINE} href="/contexts">
              What the contexts mean
              <Icon name="arrow-right" size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ---------- How to get started ---------- */}
      <section class="wrap border-t border-line-soft py-18 md:py-24">
        <div class="mb-8 flex items-start gap-5">
          <span class="bubble text-violet" aria-hidden="true" />
          <h2 class="max-w-[14ch] font-serif text-h2 font-bold text-ink">
            How to get started
          </h2>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <article class="flex flex-col gap-3 rounded-card border border-violet bg-surface/55 p-6">
            <Icon name="users" size={24} class="text-ink-dim" />
            <h3 class="text-body font-bold text-ink">Shape Ethereum&rsquo;s language</h3>
            <p class="flex-1 text-label-md/6 text-ink-dim">
              Review terminology, propose better words, and help your language community
              decide how Ethereum should be understood.
            </p>
            <a class={CTA_OUTLINE} href="/translate">
              Translations
              <Icon name="arrow-right" size={16} />
            </a>
          </article>

          <article class="flex flex-col gap-3 rounded-card border border-green bg-surface/55 p-6">
            <Icon name="book-type" size={24} class="text-ink-dim" />
            <h3 class="text-body font-bold text-ink">Get verified translations</h3>
            <p class="flex-1 text-label-md/6 text-ink-dim">
              Use community-reviewed terminology in your wallet, dapp, docs, localization
              pipeline, or AI workflow.
            </p>
            <a class={CTA_OUTLINE} href="/docs">
              Documentation
              <Icon name="arrow-right" size={16} />
            </a>
          </article>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section class="wrap border-t border-line-soft py-18 md:py-24">
        <div class="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div class="flex items-start gap-5">
            <span class="bubble text-[#4f7fe0]" aria-hidden="true" />
            <h2 class="max-w-[10ch] font-serif text-h2 font-bold text-ink">How it works</h2>
          </div>

          <ol class="flex flex-col gap-6">
            {[
              {
                n: "1",
                tone: "text-violet",
                title: "AI suggests a translation",
                body: "We have tested a lot of models and found what works.",
              },
              {
                n: "2",
                tone: "text-green",
                title: "The translator community reviews",
                body: "Native speakers and Ethereum contributors discuss terms, propose alternatives, and add the context machines miss.",
              },
              {
                n: "3",
                tone: "text-[#4f7fe0]",
                title: "Anyone can use it",
                body: "Reviewed terminology becomes open infrastructure for translators, products, and AI through ETHGlossary's API.",
              },
            ].map((step) => (
              <li class="grid grid-cols-[34px_1fr] items-start gap-4">
                <span
                  class={`grid size-[34px] place-items-center rounded-[6px_6px_6px_0] border border-current text-label-md font-bold tabular-nums ${step.tone}`}
                >
                  {step.n}
                </span>
                <div>
                  <h3 class="mb-1 text-body font-bold text-ink">{step.title}</h3>
                  <p class="text-label-md/6 text-ink-dim">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Language grid ---------- */}
      <section class="border-y border-line-soft bg-surface py-18 md:py-24">
        <div class="wrap">
          <h2 class="mb-8 text-center font-serif text-h3 font-medium text-ink">
            Translation languages
          </h2>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {languages.map((l) => (
              <a
                class="flex flex-col gap-0.5 rounded-md border border-line bg-bg px-3.5 py-3 no-underline transition-colors hover:border-green hover:no-underline"
                href={`/translate/${l.code}`}
              >
                <span class="flex flex-wrap items-baseline gap-2">
                  <span class="font-bold text-ink" lang={l.code} dir={l.dir}>
                    {l.endonym}
                  </span>
                  <span class="text-tiny text-ink-dim">{l.name}</span>
                </span>
                <span class="text-xs/snug text-ink-faint">{l.regions}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Closing ---------- */}
      <section class="bg-linear-120 from-[#4a2d7a] via-callout to-[#2c2a4d] text-white">
        <div class="wrap flex flex-col gap-5 py-20">
          <h2 class="max-w-[18ch] font-serif text-h3 font-medium">
            Translation needs more than fluent text
          </h2>
          <p class="max-w-[54ch] text-body-lg text-white/85">
            Machine translation produces text that looks right, but if you don&rsquo;t have
            a native speaker on the team then nobody can actually tell if it is correct.
          </p>
          <p class="max-w-[54ch] text-body-lg text-white/85">
            ETHGlossary adds the Ethereum-specific context that helps translators and
            products use terms consistently, clearly, and with confidence.
          </p>
        </div>
      </section>
    </Layout>
  )
}
