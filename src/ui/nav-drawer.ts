/**
 * Mobile navigation drawer.
 *
 * Below `md` the nav links do not fit beside the wordmark, so they move into
 * a drawer behind a hamburger. Without it there is no way to reach Translate,
 * Languages or the Style guide from a phone at all.
 *
 * The drawer is a `<dialog>` opened with `showModal()`, so the browser
 * supplies the focus trap, inerts the page behind it, closes on Escape,
 * returns focus to the button that opened it, and renders the backdrop. The
 * close button is a `<form method="dialog">`, which needs no script either.
 *
 * What is left is genuinely ours: opening it, closing it when a link is
 * followed, dismissing it on a backdrop click, and not leaving it open when
 * the viewport grows past the breakpoint that justified it.
 */

export const NAV_DRAWER_ISLAND = `
(function () {
  var toggle = document.getElementById("nav-toggle");
  var drawer = document.getElementById("nav-drawer");
  if (!toggle || !drawer || !drawer.showModal) return;

  toggle.addEventListener("click", function () {
    drawer.showModal();
    toggle.setAttribute("aria-expanded", "true");
    // showModal() does not stop the page behind from scrolling.
    document.body.style.overflow = "hidden";
  });

  drawer.addEventListener("close", function () {
    toggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  });

  drawer.addEventListener("click", function (e) {
    // A click that lands on the dialog itself and not its panel is a click on
    // the backdrop: the dialog box fills the panel, so anything outside it
    // still reports the dialog as the target.
    if (e.target === drawer) drawer.close();
    else if (e.target.closest("a")) drawer.close();
  });

  // Returning to a wide viewport must not leave the page inert and unscrollable.
  window.matchMedia("(min-width: 48rem)").addEventListener("change", function (m) {
    if (m.matches && drawer.open) drawer.close();
  });
})();
`
