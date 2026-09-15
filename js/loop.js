/* Dewgrid R8j — rAF; ambient + stop on levelup/lifelost/gameover. */
(function (w) {
  var running = false;
  var animId = 0;
  var lastTs = 0;
  var acc = 0;

  function stepMs() {
    var wave = (w.Entities && w.Entities.getWave) ? w.Entities.getWave() : 1;
    return Math.max(70, 112 - (wave - 1) * 8);
  }

  function redraw() {
    var E = w.Entities;
    var R = w.Render;
    if (!E || !R) return;
    var level = E.getLevel();
    var player = E.getPlayer();
    if (!level) return;
    if (R.drawFrame) R.drawFrame(level, player);
    else {
      R.drawOnce(level);
      if (R.drawPlayer && player) R.drawPlayer(player);
    }
  }

  function handleEvent(ev) {
    if (ev !== "lifelost" && ev !== "gameover" && ev !== "levelup") return false;
    stop();
    if (ev === "gameover" && w.document) {
      var fs = w.document.getElementById("final-score");
      if (fs) fs.textContent = String(w.Entities.getScore());
      if (w.Scores) w.Scores.refresh();
    }
    if (ev === "levelup" && w.document) {
      var nw = w.document.getElementById("next-wave");
      if (nw) nw.textContent = String(w.Entities.getWave() + 1);
    }
    if (w.Screens) w.Screens.show(ev);
    return true;
  }

  function frame(ts) {
    if (!running) return;
    animId = requestAnimationFrame(frame);
    var S = w.Screens;
    if (!S || S.getScreen() !== "game" || S.isPaused()) {
      lastTs = ts;
      return;
    }
    if (!lastTs) lastTs = ts;
    acc += ts - lastTs;
    lastTs = ts;
    var STEP = stepMs();
    var stepped = false;
    while (acc >= STEP) {
      acc -= STEP;
      w.Entities.step();
      stepped = true;
      if (handleEvent(w.Entities.clearLastEvent())) return;
    }
    if (stepped) redraw();
  }

  function start() {
    if (running) return;
    running = true;
    lastTs = 0;
    acc = 0;
    redraw();
    if (w.Sfx) w.Sfx.startAmbient();
    animId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (animId) cancelAnimationFrame(animId);
    animId = 0;
    lastTs = 0;
    acc = 0;
    if (w.Sfx) w.Sfx.stopAmbient();
  }

  function isRunning() { return running; }

  function isFrozen() {
    return !!(w.Screens && w.Screens.isPaused && w.Screens.isPaused());
  }

  w.Loop = { start: start, stop: stop, isRunning: isRunning, isFrozen: isFrozen };
})(window);
