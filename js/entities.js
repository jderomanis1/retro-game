/* Dewgrid R8k — collect/power/collide + arcade-tight turn buffer. */
(function (w) {
  var cells = null, level = null, player = null, enemies = [];
  var score = 0, lives = 3, wave = 1, power = 0, lastEvent = null;
  var POWER_TICKS = 180;
  var COLORS = { Seek: "#FF5A73", Weave: "#5EC8FF", Nest: "#C084FC", Dart: "#FFCC4D" };
  function fx(n) { var s = w.Sfx; if (s && s[n]) s[n](); }
  function createPlayer() {
    return { x: 10, y: 23, dx: 0, dy: 0, ndx: 0, ndy: 0 };
  }
  function spawnEnemies() {
    var hints = w.Maze.getSpawnHints().nests;
    var homes = hints.length >= 4 ? hints.slice(0, 4) : [
      { x: 12, y: 7 }, { x: 13, y: 7 }, { x: 14, y: 7 }, { x: 15, y: 7 }
    ];
    var ids = ["Seek", "Weave", "Nest", "Dart"], dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    enemies = ids.map(function (id, i) {
      var h = homes[i];
      return { id: id, x: h.x, y: h.y, dx: dirs[i][0], dy: dirs[i][1],
        color: COLORS[id], home: { x: h.x, y: h.y }, t: 0, zig: 1 };
    });
  }
  function updateHud() {
    if (!w.document || !w.document.getElementById) return;
    var d = w.document, m = { score: score, lives: lives, wave: wave, "lives-left": lives }, k, el;
    for (k in m) { el = d.getElementById(k); if (el) el.textContent = String(m[k]); }
  }
  function reset(lvl, opts) {
    level = lvl; cells = lvl.cells;
    if (!(opts && opts.preserveProgress)) { score = 0; lives = 3; wave = 1; }
    power = 0; lastEvent = null;
    player = createPlayer();
    spawnEnemies();
    w.__sparkCount = level.sparks.length;
    updateHud();
  }
  function collect() {
    if (!level || !player) return;
    var sparks = level.sparks, i, s;
    for (i = sparks.length - 1; i >= 0; i--) {
      s = sparks[i];
      if (s.x !== player.x || s.y !== player.y) continue;
      if (s.kind === "sun") { score += 50; power = POWER_TICKS; fx("sun"); }
      else { score += 10; fx("sap"); }
      sparks.splice(i, 1);
    }
    w.__sparkCount = sparks.length;
    if (!sparks.some(function (x) { return x.kind === "sap"; })) {
      lastEvent = "levelup"; fx("wave");
    }
    updateHud();
  }
  function setIntent(dx, dy) {
    if (!player) return;
    player.ndx = dx; player.ndy = dy;
  }
  function tryPlayerMove() {
    if (!player || !cells) return;
    var M = w.Maze;
    var wx = player.ndx, wy = player.ndy;
    if ((wx || wy) && M.canWalk(cells, player.x + wx, player.y + wy)) {
      player.dx = wx; player.dy = wy;
    }
    if (!(player.dx || player.dy)) return;
    if (M.canWalk(cells, player.x + player.dx, player.y + player.dy)) {
      player.x = M.wrapX(player.x + player.dx);
      player.y = player.y + player.dy;
      return;
    }
    if ((wx || wy) && M.canWalk(cells, player.x + wx, player.y + wy)) {
      player.dx = wx; player.dy = wy;
      player.x = M.wrapX(player.x + player.dx);
      player.y = player.y + player.dy;
    } else {
      /* Stop on wall; keep ndx/ndy so a pending turn still applies next tick. */
      player.dx = 0;
      player.dy = 0;
    }
  }
  function applyCollision() {
    if (!player) return null;
    var i, e;
    for (i = 0; i < enemies.length; i++) {
      e = enemies[i];
      if (e.x !== player.x || e.y !== player.y) continue;
      if (power > 0) {
        score += 200;
        e.x = e.home.x; e.y = e.home.y;
        e.dx = 0; e.dy = 0;
        updateHud();
        lastEvent = "ate"; fx("eat");
      } else {
        lives--;
        updateHud();
        lastEvent = lives > 0 ? "lifelost" : "gameover";
        fx("hit");
        return lastEvent;
      }
    }
    return lastEvent;
  }
  function syncIntentFromInput() {
    var I = w.Input;
    if (!I || !player) return;
    var intent = I.peek ? I.peek() : I.getIntent();
    if (!(intent.dx || intent.dy)) return;
    /* Same-as-travel intent must not wipe a pending perpendicular buffer. */
    var pendingTurn = (player.ndx || player.ndy) &&
      (player.ndx !== player.dx || player.ndy !== player.dy);
    var sameTravel = intent.dx === player.dx && intent.dy === player.dy;
    if (pendingTurn && sameTravel) return;
    player.ndx = intent.dx;
    player.ndy = intent.dy;
  }
  function step() {
    if (!player) return;
    syncIntentFromInput();
    tryPlayerMove();
    collect();
    if (lastEvent === "levelup") return;
    if (power > 0) power--;
    var ctx = { cells: cells, player: player, powered: power > 0 };
    if (w.AI) enemies.forEach(function (e) { w.AI.stepEnemy(e, ctx); });
    applyCollision();
  }
  function clearLastEvent() {
    var e = lastEvent; lastEvent = null; return e;
  }
  function getLastEvent() { return lastEvent; }
  function setPower(n) { power = n | 0; }
  function getEnemies() { return enemies; }
  function getPlayer() { return player; }
  function getLevel() { return level; }
  function getScore() { return score; }
  function getLives() { return lives; }
  function getWave() { return wave; }
  function bumpWave() { wave++; }
  function isPowered() { return power > 0; }
  function getPower() { return power; }
  function getState() {
    return { player: player, level: level, enemies: enemies, cells: cells };
  }
  w.Entities = {
    createPlayer: createPlayer, reset: reset, setIntent: setIntent,
    tryPlayerMove: tryPlayerMove, step: step, collect: collect,
    applyCollision: applyCollision, getLastEvent: getLastEvent,
    clearLastEvent: clearLastEvent, getPlayer: getPlayer, getLevel: getLevel,
    getScore: getScore, getLives: getLives, getWave: getWave, bumpWave: bumpWave,
    isPowered: isPowered, getPower: getPower, setPower: setPower,
    getEnemies: getEnemies, getState: getState
  };
})(window);
