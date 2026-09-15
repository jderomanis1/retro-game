/* Dewgrid U7a — HOTTUBTONY session unlock (memory only). */
(function (w) {
  "use strict";
  var CODE = "HOTTUBTONY";
  var sessionUnlocked = false;

  function matchCode(raw) {
    var v = String(raw == null ? "" : raw).trim();
    if (!v) return false;
    return v.toUpperCase() === CODE;
  }

  function unlock() {
    sessionUnlocked = true;
    showBadge(true);
  }

  function isUnlocked() {
    return sessionUnlocked;
  }

  function showBadge(on) {
    var nodes = w.document.querySelectorAll(
      "#theme-badge, .theme-badge, #hud-theme-badge"
    );
    nodes.forEach(function (el) {
      if (on) {
        el.hidden = false;
        el.classList.add("is-active");
        el.setAttribute("data-active", "true");
        el.textContent = CODE;
        el.setAttribute("aria-label", "Theme HOTTUBTONY active");
      } else {
        el.hidden = true;
        el.classList.remove("is-active");
        el.removeAttribute("data-active");
      }
    });
  }

  function setStatus(el, text, ok) {
    if (!el) return;
    el.textContent = text;
    el.className = ok ? "is-ok" : "is-fail";
  }

  function submitForm(form) {
    var input = form.querySelector('input[type="text"]') ||
      form.querySelector("#theme-code, .theme-code-input");
    var status = form.querySelector('[role="status"]') ||
      form.querySelector("#theme-code-status, .theme-code-status");
    if (!input) return;
    if (sessionUnlocked) {
      setStatus(status, "HOTTUBTONY is already on.", true);
      showBadge(true);
      return;
    }
    if (!matchCode(input.value)) {
      setStatus(status, "No code like that exists.", false);
      try { input.select(); } catch (e) { /* ignore */ }
      return;
    }
    unlock();
    setStatus(status, "HOTTUBTONY unlocked.", true);
    input.value = "";
  }

  function bindForms() {
    var forms = w.document.querySelectorAll(".theme-code-form, #theme-code-form");
    forms.forEach(function (form) {
      if (form.getAttribute("data-theme-bound")) return;
      form.setAttribute("data-theme-bound", "1");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submitForm(form);
      });
      var btn = form.querySelector("#btn-theme-unlock, .btn-theme-unlock");
      if (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault();
          submitForm(form);
        });
      }
      var input = form.querySelector("#theme-code, .theme-code-input");
      if (input) {
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            submitForm(form);
          }
        });
      }
    });
    showBadge(sessionUnlocked);
  }

  function bind() {
    bindForms();
  }

  w.Theme = {
    CODE: CODE,
    matchCode: matchCode,
    unlock: unlock,
    isUnlocked: isUnlocked,
    showBadge: showBadge,
    bindForms: bindForms,
    bind: bind
  };
})(window);
