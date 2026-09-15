/* Dewgrid R8a — screen router. No game loop. */
(function (w) {
  var SCREEN_IDS = [
    "attract", "title", "howto", "scores", "game",
    "levelup", "lifelost", "gameover", "pause"
  ];

  var current = "attract";
  var paused = false;

  var FOCUS = {
    attract: '[data-go="title"].primary, [data-go="title"]',
    title: '[data-start].primary, [data-start]',
    howto: '[data-go="game"].primary, [data-go="game"]',
    scores: '[data-go="title"].primary, [data-go="title"]',
    game: "#btn-pause",
    levelup: "#btn-next-wave",
    lifelost: "#btn-retry",
    gameover: "#hs-name",
    pause: "#btn-resume"
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function setInert(el, on) {
    if (!el) return;
    if (on) {
      el.setAttribute("inert", "");
      el.setAttribute("aria-hidden", "true");
    } else {
      el.removeAttribute("inert");
      el.removeAttribute("aria-hidden");
    }
  }

  function deactivateScreens() {
    document.querySelectorAll(".screen").forEach(function (el) {
      el.classList.remove("active");
      el.hidden = true;
      setInert(el, true);
    });
  }

  function activateScreen(el) {
    el.hidden = false;
    el.classList.add("active");
    setInert(el, false);
  }

  function closePauseOverlay() {
    if (w.Sfx) w.Sfx.setPausedGate(false);
    var pauseEl = $("#pause");
    if (!pauseEl) return;
    pauseEl.classList.remove("active");
    pauseEl.setAttribute("aria-hidden", "true");
    setInert($("#game"), false);
    paused = false;
  }

  function openPauseOverlay() {
    var pauseEl = $("#pause");
    var gameEl = $("#game");
    if (!pauseEl || !gameEl) return;
    pauseEl.classList.add("active");
    pauseEl.setAttribute("aria-hidden", "false");
    setInert(gameEl, true);
    if (w.Sfx) w.Sfx.setPausedGate(true);
    gameEl.hidden = false;
    gameEl.classList.add("active");
    paused = true;
  }

  function focusDefault(id) {
    var sel = FOCUS[id];
    if (!sel) return;
    var root = id === "pause" ? $("#pause") : document.getElementById(id);
    var target = root ? $(sel, root) : $(sel);
    if (target && typeof target.focus === "function") target.focus();
  }

  function show(id) {
    if (SCREEN_IDS.indexOf(id) < 0) return;

    if (id === "pause") {
      if (current !== "game" && !paused) return;
      openPauseOverlay();
      requestAnimationFrame(function () { focusDefault("pause"); });
      return;
    }

    closePauseOverlay();
    deactivateScreens();
    var el = document.getElementById(id);
    if (!el) return;
    activateScreen(el);
    current = id;
    requestAnimationFrame(function () { focusDefault(id); });
  }

  function openPause() {
    if (current !== "game") return;
    show("pause");
  }

  function closePause() {
    if (!paused) return;
    closePauseOverlay();
    current = "game";
    var gameEl = $("#game");
    if (gameEl) {
      gameEl.hidden = false;
      gameEl.classList.add("active");
      setInert(gameEl, false);
    }
    requestAnimationFrame(function () { focusDefault("game"); });
  }

  w.Screens = {
    SCREEN_IDS: SCREEN_IDS,
    show: show,
    openPause: openPause,
    closePause: closePause,
    isPaused: function () { return paused; },
    getScreen: function () { return current; }
  };
})(window);
