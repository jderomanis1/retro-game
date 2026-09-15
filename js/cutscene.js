/**
 * HOTTUBTONY cutscene — punchy CRT arcade canvas animation.
 * Timing: total wall clock ≤ 2000ms including fades (UX U4 / Legal).
 * Softlock prevention: auto-dismiss at end or 2.0s; Esc / P / tap early-end.
 * No on-screen character name (docs-only role label exists in README; never on canvas).
 *
 * Integrate: <script src="cutscene.js"></script>
 * Call: ThemeCutscene.play(focusEl, { onDone }) or HotTubCutscene.play(...);
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

  /* —— 3-phase beat within PLAY_MS —— */
  var PHASE_APPROACH_END = 0.40; /* approach → tub rim */
  var PHASE_SPLASH_END = 0.62;   /* step-in splash + power star */
  /* 0.62 → 1.0: settle + steam burst */

  var PAL = {
    peat: "#06140F",
    canopy: "#0C2418",
    tunnel: "#04110C",
    mint: "#2FE6A4",
    leaf: "#9DFF7A",
    rose: "#FF8CAA",
    cyan: "#78E6FF",
    water: "#14465A",
    waterDeep: "#0A2E3C",
    rim: "#1E5A3E",
    copper: "#B87333",
    dew: "#E7FFF4",
    sap: "#F4D35E"
  };

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

  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  function easeOutCubic(t) {
    var u = 1 - t;
    return 1 - u * u * u;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function glowColor(hex, a) {
    var c = hexToRgb(hex);
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + a + ")";
  }

  /* —— Stage: peat field + copper frame + vignette + scanlines + phosphor —— */
  function drawStage(w, h) {
    ctx.fillStyle = PAL.peat;
    ctx.fillRect(0, 0, w, h);

    /* subtle canopy gradient floor */
    var floor = ctx.createLinearGradient(0, h * 0.45, 0, h);
    floor.addColorStop(0, "rgba(12,36,24,0)");
    floor.addColorStop(1, "rgba(4,17,12,0.85)");
    ctx.fillStyle = floor;
    ctx.fillRect(0, 0, w, h);

    /* copper arcade frame */
    ctx.strokeStyle = PAL.copper;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = glowColor(PAL.mint, 0.35);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(14, 14, w - 28, h - 28);
  }

  function drawVignette(w, h) {
    var g = ctx.createRadialGradient(w * 0.5, h * 0.48, h * 0.2, w * 0.5, h * 0.5, h * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.65, "rgba(0,0,0,0.15)");
    g.addColorStop(1, "rgba(0,0,0,0.62)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawScanlines(w, h) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#000";
    for (var y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.restore();
  }

  function phosphorBloom(x, y, r, hex, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, glowColor(hex, a));
    g.addColorStop(0.45, glowColor(hex, a * 0.35));
    g.addColorStop(1, glowColor(hex, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* —— Hot tub: clearer oval + rim + water + bubbles + steam —— */
  function drawTub(tubCx, tubCy, splash, steamAmt, bubblePulse) {
    /* outer copper rim shadow */
    ctx.fillStyle = glowColor(PAL.copper, 0.25);
    ctx.beginPath();
    ctx.ellipse(tubCx, tubCy + 4, 128, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    /* rim */
    ctx.fillStyle = PAL.rim;
    ctx.beginPath();
    ctx.ellipse(tubCx, tubCy, 118, 44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.copper;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = glowColor(PAL.mint, 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(tubCx, tubCy, 112, 40, 0, 0, Math.PI * 2);
    ctx.stroke();

    /* water */
    var waterG = ctx.createRadialGradient(tubCx, tubCy - 6, 8, tubCx, tubCy, 90);
    waterG.addColorStop(0, "#1A6A7E");
    waterG.addColorStop(0.55, PAL.water);
    waterG.addColorStop(1, PAL.waterDeep);
    ctx.fillStyle = waterG;
    ctx.beginPath();
    ctx.ellipse(tubCx, tubCy, 98, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    /* cyan bubbles */
    var bubbles = [
      [-48, -2, 5], [-22, 8, 7], [8, -6, 4], [38, 4, 6], [62, -2, 5],
      [-8, 12, 3], [22, 10, 4], [-60, 6, 4]
    ];
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      var br = b[2] + Math.sin(bubblePulse * Math.PI * 2 + i * 1.3) * 1.2;
      var by = tubCy + b[1] - splash * 4 - Math.sin(bubblePulse * Math.PI + i) * 2;
      phosphorBloom(tubCx + b[0], by, br * 2.2, PAL.cyan, 0.2 + splash * 0.25);
      ctx.strokeStyle = PAL.cyan;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(tubCx + b[0], by, Math.max(1.5, br), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = glowColor(PAL.cyan, 0.15);
      ctx.fill();
    }

    /* splash rings on step-in */
    if (splash > 0.05) {
      ctx.strokeStyle = glowColor(PAL.cyan, 0.55 * splash);
      ctx.lineWidth = 2 + splash * 2;
      ctx.beginPath();
      ctx.ellipse(tubCx, tubCy, 70 + splash * 40, 18 + splash * 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = glowColor(PAL.dew, 0.35 * splash);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(tubCx, tubCy - 4, 50 + splash * 28, 12 + splash * 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* rose steam arcs */
    var steamN = 5;
    for (var s = 0; s < steamN; s++) {
      var sx = tubCx - 55 + s * 28;
      var baseY = tubCy - 42 - steamAmt * (18 + s * 3);
      var wobble = Math.sin(steamAmt * Math.PI * 2 + s * 0.9) * 6;
      ctx.strokeStyle = glowColor(PAL.rose, 0.25 + steamAmt * 0.55);
      ctx.lineWidth = 2 + steamAmt * 1.5;
      ctx.beginPath();
      ctx.arc(sx + wobble, baseY, 12 + steamAmt * 6, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
      if (steamAmt > 0.4) {
        phosphorBloom(sx + wobble, baseY - 8, 18 + steamAmt * 10, PAL.rose, 0.12 * steamAmt);
      }
    }
  }

  /* —— Power star flash (splash beat) —— */
  function drawPowerStar(cx, cy, scale, alpha) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    phosphorBloom(0, 0, 36, PAL.sap, 0.55);
    phosphorBloom(0, 0, 22, PAL.cyan, 0.45);
    ctx.fillStyle = PAL.sap;
    ctx.beginPath();
    var pts = 8;
    for (var i = 0; i < pts; i++) {
      var ang = (i / pts) * Math.PI * 2 - Math.PI / 2;
      var r = i % 2 === 0 ? 18 : 7;
      var x = Math.cos(ang) * r;
      var y = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PAL.dew;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Geometric leaf-circuit figure (hex/leaf body + circuit eye + limb arcs).
   * Original Dewnode cousin — NOT human, NOT pac/ghost/mascot silhouette.
   */
  function drawFigure(px, py, pose, scale) {
    scale = scale || 1;
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(scale, scale);

    var bodyLean = pose.lean || 0;
    var armL = pose.armL || -0.6;
    var armR = pose.armR || 0.4;
    var legL = pose.legL || 0.15;
    var legR = pose.legR || -0.1;
    var squat = pose.squat || 0;
    var eyeFlash = pose.eyeFlash || 0;

    ctx.translate(bodyLean * 6, squat * 10);

    /* phosphor body bloom */
    phosphorBloom(0, 0, 34, PAL.leaf, 0.22);
    phosphorBloom(0, -4, 20, PAL.mint, 0.18);

    /* hex / leaf body */
    ctx.fillStyle = PAL.leaf;
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(20, -12);
    ctx.lineTo(20, 12);
    ctx.lineTo(0, 28);
    ctx.lineTo(-20, 12);
    ctx.lineTo(-20, -12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = glowColor(PAL.mint, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();

    /* circuit eye (diamond core) */
    ctx.fillStyle = PAL.mint;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    if (eyeFlash > 0) {
      phosphorBloom(0, 0, 16, PAL.cyan, 0.35 * eyeFlash);
      ctx.fillStyle = glowColor(PAL.dew, 0.5 + eyeFlash * 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = PAL.peat;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    /* circuit traces on body */
    ctx.strokeStyle = glowColor(PAL.mint, 0.55);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.lineTo(-14, -4);
    ctx.lineTo(-8, 8);
    ctx.moveTo(8, -18);
    ctx.lineTo(14, -4);
    ctx.lineTo(8, 8);
    ctx.stroke();

    /* limb arcs — leaf fins / circuit stubs (not human arms) */
    function limb(side, ang, len, thick) {
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = PAL.mint;
      ctx.beginPath();
      ctx.moveTo(side * 18, -2);
      ctx.quadraticCurveTo(side * (18 + len * 0.55), -thick - 4, side * (18 + len), -2);
      ctx.quadraticCurveTo(side * (18 + len * 0.55), thick + 2, side * 18, 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = glowColor(PAL.cyan, 0.4);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    limb(-1, armL, 22, 6);
    limb(1, armR, 22, 6);

    /* copper circuit legs */
    ctx.fillStyle = PAL.copper;
    var legLen = 16 + squat * -4;
    ctx.save();
    ctx.translate(-8, 24);
    ctx.rotate(legL);
    ctx.fillRect(-3, 0, 6, legLen);
    ctx.fillStyle = glowColor(PAL.mint, 0.5);
    ctx.fillRect(-2, legLen - 3, 4, 3);
    ctx.restore();
    ctx.save();
    ctx.fillStyle = PAL.copper;
    ctx.translate(8, 24);
    ctx.rotate(legR);
    ctx.fillRect(-3, 0, 6, legLen + 2);
    ctx.fillStyle = glowColor(PAL.mint, 0.5);
    ctx.fillRect(-2, legLen - 1, 4, 3);
    ctx.restore();

    ctx.restore();
  }

  function poseForPhase(phase, localT) {
    /* localT in [0,1] within phase */
    if (phase === 0) {
      /* approach: snappy walk lean + arm swing */
      var swing = Math.sin(localT * Math.PI * 3) * 0.35;
      return {
        lean: Math.sin(localT * Math.PI * 2) * 0.35,
        armL: -0.75 + swing,
        armR: 0.55 - swing,
        legL: 0.35 * Math.sin(localT * Math.PI * 3),
        legR: -0.35 * Math.sin(localT * Math.PI * 3),
        squat: 0,
        eyeFlash: 0
      };
    }
    if (phase === 1) {
      /* step-in: one punchy hop into tub */
      var hop = Math.sin(localT * Math.PI);
      return {
        lean: lerp(0.2, -0.15, localT),
        armL: lerp(-0.4, -1.1, easeOutCubic(localT)),
        armR: lerp(0.5, 1.0, easeOutCubic(localT)),
        legL: lerp(0.2, 0.55, localT),
        legR: lerp(-0.1, -0.4, localT),
        squat: hop * 0.85,
        eyeFlash: localT > 0.45 ? (localT - 0.45) / 0.55 : 0
      };
    }
    /* settle + steam: relaxed dip, eye glow */
    var settle = easeOutCubic(localT);
    return {
      lean: lerp(-0.1, 0.05, settle),
      armL: lerp(-1.0, -0.35, settle),
      armR: lerp(0.95, 0.45, settle),
      legL: lerp(0.4, 0.05, settle),
      legR: lerp(-0.35, 0.05, settle),
      squat: lerp(0.7, 0.35, settle),
      eyeFlash: 0.55 + Math.sin(localT * Math.PI * 2) * 0.35
    };
  }

  function beatState(t) {
    /* t in [0,1] over PLAY_MS */
    var phase, localT, px, py, splash, steam, starA, starS, scale;

    if (t <= PHASE_APPROACH_END) {
      phase = 0;
      localT = t / PHASE_APPROACH_END;
      var a = easeInOut(localT);
      px = lerp(52, 188, a);
      py = lerp(118, 132, a) - Math.sin(a * Math.PI) * 10;
      splash = 0;
      steam = 0.08 + localT * 0.12;
      starA = 0;
      starS = 0;
      scale = 1.15;
    } else if (t <= PHASE_SPLASH_END) {
      phase = 1;
      localT = (t - PHASE_APPROACH_END) / (PHASE_SPLASH_END - PHASE_APPROACH_END);
      var s = easeOutCubic(localT);
      px = lerp(188, 231, s);
      py = lerp(132, 168, s) - Math.sin(localT * Math.PI) * 28;
      splash = Math.sin(localT * Math.PI);
      steam = 0.2 + splash * 0.35;
      /* power star peaks mid-splash */
      starA = Math.sin(localT * Math.PI);
      starS = 0.7 + starA * 0.9;
      scale = 1.2;
    } else {
      phase = 2;
      localT = (t - PHASE_SPLASH_END) / (1 - PHASE_SPLASH_END);
      var e = easeOutCubic(localT);
      px = lerp(231, 231, e);
      py = lerp(168, 176, e);
      splash = Math.max(0, 1 - localT * 2.2) * 0.35;
      steam = 0.45 + e * 0.55;
      starA = Math.max(0, 1 - localT * 2.5) * 0.4;
      starS = 0.5;
      scale = 1.12;
    }

    return {
      phase: phase,
      localT: localT,
      px: px,
      py: py,
      splash: splash,
      steam: steam,
      starA: starA,
      starS: starS,
      scale: scale,
      pose: poseForPhase(phase, localT)
    };
  }

  function drawFrame(t) {
    var w = canvas.width;
    var h = canvas.height;
    var tubCx = w * 0.55;
    var tubCy = h * 0.68;

    drawStage(w, h);

    if (reduceMotion) {
      /* 1–2 static frames: settle pose + implied power beat; short fade handled by overlay */
      drawTub(tubCx, tubCy, 0.15, 0.85, 0.5);
      drawPowerStar(tubCx, tubCy - 36, 0.85, 0.55);
      drawFigure(tubCx, tubCy - 8, {
        lean: 0.05,
        armL: -0.35,
        armR: 0.45,
        legL: 0.05,
        legR: 0.05,
        squat: 0.35,
        eyeFlash: 0.7
      }, 1.15);
      drawVignette(w, h);
      drawScanlines(w, h);
      return;
    }

    var beat = beatState(clamp01(t));
    drawTub(tubCx, tubCy, beat.splash, beat.steam, t);
    if (beat.starA > 0.02) {
      drawPowerStar(tubCx, tubCy - 28 - beat.splash * 10, beat.starS, beat.starA);
    }
    drawFigure(beat.px, beat.py, beat.pose, beat.scale);
    drawVignette(w, h);
    drawScanlines(w, h);
    /* Intentionally no fillText labels — UX H8 / Legal */
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
    function finish() {
      playing = false;
      var cb = onDoneCb;
      onDoneCb = null;
      if (cb) cb();
    }
    if (!overlay) {
      finish();
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
      finish();
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

    /* Hard wall-clock dismiss ≤2s — even if requestAnimationFrame stalls */
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

  var api = {
    play: play,
    dismiss: dismiss,
    isPlaying: isPlaying,
    MAX_MS: CUTSCENE_MAX_MS,
    FADE_IN_MS: FADE_IN_MS,
    FADE_OUT_MS: FADE_OUT_MS,
    PLAY_MS: PLAY_MS
  };

  window.HotTubCutscene = api;
  window.ThemeCutscene = api; /* U8 Theme.afterUnlockIntro uses ThemeCutscene.play */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
