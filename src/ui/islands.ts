/**
 * Client islands for the translate view.
 *
 * Deliberately small and dependency-free: the page is fully rendered on the
 * server, and these only add filtering and navigation on top of markup that
 * already works without JavaScript. Anything that needs a round trip (voting,
 * suggestions) waits for Phase 3.
 *
 * Switching language is a link now, not a picker -- the Languages tab in the
 * nav is the switcher, and /translate/:lang records the choice server-side.
 */

export const TRANSLATE_ISLAND = `
(function () {
  // ---- Term search: filter the rendered list, no refetch ----------------
  var search = document.getElementById("term-search");
  var list = document.getElementById("term-list");
  var counter = document.getElementById("term-count");
  if (!search || !list) return;

  var rows = Array.prototype.slice.call(list.querySelectorAll("li"));
  var total = rows.length;

  function apply() {
    var q = search.value.trim().toLowerCase();
    var shown = 0;

    for (var i = 0; i < rows.length; i++) {
      var link = rows[i].querySelector("[data-term]");
      var term = link ? link.getAttribute("data-term") || "" : "";
      var match = !q || term.indexOf(q) !== -1;
      rows[i].hidden = !match;
      if (match) shown++;
    }

    if (counter) counter.textContent = String(shown);
    list.setAttribute("aria-busy", "false");
  }

  var frame = 0;
  search.addEventListener("input", function () {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(apply);
  });

  // Keep the selected term visible when the page loads deep-linked.
  var current = list.querySelector('[aria-current="true"]');
  if (current && current.scrollIntoView) {
    current.scrollIntoView({ block: "center" });
  }
})();
`
