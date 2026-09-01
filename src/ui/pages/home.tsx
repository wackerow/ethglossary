/**
 * Landing page -- Figma frame 1:219 ("LP, Non-logged in user").
 *
 * Copy is transcribed from the Figma with two deliberate corrections:
 *   - the frame says "25 languages"; we serve 24, so the count is computed
 *   - the frame's language grid lists Danish, Dutch, Finnish and Cantonese,
 *     none of which exist in the data. The grid renders from the real list.
 */

import { Layout } from "../layout"
import { Users, BookType, ArrowRight, Discord } from "../icons"
import { listLanguages } from "../../lib/language-meta"

export const HomePage = () => {
  const languages = listLanguages()

  return (
    <Layout
      title="ETHGlossary"
      description="Community-reviewed Ethereum terminology in 24 languages, with an English style guide and a simple API."
      bare
    >
      <header class="hero">
        <div class="wrap">
          <h1>
            A shared language for <em>Ethereum</em>
          </h1>
          <p>
            ETHGlossary gives apps and the wider ecosystem community-reviewed Ethereum
            terminology. Ready to use in {languages.length} languages through a simple API.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="/signin">
              <Discord size={16} />
              Join as a translator
            </a>
            <a class="btn btn-ghost" href="/docs">
              Explore the API
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </header>

      <section class="section">
        <div class="wrap">
          <div class="split">
            <div>
              <div class="section-head">
                <span class="bubble bubble-laser" aria-hidden="true" />
                <h2>What is ETHGlossary?</h2>
              </div>
              <div class="prose-block">
                <p>Ethereum is global. Its language should be too.</p>
                <p>
                  ETHGlossary is an open, multilingual glossary for Ethereum: a shared
                  place to{" "}
                  <strong>
                    define concepts, review translations, and make the best available
                    language reusable
                  </strong>{" "}
                  across the ecosystem.
                </p>
                <p>
                  Used and optimized for years by <strong>ethereum.org</strong>.
                </p>
              </div>
            </div>
            <div class="prose-block">
              <p>
                Every term carries more than one translation. A word behaves differently
                in a sentence, in a button label, and in a code identifier &mdash; so the
                glossary records each of those separately, along with plural forms and
                grammatical gender where the language needs them.
              </p>
              <a class="btn btn-outline" href="/contexts">
                What the contexts mean
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="wrap">
          <div class="section-head">
            <span class="bubble bubble-violet" aria-hidden="true" />
            <h2>How to get started</h2>
          </div>
          <div class="cards">
            <article class="card card-violet">
              <Users class="icon" />
              <h3>Shape Ethereum&rsquo;s language</h3>
              <p>
                Review terminology, propose better words, and help your language community
                decide how Ethereum should be understood.
              </p>
              <a class="btn btn-outline" href="/translate">
                Translations
                <ArrowRight size={14} />
              </a>
            </article>

            <article class="card card-green">
              <BookType class="icon" />
              <h3>Get verified translations</h3>
              <p>
                Use community-reviewed terminology in your wallet, dapp, docs, localization
                pipeline, or AI workflow.
              </p>
              <a class="btn btn-outline" href="/docs">
                Documentation
                <ArrowRight size={14} />
              </a>
            </article>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="wrap">
          <div class="split">
            <div class="section-head">
              <span class="bubble bubble-blue" aria-hidden="true" />
              <h2>How it works</h2>
            </div>
            <ol class="steps">
              <li class="step">
                <span class="n">1</span>
                <div>
                  <h3>AI suggests a translation</h3>
                  <p>We have tested a lot of models and found what works.</p>
                </div>
              </li>
              <li class="step">
                <span class="n">2</span>
                <div>
                  <h3>The translator community reviews</h3>
                  <p>
                    Native speakers and Ethereum contributors discuss terms, propose
                    alternatives, and add the context machines miss.
                  </p>
                </div>
              </li>
              <li class="step">
                <span class="n">3</span>
                <div>
                  <h3>Anyone can use it</h3>
                  <p>
                    Reviewed terminology becomes open infrastructure for translators,
                    products, and AI through ETHGlossary&rsquo;s API.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section class="section lang-section">
        <div class="wrap">
          <h2>Translation languages</h2>
          <div class="lang-grid">
            {languages.map((l) => (
              <a class="lang-card" href={`/translate/${l.code}`}>
                <span class="top">
                  <span class="endonym" lang={l.code} dir={l.dir}>
                    {l.endonym}
                  </span>
                  <span class="en">{l.name}</span>
                </span>
                <span class="regions">{l.regions}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section class="closing">
        <div class="wrap">
          <h2>Translation needs more than fluent text</h2>
          <p>
            Machine translation produces text that looks right, but if you don&rsquo;t have
            a native speaker on the team then nobody can actually tell if it is correct.
          </p>
          <p>
            ETHGlossary adds the Ethereum-specific context that helps translators and
            products use terms consistently, clearly, and with confidence.
          </p>
        </div>
      </section>
    </Layout>
  )
}
