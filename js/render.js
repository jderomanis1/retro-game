/* Dewgrid R8f — maze + Dewnode + four enemy shapes + power tint. */
(function (w) {
  var C = {
    peat: "#06140F", leaf: "#9DFF7A", wallMoss: "#0A2A1C",
    copper: "#B87333", sap: "#F4D35E", sun: "#FF8A3D",
    dew: "#E7FFF4", tunnel: "#04110C", flee: "#7EE8C8"
  };
  var canvas, ctx, TILE, COLS, H;
  var hotTubImg = null;
  var hotTubTried = false;

  function ensureHotTub() {
    if (hotTubTried) return hotTubImg;
    hotTubTried = true;
    hotTubImg = new Image();
    hotTubImg.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAFhElEQVR4nO2dv07dMBTGTdUJRhgZLlvhHfoAvEAXhjKwdqKqhMSIhFSJqSsDDDwDD9B3gG7cgZGOMKG2k6kxduI/5xwfJ99PQqK3CTfx9/nzSeIkxgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA7K603QIK/3z9+GFzg3Zfb2H+tfP006Taa3M6Niu0yIPwb/vzYtr+ufPv5K2+r9NK9AbIEd/HFdwTOWsb0bYguDVAsusUVNiJq6fK9maErA1QLb0y++P56iev0YoQuDEAifCO0G0G1AbKFHyrqcno7A1qNoNIApML7wAivUGeAavErqnkpNJlAjQGKxnnGal4CDUZQYQAR8f31agxAWGu0NkFzA3RV4TPVGi1N0MwAXQlvjEit0cIITQzQtfjMtYa0Cd5JfpkxMxA/Z7kA0u0jmgDdid8QqSQQSwCIn4dUe4kYAOKXIdFu4jUA0AW7AdD76+BuP1YDQHwaONuRzQAQnxau9kQNMHNYDIDezwNHuyIBZg65AdD7eaFuXyTAzCE1AHq/DJTt/J7qD2nmcXcrfSKHx9r1XfOpY5yQXQ3U0PtrhM5FgzEorhh2nQCSgo99twZDlNCdAUpE3zldFn/fzdEiaTl3u3oyA8kQIBH/KcKXCH1ztChebwwJI9QOA+oTYEj4mp5di//dIUPYbdecCGoTICZ8iehPD5vBz5dn//2/OHwOLrO6cZ/9fbF04DDC5BKgRviY0JaDi6uX38/395K2J/Y3h4xht9U3gsZEqE4Ayt4fEn9M+DHRLa74xhhz/Pvzm2ViKTDGWEqEEoHSBDUpoCYBfPGHhE8V3WLFd3v98Vn5rvtJ4m5PyAyhRHjc3brVkAQqEiBV/JyID/XwWhaHz2+SxJjwcBJLBT8NKExQkwDNDUAhfkgUC4UR7NAQSpLQZxYpE9QYoOnVwBTxnx42kyP/fH/v5cdSOq5TrB/bdn8/W57RbGaAVPHHiPVA+++DiyuzOHzOFrJknRiaTaBiPkCp+LmkChpbzjWV/XE/HyLFBC1oYgDX7VLiUxFLmhTGTNAiBVQkQA1ur3QJ9c5l4qHf2HKhWqNXxM8DcPb+oaOBGIvD52RjUPD0sPnm6GDndPlyZCB9fkDNiaAaQimQ0jvtWC9tAk1Maq9TIzlU5NnP5maE7muAVKywJ+uX0aHi4OLKnKxfvlp+6lQboPVjznJwe36saPSX087kLgevbtyzngM43997EXvovD6XCUrmF3AymyHAJVYrTOGwLpcmM4LGDgWN0X0yqJSUi0O5h4C1QwBJAnDUAdqishaO/aFo9yZDgOvyodm1UzHB0H7U9H4KVNQAYybo1Qhj2556zwEnZAbIjSPf7WON0ZsJcucJSo/9lqYJUGIC7UZI2UaOaWGlkD8qtmSKWM6EUB8NRws5pqQQn7LoVlED5CaBi+1x0slQ8r2aer6F5WHRpRNFS+4LSKEmJSiMRXlfAPUht6pTwWvXd9u+CWzj1RihVd0geYtYKWyPi6eeLm7RMI9uDC7hOU64qUoAF9tYsUQwRpcZhuoWTT3eh/WFEdz3DfpIGkL6+QBcl93Z3xhCfeu41ieEuFD3eM45FyKvjOF6gkjLO2p8uGKee8KN2hogBb/R5/aUMArEXhrV8jFyvT4nUGK6Hd4appTJvTXMmL4mkLZEsp3ErwXABMNM/s2hxsAEMWbz7mAX1AVtO0Tzy8FzT4PW+9/cAMa0b4RWaNjv5kOAzxyGBA3CW1QkgIumxuFA2/6pSwCXKaWBNuEtqg1g6dkIWoW3dGEAS09G0C68pSsDWDQboRfhLV0awEWDGXoT3aV7A/hIGKJnwX0mZ4AQNaaYktgAAAAAAAAAAAAAAAAAZsk/KDHl2wL1ecAAAAAASUVORK5CYII="; /* inline Legal-cleared hot-tub prop */
    return hotTubImg;
  }

  function init(el) {
    canvas = el; ctx = canvas.getContext("2d");
    TILE = w.Maze.TILE; COLS = w.Maze.COLS; H = w.Maze.H;
    canvas.width = COLS * TILE; canvas.height = H * TILE;
  }

  function moss(cells, x, y) { return w.Maze.isMoss(cells, x, y); }

  function drawWalls(cells) {
    var x, y, px, py;
    for (y = 0; y < H; y++) {
      for (x = 0; x < COLS; x++) {
        if (!moss(cells, x, y)) continue;
        px = x * TILE; py = y * TILE;
        ctx.fillStyle = C.wallMoss;
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
    ctx.strokeStyle = C.copper; ctx.lineWidth = 1; ctx.globalAlpha = 0.75;
    ctx.beginPath();
    for (y = 0; y < H; y++) {
      for (x = 0; x < COLS; x++) {
        if (!moss(cells, x, y)) continue;
        px = x * TILE; py = y * TILE;
        if (!moss(cells, x, y - 1)) { ctx.moveTo(px, py + 0.5); ctx.lineTo(px + TILE, py + 0.5); }
        if (!moss(cells, x, y + 1)) { ctx.moveTo(px, py + TILE - 0.5); ctx.lineTo(px + TILE, py + TILE - 0.5); }
        if (!moss(cells, x - 1, y)) { ctx.moveTo(px + 0.5, py); ctx.lineTo(px + 0.5, py + TILE); }
        if (!moss(cells, x + 1, y)) { ctx.moveTo(px + TILE - 0.5, py); ctx.lineTo(px + TILE - 0.5, py + TILE); }
      }
    }
    ctx.stroke(); ctx.globalAlpha = 1;
  }

  function drawSparks(sparks) {
    sparks.forEach(function (s) {
      var cx = s.x * TILE + 8, cy = s.y * TILE + 8, i, a, r;
      if (s.kind === "sun") {
        var themeOn = w.Theme && w.Theme.isUnlocked && w.Theme.isUnlocked();
        var img = themeOn ? ensureHotTub() : null;
        if (img && img.complete && img.naturalWidth) {
          ctx.drawImage(img, cx - 8, cy - 8, 16, 16);
        } else {
          ctx.fillStyle = C.sun; ctx.beginPath();
          for (i = 0; i < 8; i++) {
            a = (i / 8) * Math.PI * 2 - Math.PI / 2;
            r = i % 2 === 0 ? 8.5 : 4;
            if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          }
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = C.sap; ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.fillStyle = C.sap; ctx.beginPath();
        ctx.ellipse(cx, cy - 0.5, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.dew; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(cx - 0.6, cy - 1.2, 0.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  }

  function drawPlayer(player) {
    if (!player || !ctx) return;
    var cx = player.x * TILE + 8, cy = player.y * TILE + 8;
    ctx.fillStyle = C.leaf; ctx.beginPath();
    ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 6, cy - 1);
    ctx.lineTo(cx + 4, cy + 7); ctx.lineTo(cx - 4, cy + 7);
    ctx.lineTo(cx - 6, cy - 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.peat;
    ctx.fillRect(cx - 2.2, cy - 1.5, 1.6, 1.6);
    ctx.fillRect(cx + 0.6, cy - 1.5, 1.6, 1.6);
  }

  function drawEnemy(e) {
    if (!e || !ctx) return;
    var cx = e.x * TILE + 8, cy = e.y * TILE + 8;
    var flee = w.Entities && w.Entities.isPowered();
    ctx.fillStyle = flee ? C.flee : e.color;
    ctx.beginPath();
    if (e.id === "Seek") {
      ctx.rect(cx - 6, cy - 6, 12, 12);
    } else if (e.id === "Weave") {
      ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 7, cy); ctx.closePath();
    } else if (e.id === "Nest") {
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    } else {
      ctx.moveTo(cx - 6, cy - 3); ctx.lineTo(cx + 2, cy - 3);
      ctx.lineTo(cx + 2, cy - 6); ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx + 2, cy + 6); ctx.lineTo(cx + 2, cy + 3);
      ctx.lineTo(cx - 6, cy + 3); ctx.closePath();
    }
    ctx.fill();
  }

  function drawActors(player, enemies) {
    if (player) drawPlayer(player);
    (enemies || []).forEach(drawEnemy);
  }

  function drawFrame(level, player, enemies) {
    if (!ctx || !level) return;
    if (!enemies && w.Entities && w.Entities.getEnemies)
      enemies = w.Entities.getEnemies();
    ctx.fillStyle = C.tunnel;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawWalls(level.cells);
    drawSparks(level.sparks);
    drawActors(player, enemies);
    if (w.Entities && w.Entities.isPowered()) {
      ctx.fillStyle = C.sun; ctx.globalAlpha = 0.12;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  function drawOnce(level) { drawFrame(level, null); }

  w.Render = {
    init: init, drawOnce: drawOnce, drawFrame: drawFrame,
    drawPlayer: drawPlayer, drawEnemy: drawEnemy, drawActors: drawActors, C: C
  };
})(window);
