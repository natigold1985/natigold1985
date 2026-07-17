/* ============================================================
   Yehudit Gold — Accessibility toolbar (נגישות)
   Toggles applied to <html> and persisted in localStorage.
   Compatible with Israeli accessibility guidance (IS 5568 / WCAG 2.0 AA).
   ============================================================ */
(function () {
  "use strict";
  var KEY = "jg_a11y_v1";
  var root = document.documentElement;

  var state = { classes: {}, font: 0 }; // font = step count (-2..+5)
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}

  var FONT_MIN = -2, FONT_MAX = 5, FONT_STEP = 0.1;

  function apply() {
    Object.keys(state.classes).forEach(function (c) {
      root.classList.toggle("a11y-" + c, !!state.classes[c]);
    });
    root.style.setProperty("--a11y-font-scale", (1 + state.font * FONT_STEP).toFixed(2));
    root.classList.toggle("a11y-font-scaled", state.font !== 0);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    syncButtons();
  }

  function toggleClass(name) { state.classes[name] = !state.classes[name]; apply(); }

  function syncButtons() {
    document.querySelectorAll(".a11y-opt[data-a11y]").forEach(function (btn) {
      var k = btn.getAttribute("data-a11y");
      var on = !!state.classes[k];
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function handle(action) {
    switch (action) {
      case "font-up":   state.font = Math.min(FONT_MAX, state.font + 1); apply(); break;
      case "font-down": state.font = Math.max(FONT_MIN, state.font - 1); apply(); break;
      case "reset":
        state = { classes: {}, font: 0 };
        root.removeAttribute("style");
        root.className = root.className.replace(/\ba11y-\S+/g, "").trim();
        apply();
        break;
      default: toggleClass(action);
    }
  }

  document.addEventListener("click", function (e) {
    var opt = e.target.closest ? e.target.closest(".a11y-opt[data-a11y]") : null;
    if (opt) { handle(opt.getAttribute("data-a11y")); }
  });

  /* panel open/close */
  var panel = document.getElementById("a11yPanel");
  var toggle = document.getElementById("a11yToggle");
  var closeBtn = document.getElementById("a11yClose");
  function openPanel() { panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); toggle.setAttribute("aria-expanded", "true"); }
  function closePanel() { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); toggle.setAttribute("aria-expanded", "false"); }
  if (toggle) toggle.addEventListener("click", function () { panel.classList.contains("open") ? closePanel() : openPanel(); });
  if (closeBtn) closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });

  apply();
})();
