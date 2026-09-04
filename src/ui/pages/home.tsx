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
import { ExternalLink } from "../link"
import { DISCORD_URL } from "../../lib/constants"

const CTA_PRIMARY =
  "inline-flex items-center gap-2 rounded-full bg-yellow px-5 py-3 text-body font-bold text-on-yellow no-underline transition-[filter] hover:brightness-110 hover:no-underline"

/** Hero-only: fixed colors, because this sits on the artwork in both themes. */
const CTA_GHOST =
  "inline-flex items-center gap-2 rounded-full border-2 border-white bg-white/10 px-5 py-3 text-body font-bold text-white no-underline backdrop-blur-sm transition-colors hover:bg-white/20 hover:no-underline"

const CTA_OUTLINE =
  "inline-flex h-10 items-center gap-2 self-start rounded-full border border-accent px-6 text-body font-bold text-accent no-underline transition-colors hover:bg-accent/10 hover:no-underline"

/**
 * The speech-bubble mark beside each section heading. Lucide's message-square
 * rather than a hand-rolled border trick, so it matches the rest of the set.
 */
const Bubble = ({ tone }: { tone: string }) => (
  <Icon
    name="message-square"
    size={104}
    strokeWidth={1.25}
    class={`mt-1 hidden size-26 shrink-0 -scale-x-100 sm:block ${tone}`}
  />
)

/**
 * A numbered step marker: the same bubble with its ordinal centered inside.
 * The glyph's tail hangs off the bottom-left, so the digit is nudged up to sit
 * in the middle of the square rather than the middle of the box.
 */
const StepMark = ({ n, tone }: { n: string; tone: string }) => (
  <span class={`relative grid size-[53px] shrink-0 place-items-center ${tone}`}>
    <Icon name="message-square" size={53} strokeWidth={1.5} class="absolute inset-0" />
    <span class="relative -mt-1.5 text-h5/6 font-bold tabular-nums">{n}</span>
  </span>
)

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
      <header class="relative overflow-hidden border-b border-line-soft bg-hero-ground">
        {/*
          The artwork sits at 60% over a fixed dark ground rather than having
          that opacity baked into the file, so the hero reads identically in
          both themes and the source PNG stays untouched.
        */}
        <img
          src="/img/ethglossary-hero.png"
          alt=""
          class="absolute inset-0 size-full object-cover object-right opacity-60"
          width="1440"
          height="640"
          fetchpriority="high"
        />
        <div class="dot-grid-fixed absolute inset-0" aria-hidden="true" />

        {/* pt clears the nav, which floats over this section. */}
        <div class="wrap relative flex flex-col justify-center gap-4 pt-32 pb-24 drop-shadow-hero md:min-h-[640px]">
          {/*
            Fixed white/yellow rather than theme tokens: this copy always sits
            on the hero artwork, which is dark in both themes.
          */}
          <h1 class="font-serif text-h1 font-bold text-white">
            A shared language for <span class="block text-yellow">Ethereum</span>
          </h1>
          <p class="max-w-[746px] font-medium text-lede text-white">
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

      {/*
        The three bubble sections share one vertical wash, edge -> mid -> edge,
        and carry no rules between them. Per the Figma.
      */}
      <div class="bg-linear-to-b from-wash-edge via-wash-mid to-wash-edge">
      {/* ---------- What is ETHGlossary ---------- */}
      <section class="wrap relative py-18 md:py-24">
        <div class="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div class="flex flex-col gap-8">
            <div class="flex items-start gap-5">
              <Bubble tone="text-laser" />
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

          <div class="flex justify-center">
            {/*
              302px image inside two concentric rings: the first 1rem beyond
              the image radius, the second another 0.5rem beyond that.
            */}
            <div class="relative grid size-[302px] shrink-0 place-items-center">
              <span
                class="absolute -inset-4 rounded-full border border-accent"
                aria-hidden="true"
              />
              <span
                class="absolute -inset-6 rounded-full border border-accent"
                aria-hidden="true"
              />
              <img
                src="/img/globe-dining-room.png"
                alt=""
                width="302"
                height="302"
                loading="lazy"
                class="size-[302px] rounded-full object-cover"
              />
            </div>

          </div>
        </div>

        {/* Floats past the section edge on the right, between this and the next. */}
        <Icon
          name="glyph-message-bubble"
          size={251}
          class="pointer-events-none absolute right-0 -bottom-24 hidden opacity-25 xl:block"
        />
      </section>

      {/* ---------- How to get started ---------- */}
      <section class="wrap relative py-18 md:py-24">
        {/* Non-space-occupying: bleeds off the left edge, per the Figma. */}
        <Icon
          name="glyph-purple-red"
          size={491}
          class="pointer-events-none absolute top-1/2 -left-16 hidden -translate-y-1/2 opacity-25 xl:block"
        />
        <div class="mb-8 flex items-start gap-5">
          <Bubble tone="text-violet" />
          <h2 class="max-w-[14ch] font-serif text-h2 font-bold text-ink">
            How to get started
          </h2>
        </div>

        {/* 556 + 32 gap + 556 in the Figma, inset 128 either side of the shell. */}
        <div class="mx-auto grid max-w-[1144px] gap-8 md:grid-cols-2">
          <article class="flex flex-col gap-8 rounded-card border-2 border-violet bg-bg px-6 py-8">
            <Icon name="users" size={64} strokeWidth={1.5} class="text-violet" />
            <div class="flex flex-col gap-2">
              <h3 class="text-h5/6 font-bold text-ink">Shape Ethereum&rsquo;s language</h3>
              <p class="text-body text-ink-3">
                Review terminology, propose better words, and help your language community
                decide how Ethereum should be understood.
              </p>
            </div>
            <a class={CTA_OUTLINE} href="/translate">
              Translations
              <Icon name="arrow-right" size={16} />
            </a>
          </article>

          <article class="flex flex-col gap-8 rounded-card border-2 border-green bg-bg px-6 py-8">
            <Icon name="book-type" size={64} strokeWidth={1.5} class="text-green" />
            <div class="flex flex-col gap-2">
              <h3 class="text-h5/6 font-bold text-ink">Get verified translations</h3>
              <p class="text-body text-ink-3">
                Use community-reviewed terminology in your wallet, dapp, docs, localization
                pipeline, or AI workflow.
              </p>
            </div>
            <a class={CTA_OUTLINE} href="/docs">
              Documentation
              <Icon name="arrow-right" size={16} />
            </a>
          </article>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section class="wrap py-18 md:py-24">
        <div class="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div class="flex items-start gap-5">
            <Bubble tone="text-[#4f7fe0]" />
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
              <li class="grid grid-cols-[53px_1fr] items-start gap-6">
                <StepMark n={step.n} tone={step.tone} />
                <div class="flex flex-col gap-3">
                  <h3 class="font-serif text-h5 font-bold text-ink">{step.title}</h3>
                  <p class="text-body text-ink-3">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div class="mt-12 flex flex-wrap justify-center gap-4">
          <ExternalLink class={CTA_PRIMARY} href={DISCORD_URL} hideArrow>
            <Icon name="discord" size={18} />
            Contribute
          </ExternalLink>
          <a class={CTA_OUTLINE} href="/docs">
            API Documentation
            <Icon name="arrow-right" size={16} />
          </a>
        </div>
      </section>
      </div>

      {/* ---------- Language grid ---------- */}
      <section class="relative overflow-hidden border-y border-line-soft bg-surface py-18 md:py-24">
        <div class="dot-grid absolute inset-0" aria-hidden="true" />
        <div class="wrap relative">
          <h2 class="mb-8 text-center font-serif text-h2-sm font-bold text-ink">
            Translation languages
          </h2>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
            {languages.map((l) => (
              <a
                class="flex flex-col gap-0.5 rounded-xl border border-line bg-bg/50 p-4 no-underline transition-colors hover:border-green hover:no-underline"
                href={`/translate/${l.code}`}
              >
                <span class="flex flex-wrap items-end gap-2">
                  <span class="font-serif text-h4 font-bold text-ink" lang={l.code} dir={l.dir}>
                    {l.endonym}
                  </span>
                  <span class="font-serif text-label-sm text-ink-3">{l.name}</span>
                </span>
                <span class="truncate text-tiny text-ink-dim">{l.regions}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Closing ---------- */}
      <section class="relative overflow-hidden bg-linear-to-b from-deep-top via-deep-mid to-deep-bottom text-white">
        <div class="wrap relative flex items-center gap-12 py-20">
          <div class="flex flex-col gap-6">
            <h2 class="max-w-[16ch] font-serif text-h2 font-bold">
              Translation needs more than fluent text
            </h2>
            <p class="max-w-[555px] text-body-lg text-white/85">
              Machine translation produces text that looks right, but if you don&rsquo;t
              have a native speaker on the team then nobody can actually tell if it is
              correct.
            </p>
            <p class="max-w-[555px] text-body-lg text-white/85">
              ETHGlossary adds the Ethereum-specific context that helps translators and
              products use terms consistently, clearly, and with confidence.
            </p>
          </div>

          <Icon
            name="ethglossary"
            size={180}
            class="ml-auto hidden shrink-0 opacity-15 lg:block"
          />
        </div>
      </section>
    </Layout>
  )
}
