/* Dewgrid R8f — Seek/Weave/Nest/Dart steppers. */
(function (w) {
  function dirsFrom(cells, e) {
    var M = w.Maze;
    return [[0, -1], [0, 1], [-1, 0], [1, 0]]
      .filter(function (d) { return M.canWalk(cells, e.x + d[0], e.y + d[1]); })
      .map(function (d) { return { dx: d[0], dy: d[1] }; });
  }

  function pickFlee(opts, e, player) {
    var M = w.Maze, best = -1, choice = opts[0], i, o, d;
    for (i = 0; i < opts.length; i++) {
      o = opts[i];
      d = Math.abs(M.wrapX(e.x + o.dx) - player.x) + Math.abs(e.y + o.dy - player.y);
      if (d > best) { best = d; choice = o; }
    }
    return choice;
  }

  function pickChase(opts, e, tx, ty) {
    var M = w.Maze, rev = { dx: -e.dx, dy: -e.dy };
    var best = 1e9, choice = opts[0], i, o, d;
    for (i = 0; i < opts.length; i++) {
      o = opts[i];
      if (o.dx === rev.dx && o.dy === rev.dy && opts.length > 1) continue;
      d = Math.abs(M.wrapX(e.x + o.dx) - tx) + Math.abs(e.y + o.dy - ty);
      if (d < best) { best = d; choice = o; }
    }
    return choice;
  }

  function stepEnemy(e, ctx) {
    var cells = ctx.cells, player = ctx.player, powered = ctx.powered;
    var M = w.Maze, opts, choice, turns, pool, fwd, rev, i;
    e.t++;
    opts = dirsFrom(cells, e);
    if (!opts.length) return;
    if (powered) choice = pickFlee(opts, e, player);
    else if (e.id === "Seek") choice = pickChase(opts, e, player.x, player.y);
    else if (e.id === "Weave") {
      turns = opts.filter(function (o) { return o.dx !== e.dx || o.dy !== e.dy; });
      pool = turns.length ? turns : opts;
      choice = pool[Math.abs(e.t + e.zig) % pool.length];
      if (e.t % 7 === 0) e.zig = -e.zig;
    } else if (e.id === "Nest") {
      choice = (e.t % 40 < 22)
        ? pickChase(opts, e, e.home.x, e.home.y)
        : pickChase(opts, e, player.x, player.y);
    } else {
      /* Dart — deterministic mid-turn for stable smoke */
      fwd = null;
      for (i = 0; i < opts.length; i++) {
        if (opts[i].dx === e.dx && opts[i].dy === e.dy) { fwd = opts[i]; break; }
      }
      if (fwd && (e.t * 17) % 100 > 12) choice = fwd;
      else {
        rev = { dx: -e.dx, dy: -e.dy };
        pool = opts.filter(function (o) {
          return !(o.dx === rev.dx && o.dy === rev.dy);
        });
        pool = pool.length ? pool : opts;
        choice = pool[Math.abs(e.t * 31) % pool.length];
      }
    }
    e.dx = choice.dx;
    e.dy = choice.dy;
    if (M.canWalk(cells, e.x + e.dx, e.y + e.dy)) {
      e.x = M.wrapX(e.x + e.dx);
      e.y += e.dy;
    }
  }

  w.AI = {
    dirsFrom: dirsFrom, pickFlee: pickFlee, pickChase: pickChase, stepEnemy: stepEnemy
  };
})(window);
