/**
 * Puts the ETHGlossary wordmark at the top of the Scalar sidebar.
 *
 * /docs is a Scalar API reference: a standalone client-rendered document with
 * no relationship to the rest of the site. Landing on it, there is nothing to
 * say which project it belongs to and no way back -- it reads as a different
 * website. This drops the same mark that sits top-left on every other page
 * above Scalar's search box, linking home.
 *
 * Injected rather than configured: this Scalar version has no logo or sidebar
 * slot in its config (only `theme`, `layout`, `customCss`, `hideSearch` and
 * friends), so the mark is placed by a small script once Scalar has rendered.
 *
 * Colours come from Scalar's own custom properties, so it follows their theme
 * rather than fighting it. If the selector ever stops matching, nothing breaks
 * -- the page renders exactly as it does today, just without the mark.
 */

import ethglossaryMark from "./icons/ethglossary.svg"

const STYLE = `
.eg-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 0.75rem 0.25rem;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1;
  text-decoration: none;
  color: var(--scalar-sidebar-color-1, var(--scalar-color-1));
}
.eg-brand:hover { color: var(--scalar-color-accent); }
.eg-brand svg { height: 1.25rem; width: auto; display: block; }
.eg-brand sub {
  /* Matches the gap the nav wordmark uses on the rest of the site. */
  margin-inline-start: 0.25rem;
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--scalar-sidebar-color-2, var(--scalar-color-3));
}
`

/*
 * Anchored to the search control rather than to the sidebar element, because
 * Scalar renders two of them: the desktop sidebar, and a separate drawer on
 * mobile that mounts only when the menu is opened. Both put the search box in
 * the same kind of row, so keying on the search control covers both.
 *
 * Everything is client-rendered, so the anchor may not exist yet -- hence the
 * observer for first paint and the click listener for the drawer.
 */
const SCRIPT = `
(function () {
  var MARK = ${JSON.stringify(ethglossaryMark)};

  function build() {
    var a = document.createElement("a");
    a.className = "eg-brand";
    a.href = "/";
    a.setAttribute("aria-label", "ETHGlossary home");
    a.innerHTML = MARK + "<span>ETHGlossary<sub>Beta</sub></span>";
    return a;
  }

  function place() {
    var controls = document.querySelectorAll('[class*="sidebar-b-search"]');
    for (var i = 0; i < controls.length; i++) {
      var row = controls[i].parentElement;
      if (!row || !row.parentElement) continue;
      var previous = row.previousElementSibling;
      if (previous && previous.classList.contains("eg-brand")) continue;
      row.parentElement.insertBefore(build(), row);
    }
    return controls.length > 0;
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; place(); });
  }

  schedule();

  // First paint. Bounded, so nothing observes the document forever.
  var observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(function () { observer.disconnect(); }, 10000);

  // The mobile drawer mounts when the menu is opened, long after that.
  document.addEventListener("click", function () {
    schedule();
    setTimeout(schedule, 250);
  });
})();
`

export const DOCS_BRAND = `<style>${STYLE}</style><script>${SCRIPT}</script>`
