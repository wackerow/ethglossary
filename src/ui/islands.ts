/**
 * Client islands for the translate view.
 *
 * Deliberately small and dependency-free: the page is fully rendered on the
 * server, and these only add filtering and navigation on top of markup that
 * already works without JavaScript. Anything that needs a round trip (voting,
 * suggestions) waits for Phase 3.
 */

/**
 * Filters an already-rendered list of terms.
 *
 * Used by the three places that show a long term list: the translate sidebar,
 * the compare sidebar, and the style guide table. They differ only in whether
 * a row is an <li> or a <tr>, so the script hides whichever ancestor it finds
 * rather than assuming one.
 *
 * Contract: a `#term-search` input, a `#term-list` container whose rows each
 * carry a `[data-term]` element holding the lowercased term, and optionally a
 * `#term-count` to keep in step.
 */
export const TERM_FILTER_ISLAND = `
(function () {
  var search = document.getElementById("term-search");
  var list = document.getElementById("term-list");
  var counter = document.getElementById("term-count");
  if (!search || !list) return;

  var rows = Array.prototype.slice.call(list.querySelectorAll("[data-term]")).map(
    function (el) {
      return { row: el.closest("li, tr") || el, term: el.getAttribute("data-term") || "" };
    }
  );

  function apply() {
    var q = search.value.trim().toLowerCase();
    var shown = 0;

    for (var i = 0; i < rows.length; i++) {
      var match = !q || rows[i].term.indexOf(q) !== -1;
      rows[i].row.hidden = !match;
      if (match) shown++;
    }

    if (counter) counter.textContent = String(shown);
  }

  var frame = 0;
  search.addEventListener("input", function () {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(apply);
  });

  // Keep the selected term visible when the page loads deep-linked.
  //
  // Not scrollIntoView: that walks every scrollable ancestor, so it drags the
  // whole document down and the page opens with its heading off-screen.
  var current = list.querySelector('[aria-current="true"]');
  if (current && list.scrollHeight > list.clientHeight) {
    var listBox = list.getBoundingClientRect();
    var itemBox = current.getBoundingClientRect();
    list.scrollTop += itemBox.top - listBox.top - (list.clientHeight - itemBox.height) / 2;
  }
})();
`
