(() => {
  const HS_KEY = "dewgrid-hs";
  const TILE = 16;
  const COLS = 28;
  const SCREEN_IDS = [
    "attract", "title", "howto", "game", "levelup", "lifelost", "gameover", "pause"
  ];

  /* Greenhouse-circuit planting beds — sparse dew nodes, empty traces. */
  const LAYOUT = [
    "############################",
    "#+++..##............##...+.#",
    "#+++..##.##########.##.#.#.#",
    "#.#...##............##.#*#.#",
    "#.#.####.########.####.#.#.#",
    "#.#......................#.#",
    "#.####.##...####...##.####.#",
    "#......##...NNNN...##......#",
    "####.#.####......####.#.####",
    "T....#..............#......T",
    "####.#.####......####.#.####",
    "#......##...####...##......#",
    "#.####.##..........##.#++#.#",
    "#.#....##.########.##.#++#.#",
    "#.#.##................##.#.#",
    "#.#.##.##...##...##.*##.#..#",
    "#......##...##...##......#.#",
    "#++##..######.######..##++.#",
    "#++##.................##++.#",
    "#......##........##........#",
    "#.####.##...##...##.######.#",
    "#.*....##...##...##........#",
    "#.####.##########.########.#",
    "#............##............#",
    "#..+++.......##.......+....#",
    "############################",
  ].map((r) => (r.length >= COLS ? r.slice(0, COLS) : r.padEnd(COLS, "#")));

  const H = LAYOUT.length;
  const canvas = document.getElementById("maze");
  const ctx = canvas.getContext("2d");
  canvas.width = COLS * TILE;
  canvas.height = H * TILE;

  let screen = "attract";
  let score = 0;
  let lives = 3;
  let wave = 1;
  let paused = false;
  let power = 0;
  let running = false;
  let animId = 0;
  let tickAcc = 0;
  let lastTs = 0;
  let player;
  let enemies;
  let sparks;
  let cells;
  let baseStep = 112;

  const C = {
    peat: "#06140F",
    canopy: "#0C2418",
    tunnel: "#04110C",
    wallMoss: "#0A2A1C",
    wallTrace: "#1E5A3E",
    copper: "#B87333",
    circuit: "#2FE6A4",
    sap: "#F4D35E",
    sun: "#FF8A3D",
    leaf: "#9DFF7A",
    seek: "#FF5A73",
    weave: "#5EC8FF",
    nest: "#C084FC",
    dart: "#FFCC4D",
    flee: "#7EE8C8",
    dew: "#E7FFF4",
  };

  function stepMs() {
    return Math.max(70, baseStep - (wave - 1) * 8);
  }

  function show(id) {
    document.querySelectorAll(".screen").forEach((el) => el.classList.remove("active"));
    const pauseEl = document.getElementById("pause");
    if (id === "pause") {
      pauseEl.classList.add("active");
      return;
    }
    pauseEl.classList.remove("active");
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("active");
    screen = id;
    if (id !== "game") {
      paused = false;
      stopLoop();
    }
  }

  function beep(freq, dur, type) {
    try {
      const ac = beep._ac || (beep._ac = new (window.AudioContext || window.webkitAudioContext)());
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.value = 0.035;
      o.connect(g);
      g.connect(ac.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.stop(ac.currentTime + dur);
    } catch (_) {}
  }

  function buildLevel() {
    cells = LAYOUT.map((row) => row.split(""));
    sparks = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = cells[y][x];
        if (c === "+") sparks.push({ x, y, kind: "sap" });
        if (c === "*") sparks.push({ x, y, kind: "sun" });
        if (c === "+" || c === "*" || c === "N" || c === "T") cells[y][x] = ".";
      }
    }

    player = { x: 10, y: 23, dx: 0, dy: 0, ndx: 0, ndy: 0 };
    const all = [
      { id: "Seek", x: 12, y: 7, dx: 0, dy: -1, color: C.seek, home: { x: 12, y: 7 }, t: 0, zig: 1 },
      { id: "Weave", x: 13, y: 7, dx: 1, dy: 0, color: C.weave, home: { x: 13, y: 7 }, t: 0, zig: 1 },
      { id: "Nest", x: 14, y: 7, dx: 0, dy: 1, color: C.nest, home: { x: 14, y: 7 }, t: 0, zig: 1 },
      { id: "Dart", x: 15, y: 7, dx: -1, dy: 0, color: C.dart, home: { x: 15, y: 7 }, t: 0, zig: 1 },
    ];
    enemies = all.slice(0, Math.min(4, 1 + wave));
    power = 0;
    updateHud();
  }

  function walkable(x, y) {
    if (y < 0 || y >= H) return false;
    x = ((x % COLS) + COLS) % COLS;
    const c = cells[y][x];
    return c !== "#" && c !== " ";
  }

  function wrapX(x) {
    return ((x % COLS) + COLS) % COLS;
  }

  function updateHud() {
    document.getElementById("score").textContent = score;
    document.getElementById("wave").textContent = wave;
    document.getElementById("lives").textContent = lives;
  }

  function dirsFrom(e) {
    return [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]
      .filter(([dx, dy]) => walkable(e.x + dx, e.y + dy))
      .map(([dx, dy]) => ({ dx, dy }));
  }

  function pickFlee(opts, e) {
    let best = -1;
    let choice = opts[0];
    opts.forEach((o) => {
      const d =
        Math.abs(wrapX(e.x + o.dx) - player.x) + Math.abs(e.y + o.dy - player.y);
      if (d > best) {
        best = d;
        choice = o;
      }
    });
    return choice;
  }

  function pickChase(opts, e, tx, ty) {
    const rev = { dx: -e.dx, dy: -e.dy };
    let best = 1e9;
    let choice = opts[0];
    opts.forEach((o) => {
      if (o.dx === rev.dx && o.dy === rev.dy && opts.length > 1) return;
      const d = Math.abs(wrapX(e.x + o.dx) - tx) + Math.abs(e.y + o.dy - ty);
      if (d < best) {
        best = d;
        choice = o;
      }
    });
    return choice;
  }

  function aiStep(e) {
    e.t++;
    const opts = dirsFrom(e);
    if (!opts.length) return;
    let choice;
    if (power > 0) {
      choice = pickFlee(opts, e);
    } else if (e.id === "Seek") {
      choice = pickChase(opts, e, player.x, player.y);
    } else if (e.id === "Weave") {
      const turns = opts.filter((o) => o.dx !== e.dx || o.dy !== e.dy);
      const pool = turns.length ? turns : opts;
      choice = pool[Math.abs(e.t + e.zig) % pool.length];
      if (e.t % 7 === 0) e.zig = -e.zig;
    } else if (e.id === "Nest") {
      choice =
        e.t % 40 < 22
          ? pickChase(opts, e, e.home.x, e.home.y)
          : pickChase(opts, e, player.x, player.y);
    } else {
      const fwd = opts.find((o) => o.dx === e.dx && o.dy === e.dy);
      if (fwd && Math.random() > 0.12) {
        choice = fwd;
      } else {
        const rev = { dx: -e.dx, dy: -e.dy };
        const pool = opts.filter((o) => !(o.dx === rev.dx && o.dy === rev.dy));
        const p = pool.length ? pool : opts;
        choice = p[Math.floor(Math.random() * p.length)];
      }
    }
    e.dx = choice.dx;
    e.dy = choice.dy;
    e.x = wrapX(e.x + e.dx);
    e.y += e.dy;
  }

  function tryPlayerMove() {
    if (
      (player.ndx || player.ndy) &&
      walkable(player.x + player.ndx, player.y + player.ndy)
    ) {
      player.dx = player.ndx;
      player.dy = player.ndy;
    }
    if (player.dx || player.dy) {
      if (walkable(player.x + player.dx, player.y + player.dy)) {
        player.x = wrapX(player.x + player.dx);
        player.y += player.dy;
      } else {
        player.dx = 0;
        player.dy = 0;
      }
    }
  }

  function collect() {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      if (s.x !== player.x || s.y !== player.y) continue;
      sparks.splice(i, 1);
      if (s.kind === "sun") {
        power = 180;
        score += 50;
        beep(520, 0.12, "triangle");
      } else {
        score += 10;
        beep(880, 0.035);
      }
      updateHud();
    }
    if (!sparks.some((s) => s.kind === "sap")) waveClear();
  }

  function collide() {
    for (const e of enemies) {
      if (e.x !== player.x || e.y !== player.y) continue;
      if (power > 0) {
        score += 200;
        e.x = e.home.x;
        e.y = e.home.y;
        beep(220, 0.15, "triangle");
        updateHud();
      } else {
        lifeLost();
        return;
      }
    }
  }

  function waveClear() {
    stopLoop();
    beep(440, 0.1);
    setTimeout(() => beep(660, 0.12), 100);
    document.getElementById("next-wave").textContent = String(wave + 1);
    show("levelup");
  }

  function lifeLost() {
    stopLoop();
    lives--;
    updateHud();
    beep(120, 0.25, "triangle");
    if (lives <= 0) {
      document.getElementById("final-score").textContent = score;
      showHs();
      show("gameover");
    } else {
      document.getElementById("lives-left").textContent = lives;
      show("lifelost");
    }
  }

  function showHs() {
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(HS_KEY) || "[]");
    } catch (_) {}
    document.getElementById("hs-display").textContent =
      "Best: " +
      (list
        .slice(0, 5)
        .map((e) => `${e.name} ${e.score}`)
        .join(" · ") || "No scores yet");
  }

  function saveHs() {
    const name = (document.getElementById("hs-name").value || "RTG")
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 3)
      .padEnd(3, "X");
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(HS_KEY) || "[]");
    } catch (_) {}
    list.push({ name, score });
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem(HS_KEY, JSON.stringify(list.slice(0, 10)));
    showHs();
    beep(700, 0.1);
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function isMoss(x, y) {
    if (y < 0 || y >= H || x < 0 || x >= COLS) return false;
    return cells[y][x] === "#";
  }

  function drawWalls() {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!isMoss(x, y)) continue;
        const px = x * TILE;
        const py = y * TILE;
        ctx.fillStyle = C.wallMoss;
        ctx.fillRect(px, py, TILE, TILE);
        if ((x * 3 + y * 5) % 11 === 0) {
          ctx.fillStyle = C.wallTrace;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.globalAlpha = 1;
        }
      }
    }

    ctx.strokeStyle = C.copper;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!isMoss(x, y)) continue;
        const px = x * TILE;
        const py = y * TILE;
        if (!isMoss(x, y - 1)) {
          ctx.moveTo(px, py + 0.5);
          ctx.lineTo(px + TILE, py + 0.5);
        }
        if (!isMoss(x, y + 1)) {
          ctx.moveTo(px, py + TILE - 0.5);
          ctx.lineTo(px + TILE, py + TILE - 0.5);
        }
        if (!isMoss(x - 1, y)) {
          ctx.moveTo(px + 0.5, py);
          ctx.lineTo(px + 0.5, py + TILE);
        }
        if (!isMoss(x + 1, y)) {
          ctx.moveTo(px + TILE - 0.5, py);
          ctx.lineTo(px + TILE - 0.5, py + TILE);
        }
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = C.copper;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!isMoss(x, y)) continue;
        const edge =
          !isMoss(x - 1, y) || !isMoss(x + 1, y) || !isMoss(x, y - 1) || !isMoss(x, y + 1);
        if (!edge) continue;
        if ((x + y * 2) % 7 !== 0) continue;
        const cx = x * TILE + TILE / 2;
        const cy = y * TILE + TILE / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawSparks() {
    sparks.forEach((s) => {
      const cx = s.x * TILE + 8;
      const cy = s.y * TILE + 8;
      if (s.kind === "sun") {
        ctx.fillStyle = C.sun;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? 8.5 : 4;
          const px = cx + Math.cos(a) * r;
          const py = cy + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = C.sap;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = C.sap;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 0.5, 2.2, 2.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = C.dew;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx - 0.6, cy - 1.2, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  }

  function drawPlayer() {
    const cx = player.x * TILE + 8;
    const cy = player.y * TILE + 8;
    ctx.fillStyle = C.leaf;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 6, cy - 1);
    ctx.lineTo(cx + 4, cy + 7);
    ctx.lineTo(cx - 4, cy + 7);
    ctx.lineTo(cx - 6, cy - 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.peat;
    ctx.fillRect(cx - 2.2, cy - 1.5, 1.6, 1.6);
    ctx.fillRect(cx + 0.6, cy - 1.5, 1.6, 1.6);
  }

  function drawEnemy(e) {
    const cx = e.x * TILE + 8;
    const cy = e.y * TILE + 8;
    ctx.fillStyle = power > 0 ? C.flee : e.color;
    ctx.beginPath();
    if (e.id === "Seek") {
      roundRect(cx - 6, cy - 6, 12, 12, 3);
    } else if (e.id === "Weave") {
      ctx.moveTo(cx, cy - 7);
      ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx, cy + 7);
      ctx.lineTo(cx - 7, cy);
      ctx.closePath();
    } else if (e.id === "Nest") {
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    } else {
      ctx.moveTo(cx - 6, cy - 3);
      ctx.lineTo(cx + 2, cy - 3);
      ctx.lineTo(cx + 2, cy - 6);
      ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx + 2, cy + 6);
      ctx.lineTo(cx + 2, cy + 3);
      ctx.lineTo(cx - 6, cy + 3);
      ctx.closePath();
    }
    ctx.fill();
  }

  function draw() {
    ctx.fillStyle = C.tunnel;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = C.copper;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 1;
    for (let i = 0; i < COLS; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i * TILE + 8, 0);
      ctx.lineTo(i * TILE + 8, canvas.height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    drawWalls();
    drawSparks();
    drawPlayer();
    enemies.forEach(drawEnemy);

    if (power > 0) {
      ctx.fillStyle = C.sun;
      ctx.globalAlpha = 0.1 + 0.08 * Math.sin(power / 5);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  function loop(ts) {
    if (!running) return;
    animId = requestAnimationFrame(loop);
    if (paused) {
      draw();
      return;
    }
    if (!lastTs) lastTs = ts;
    tickAcc += ts - lastTs;
    lastTs = ts;
    const step = stepMs();
    while (tickAcc >= step) {
      tickAcc -= step;
      tryPlayerMove();
      enemies.forEach(aiStep);
      if (power > 0) power--;
      collect();
      collide();
      if (!running) break;
    }
    draw();
  }

  function startLoop() {
    stopLoop();
    running = true;
    paused = false;
    lastTs = 0;
    tickAcc = 0;
    animId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(animId);
  }

  function startGame(resetAll) {
    if (resetAll) {
      score = 0;
      lives = 3;
      wave = 1;
    }
    buildLevel();
    show("game");
    startLoop();
    draw();
  }

  document.getElementById("app").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-go]");
    if (!btn) return;
    const go = btn.getAttribute("data-go");
    const wantsStart = btn.hasAttribute("data-start");
    if (go === "game") {
      startGame(true);
      return;
    }
    if (wantsStart && go === "title") {
      stopLoop();
      score = 0;
      lives = 3;
      wave = 1;
    }
    if (go === "title") stopLoop();
    show(go);
  });

  document.getElementById("btn-pause").addEventListener("click", () => {
    if (screen !== "game") return;
    paused = true;
    document.getElementById("pause").classList.add("active");
  });

  document.getElementById("btn-resume").addEventListener("click", () => {
    paused = false;
    document.getElementById("pause").classList.remove("active");
  });

  document.getElementById("btn-next-wave").addEventListener("click", () => {
    wave++;
    startGame(false);
  });

  document.getElementById("btn-retry").addEventListener("click", () => {
    buildLevel();
    show("game");
    startLoop();
    draw();
  });

  document.getElementById("btn-save-hs").addEventListener("click", saveHs);

  document.querySelector(".touch-pad").addEventListener("pointerdown", (ev) => {
    const b = ev.target.closest("[data-dir]");
    if (!b || !player) return;
    ev.preventDefault();
    const map = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
    const pair = map[b.getAttribute("data-dir")];
    if (!pair) return;
    player.ndx = pair[0];
    player.ndy = pair[1];
  });

  function jumpScreen(n) {
    const id = SCREEN_IDS[n - 1];
    if (!id) return;
    if (id === "pause") {
      if (screen !== "game") {
        buildLevel();
        show("game");
        draw();
        stopLoop();
      }
      paused = true;
      document.getElementById("pause").classList.add("active");
      return;
    }
    if (id === "game") {
      startGame(true);
      return;
    }
    if (id === "levelup") {
      document.getElementById("next-wave").textContent = String(wave + 1 || 2);
    }
    if (id === "lifelost") {
      document.getElementById("lives-left").textContent = lives || 2;
    }
    if (id === "gameover") {
      document.getElementById("final-score").textContent = score || 0;
      showHs();
    }
    show(id);
  }

  window.addEventListener("keydown", (e) => {
    if (e.code === "Enter" && screen === "attract") {
      show("title");
      e.preventDefault();
      return;
    }

    if (e.code >= "Digit1" && e.code <= "Digit8" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const n = Number(e.code.replace("Digit", ""));
      jumpScreen(n);
      e.preventDefault();
      return;
    }

    const map = {
      ArrowUp: [0, -1],
      KeyW: [0, -1],
      ArrowDown: [0, 1],
      KeyS: [0, 1],
      ArrowLeft: [-1, 0],
      KeyA: [-1, 0],
      ArrowRight: [1, 0],
      KeyD: [1, 0],
    };
    if (map[e.code] && screen === "game" && player && !paused) {
      player.ndx = map[e.code][0];
      player.ndy = map[e.code][1];
      e.preventDefault();
    }
    if ((e.code === "KeyP" || e.code === "Escape") && screen === "game") {
      paused = !paused;
      document.getElementById("pause").classList.toggle("active", paused);
      e.preventDefault();
    }
  });
})();
