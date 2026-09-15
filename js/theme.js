/* Dewgrid U8 — unlock → SFX + cutscene once → enter run. */
(function (w) {
  "use strict";
  var CODE = "HOTTUBTONY", unlocked = false, introDone = false, startRunFn = null, entering = false;

  function matchCode(raw) {
    var v = String(raw == null ? "" : raw).trim();
    return !!v && v.toUpperCase() === CODE;
  }

  function showBadge(on) {
    w.document.querySelectorAll("#theme-badge, .theme-badge, #hud-theme-badge")
      .forEach(function (el) {
        if (on) {
          el.removeAttribute("hidden"); el.hidden = false;
          el.classList.add("is-active"); el.setAttribute("data-active", "true");
          el.textContent = CODE;
          el.setAttribute("aria-label", "Theme HOTTUBTONY active");
        } else {
          el.setAttribute("hidden", ""); el.hidden = true;
          el.classList.remove("is-active"); el.removeAttribute("data-active");
        }
      });
  }

  function unlock() { unlocked = true; showBadge(true); }
  function isUnlocked() { return unlocked; }

  function setStatus(el, text, ok) {
    if (!el) return;
    el.textContent = text;
    el.className = "theme-code-status " + (ok ? "is-ok" : "is-fail");
  }

  function playSuccessSfx() {
    var s = w.Sfx; if (!s) return;
    try {
      if (s.ensureCtx) s.ensureCtx();
      if (s.unlock) s.unlock(); else if (s.sun) s.sun(); else if (s.wave) s.wave();
    } catch (e) { /* ignore */ }
  }

  function flashSuccess(form) {
    var badge = null, screen = form && form.closest && form.closest(".screen");
    if (screen) badge = screen.querySelector(".theme-badge, #theme-badge");
    if (!badge && w.document) badge = w.document.getElementById("theme-badge");
    if (badge) {
      badge.classList.add("theme-success-burst");
      setTimeout(function () { badge.classList.remove("theme-success-burst"); }, 900);
    }
    var burst = w.document && w.document.getElementById("theme-success-graphic");
    if (!burst) return;
    burst.hidden = false; burst.classList.add("is-on");
    burst.setAttribute("aria-hidden", "false");
    setTimeout(function () {
      burst.classList.remove("is-on"); burst.hidden = true;
      burst.setAttribute("aria-hidden", "true");
    }, 1100);
  }

  function resolveStartFn() {
    if (typeof startRunFn === "function") return startRunFn;
    if (typeof w.__dewStartThemeRun === "function") return w.__dewStartThemeRun;
    return null;
  }

  function afterUnlockIntro(startGameFn) {
    var fn = startGameFn || resolveStartFn();
    if (introDone || entering) return;
    introDone = true; entering = true; playSuccessSfx();
    function done() { entering = false; if (fn) fn(); }
    if (w.ThemeCutscene && typeof w.ThemeCutscene.play === "function") {
      var focusEl = w.document && w.document.getElementById("btn-theme-unlock");
      w.ThemeCutscene.play(focusEl || null, { onDone: done });
      return;
    }
    done();
  }

  function setStartRun(fn) { startRunFn = typeof fn === "function" ? fn : null; }

  function submitForm(form) {
    var input = form.querySelector('input[type="text"]') ||
      form.querySelector("#theme-code, .theme-code-input");
    var status = form.querySelector('[role="status"]') ||
      form.querySelector("#theme-code-status, .theme-code-status");
    if (!input) return;
    if (unlocked) {
      setStatus(status, "HOTTUBTONY is already on.", true); showBadge(true); return;
    }
    if (!matchCode(input.value)) {
      setStatus(status, "No code like that exists.", false);
      try { input.select(); } catch (e) { /* ignore */ }
      return;
    }
    unlock();
    setStatus(status, "HOTTUBTONY unlocked.", true);
    flashSuccess(form);
    input.value = "";
    afterUnlockIntro(resolveStartFn());
  }

  function bindForms() {
    w.document.querySelectorAll(".theme-code-form, #theme-code-form").forEach(function (form) {
      if (form.getAttribute("data-theme-bound")) return;
      form.setAttribute("data-theme-bound", "1");
      form.addEventListener("submit", function (e) { e.preventDefault(); submitForm(form); });
      var btn = form.querySelector("#btn-theme-unlock, .btn-theme-unlock");
      if (btn) {
        if (!btn.getAttribute("type")) btn.setAttribute("type", "submit");
        btn.addEventListener("click", function (e) { e.preventDefault(); submitForm(form); });
      }
      var input = form.querySelector("#theme-code, .theme-code-input");
      if (input) {
        input.addEventListener("keydown", function (e) {
          if (e.key !== "Enter") return;
          e.preventDefault(); e.stopPropagation(); submitForm(form);
        });
      }
    });
    showBadge(unlocked);
  }

  function bind(opts) {
    if (opts && typeof opts.onUnlockRun === "function") setStartRun(opts.onUnlockRun);
    bindForms();
  }

  w.Theme = {
    CODE: CODE, matchCode: matchCode, unlock: unlock, isUnlocked: isUnlocked,
    showBadge: showBadge, afterUnlockIntro: afterUnlockIntro,
    setStartRun: setStartRun, setOnUnlock: setStartRun, bindForms: bindForms, bind: bind
  };
})(window);
