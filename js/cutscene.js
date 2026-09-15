/**
 * HOTTUBTONY cutscene preview — original canvas animation.
 * Timing: total wall clock ≤ 2000ms including fades (UX U4 / Legal).
 * Softlock prevention: auto-dismiss at end or 2.0s; Esc / P / tap early-end.
 * No on-screen character name (docs-only role label exists in README; never on canvas).
 */
(function () {
  "use strict";

  /** Max wall-clock duration for cutscene including fades (ms). */
  var CUTSCENE_MAX_MS = 2000;
  /** Fade-in duration (ms). */
  var FADE_IN_MS = 180;
  /** Fade-out duration (ms). */
  var FADE_OUT_MS = 220;
  /** Active animation window before fade-out begins (2000 - 180 - 220 = 1600). */
  var PLAY_MS = CUTSCENE_MAX_MS - FADE_IN_MS - FADE_OUT_MS;

  var overlay = null;
  var canvas = null;
  var ctx = null;
  var rafId = 0;
  var hardTimer = 0;
  var startTs = 0;
  var running = false;
  var reduceMotion = false;
  var returnFocusEl = null;
  var onDoneCb = null;
  var playing = false;

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) {
      return false;
    }
  }

  function ensureDom() {
    overlay = document.getElementById("cutscene");
    if (!overlay) return false;
    canvas = overlay.querySelector("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = 420;
      canvas.height = 280;
      canvas.setAttribute("aria-hidden", "true");
      var stage = overlay.querySelector(".cutscene-stage");
      if (stage) stage.appendChild(canvas);
      else overlay.appendChild(canvas);
    }
    ctx = canvas.getContext("2d");
    return !!ctx;
  }

  function drawFrame(t) {
    // t in [0, 1] over PLAY_MS — geometric leaf-circuit figure enters tub; no name text
    var w = canvas.width;
    var h = canvas.height;
    var peat = "#06140F";
    var mint = "#2FE6A4";
    var leaf = "#9DFF7A";
    var rose = "#FF8CAA";
    var cyan = "#78E6FF";
    var water = "#14465A";
    var rim = "#1E5A3E";
    var copper = "#B87333";

    ctx.fillStyle = peat;
    ctx.fillRect(0, 0, w, h);

    var tubCx = w * 0.55;
    var tubCy = h * 0.68;
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.ellipse(tubCx, tubCy, 110, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mint;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = water;
    ctx.beginPath();
    ctx.ellipse(tubCx, tubCy, 92, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = cyan;
    ctx.lineWidth = 2;
    [[-40, 0, 6], [-10, 8, 5], [30, -4, 7], [55, 6, 4]].forEach(function (b) {
      ctx.beginPath();
      ctx.arc(tubCx + b[0], tubCy + b[1], b[2], 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = rose;
    ctx.lineWidth = 2;
    for (var i = 0; i < 3; i++) {
      var sx = tubCx - 40 + i * 36;
      var sy = tubCy - 50 - Math.sin(t * Math.PI + i) * 6;
      ctx.beginPath();
      ctx.arc(sx, sy, 10, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }

    var startX = w * 0.12;
    var endX = tubCx - 20;
    var px = startX + (endX - startX) * Math.min(1, t * 1.15);
    var py = h * 0.42 - Math.sin(Math.min(1, t) * Math.PI) * 8;
    if (reduceMotion) {
      px = endX;
      py = h * 0.42;
    }

    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.moveTo(px, py - 22);
    ctx.lineTo(px + 16, py - 10);
    ctx.lineTo(px + 16, py + 10);
    ctx.lineTo(px, py + 22);
    ctx.lineTo(px - 16, py + 10);
    ctx.lineTo(px - 16, py - 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = mint;
    ctx.beginPath();
    ctx.moveTo(px, py - 9);
    ctx.lineTo(px + 7, py);
    ctx.lineTo(px, py + 9);
    ctx.lineTo(px - 7, py);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(px - 16, py - 4);
    ctx.lineTo(px - 30, py - 16);
    ctx.lineTo(px - 20, py + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 16, py - 4);
    ctx.lineTo(px + 30, py - 16);
    ctx.lineTo(px + 20, py + 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = copper;
    ctx.fillRect(px - 10, py + 18, 5, 14);
    ctx.fillRect(px + 5, py + 18, 5, 12 + (t > 0.7 ? 4 : 0));
    // Intentionally no fillText labels — UX H8 / Legal
  }

  function cleanupTimers() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (hardTimer) {
      clearTimeout(hardTimer);
      hardTimer = 0;
    }
  }

  function restoreFocus() {
    if (returnFocusEl && typeof returnFocusEl.focus === "function") {
      try {
        returnFocusEl.focus();
      } catch (e) { /* ignore */ }
    }
    returnFocusEl = null;
  }

  function dismiss() {
    if (!running) return;
    running = false;
    cleanupTimers();
    if (!overlay) {
      playing = false;
      var cb0 = onDoneCb;
      onDoneCb = null;
      if (cb0) cb0();
      return;
    }
    overlay.classList.add("is-fading");
    overlay.classList.remove("is-open");
    setTimeout(function () {
      overlay.classList.remove("is-fading");
      overlay.style.display = "none";
      overlay.setAttribute("aria-hidden", "true");
      overlay.removeAttribute("tabindex");
      restoreFocus();
      playing = false;
      var cb = onDoneCb;
      onDoneCb = null;
      if (cb) cb();
    }, FADE_OUT_MS);
  }

  function onKey(e) {
    if (!running) return;
    var k = e.key;
    if (k === "Escape" || k === "Esc" || k === "p" || k === "P") {
      e.preventDefault();
      e.stopPropagation();
      dismiss();
    }
  }

  function onPointer() {
    if (!running) return;
    dismiss();
  }

  function tick(now) {
    if (!running) return;
    var elapsed = now - startTs;
    var playT = Math.min(1, Math.max(0, (elapsed - FADE_IN_MS) / PLAY_MS));
    if (elapsed < FADE_IN_MS) playT = reduceMotion ? 1 : 0;
    drawFrame(playT);
    if (elapsed >= CUTSCENE_MAX_MS - FADE_OUT_MS) {
      dismiss();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  /**
   * Play cutscene. Guaranteed dismiss by CUTSCENE_MAX_MS (2000ms) hard timer.
   * Esc / P / tap also early-dismiss. Pause-safe: no softlock if hung.
   */
  function play(fromEl, opts) {
    if (!ensureDom()) return;
    cleanupTimers();
    reduceMotion = prefersReducedMotion();
    returnFocusEl = fromEl || document.activeElement;
    onDoneCb = opts && typeof opts.onDone === "function" ? opts.onDone : null;
    playing = true;
    running = true;
    startTs = performance.now();

    overlay.style.display = "flex";
    overlay.classList.remove("is-fading");
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    overlay.setAttribute("tabindex", "-1");
    try {
      overlay.focus();
    } catch (e) { /* ignore */ }

    drawFrame(reduceMotion ? 1 : 0);
    rafId = requestAnimationFrame(tick);

    // Hard wall-clock dismiss ≤2s — even if requestAnimationFrame stalls
    hardTimer = setTimeout(function () {
      dismiss();
    }, CUTSCENE_MAX_MS);
  }

  function bind() {
    if (!ensureDom()) return;
    overlay.addEventListener("keydown", onKey);
    overlay.addEventListener("click", onPointer);
    overlay.addEventListener("touchend", function (e) {
      e.preventDefault();
      onPointer();
    }, { passive: false });
    document.addEventListener("keydown", function (e) {
      if (!running) return;
      if (e.key === "Escape" || e.key === "Esc" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        e.stopPropagation();
        dismiss();
      }
    }, true);
  }

  function isPlaying() {
    return playing;
  }

  window.ThemeCutscene = {
    play: play,
    dismiss: dismiss,
    isPlaying: isPlaying,
    MAX_MS: CUTSCENE_MAX_MS
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
