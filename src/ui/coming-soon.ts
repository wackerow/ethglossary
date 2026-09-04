/**
 * Click-to-explain for controls that need an account.
 *
 * Why a script at all: a native `title` only appears on hover, which means it
 * never appears on a touch device -- exactly where someone is most likely to
 * tap a vote button and get nothing.
 *
 * Why the controls are NOT `disabled`: a disabled element fires no click
 * event, so it cannot explain itself. They carry `aria-disabled="true"`
 * instead (announced the same way), plus `readonly` on the fields, and this
 * listener swallows the interaction and shows the reason.
 */

export const COMING_SOON_ISLAND = `
(function () {
  var controls = document.querySelectorAll("[data-coming-soon]");
  if (!controls.length) return;

  var tip = document.createElement("div");
  tip.className = "coming-soon-tip";
  tip.setAttribute("role", "status");
  tip.hidden = true;
  document.body.appendChild(tip);

  var hideTimer = 0;

  function hide() {
    tip.hidden = true;
    window.clearTimeout(hideTimer);
  }

  function show(target) {
    tip.textContent = target.getAttribute("data-coming-soon") || "Coming soon";
    tip.hidden = false;

    var r = target.getBoundingClientRect();
    var t = tip.getBoundingClientRect();
    // Prefer above; flip below when there is no room.
    var top = r.top - t.height - 8;
    if (top < 8) top = r.bottom + 8;
    var left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - t.width - 8));

    tip.style.top = top + window.scrollY + "px";
    tip.style.left = left + window.scrollX + "px";

    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, 4000);
  }

  document.addEventListener("click", function (e) {
    var target = e.target.closest("[data-coming-soon]");
    if (!target) {
      hide();
      return;
    }
    e.preventDefault();
    show(target);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hide();
    // Space and Enter are how a keyboard user "clicks" these.
    if (e.key === "Enter" || e.key === " ") {
      var target = e.target.closest && e.target.closest("[data-coming-soon]");
      if (target) {
        e.preventDefault();
        show(target);
      }
    }
  });

  window.addEventListener("scroll", hide, { passive: true });
  window.addEventListener("resize", hide);
})();
`
