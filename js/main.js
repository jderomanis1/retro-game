/* Dewgrid R8h — boot + soft/hard + next-wave. */
(function () {
  var S = window.Screens;
  if (!S) return;

  window.Input.bind();
  if (window.Theme && window.Theme.bind) window.Theme.bind();
  if (window.Scores) {
    window.Scores.bind();
    window.Scores.refresh();
  }

  function startGameSession(opts) {
    var soft = opts && opts.soft;
    var level = soft && window.Entities.getLevel()
      ? window.Entities.getLevel()
      : window.Maze.buildLevel();
    window.Render.init(document.getElementById("maze"));
    window.Entities.reset(level, { preserveProgress: !!soft });
    window.__sparkCount = level.sparks.length;
    window.Loop.start();
  }

  function goTo(id) {
    if (id !== "game") window.Loop.stop();
    S.show(id);
    if (id === "game") startGameSession();
    if ((id === "scores" || id === "title") && window.Scores) window.Scores.refresh();
  }

  S.show("attract");
  if (S.getScreen() === "game") startGameSession();

  document.getElementById("app").addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-go]");
    if (!btn) return;
    if (btn.id === "btn-retry" || btn.id === "btn-next-wave") return;
    ev.preventDefault();
    var go = btn.getAttribute("data-go");
    if (!go) return;
    if (S.isPaused() && go === "title") S.closePause();
    goTo(go);
  });

  var retryBtn = document.getElementById("btn-retry");
  if (retryBtn) {
    retryBtn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      window.Loop.stop();
      S.show("game");
      startGameSession({ soft: true });
    });
  }

  var nextWaveBtn = document.getElementById("btn-next-wave");
  if (nextWaveBtn) {
    nextWaveBtn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      window.Entities.bumpWave();
      var newLevel = window.Maze.buildLevel();
      window.Entities.reset(newLevel, { preserveProgress: true });
      window.__sparkCount = newLevel.sparks.length;
      var el = document.getElementById("wave");
      if (el) el.textContent = String(window.Entities.getWave());
      el = document.getElementById("next-wave");
      if (el) el.textContent = String(window.Entities.getWave() + 1);
      S.show("game");
      window.Loop.start();
    });
  }

  var pauseBtn = document.getElementById("btn-pause");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", function () {
      S.openPause();
    });
  }

  var resumeBtn = document.getElementById("btn-resume");
  if (resumeBtn) {
    resumeBtn.addEventListener("click", function () {
      S.closePause();
    });
  }

  document.addEventListener("keydown", function (ev) {
    var key = ev.key;
    var screen = S.getScreen();
    var paused = S.isPaused();

    if (screen === "attract" && (key === "Enter" || key === " ")) {
      var tgt = ev.target;
      if (tgt && (tgt.id === "theme-code" || tgt.id === "theme-code-title" ||
          (tgt.classList && tgt.classList.contains("theme-code-input")) ||
          (tgt.closest && tgt.closest(".theme-code-form")))) {
        return;
      }
      ev.preventDefault();
      goTo("title");
      return;
    }

    if (window.ThemeCutscene && window.ThemeCutscene.isPlaying &&
        window.ThemeCutscene.isPlaying()) {
      return;
    }

    if (key === "p" || key === "P" || key === "Escape") {
      if (paused) {
        ev.preventDefault();
        S.closePause();
      } else if (screen === "game") {
        ev.preventDefault();
        S.openPause();
      }
    }
  });
})();
