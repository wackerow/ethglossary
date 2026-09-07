/**
 * Whole-row links in tables.
 *
 * A table row holding exactly one link should be clickable end to end. This
 * used to be pure CSS -- an `::after` stretched across a `position: relative`
 * row -- which worked in Chrome and broke badly in WebKit: Safari ignores
 * `position: relative` on a `<tr>` when the table is `border-collapse:
 * collapse`, so the overlay escaped to the initial containing block and every
 * row's copy covered the top screenful of the page. The last row in paint
 * order then swallowed every tap, including on links well above the table.
 *
 * Extending the hit area is behaviour, not presentation, so it is script now
 * and depends on no positioning quirk. The real <a> is untouched: keyboard
 * users, screen readers and anyone without JS reach it exactly as before,
 * and this only widens where a pointer counts as hitting it.
 */

export const ROW_LINK_ISLAND = `
(function () {
  if (!document.querySelector("tr[data-row-link]")) return;

  function linkFor(e) {
    // Anything already interactive handles its own click -- including the
    // row's own link, which needs no help.
    if (e.defaultPrevented) return null;
    if (e.target.closest("a, button, input, select, textarea, label, summary")) return null;
    var row = e.target.closest("tr[data-row-link]");
    if (!row) return null;
    // Finishing a drag-select is not a click on the row.
    var sel = window.getSelection();
    if (sel && String(sel).length && sel.type === "Range") return null;
    return row.querySelector("a[href]");
  }

  document.addEventListener("click", function (e) {
    if (e.button !== 0) return;
    var link = linkFor(e);
    if (!link) return;
    // Match what the link itself would do under a modifier.
    if (e.metaKey || e.ctrlKey || e.shiftKey) window.open(link.href, "_blank", "noopener");
    else link.click();
  });

  document.addEventListener("auxclick", function (e) {
    if (e.button !== 1) return;
    var link = linkFor(e);
    if (link) window.open(link.href, "_blank", "noopener");
  });
})();
`
