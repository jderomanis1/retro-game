/* Dewgrid R8b — maze LAYOUT + walk helpers. Dewnode spawn later. */
(function (w) {
  var TILE = 16;
  var COLS = 28;
  var LAYOUT = [
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
  ].map(function (r) {
    return r.length >= COLS ? r.slice(0, COLS) : r.padEnd(COLS, "#");
  });
  var H = LAYOUT.length;

  function wrapX(x) {
    return ((x % COLS) + COLS) % COLS;
  }

  function inBoundsY(y) {
    return y >= 0 && y < H;
  }

  function isWall(cells, x, y) {
    if (!inBoundsY(y) || x < 0 || x >= COLS) return false;
    return cells[y][x] === "#";
  }

  function isMoss(cells, x, y) {
    return isWall(cells, x, y);
  }

  function canWalk(cells, x, y) {
    if (!inBoundsY(y)) return false;
    x = wrapX(x);
    return cells[y][x] !== "#" && cells[y][x] !== " ";
  }

  function buildLevel() {
    var cells = LAYOUT.map(function (row) { return row.split(""); });
    var sparks = [];
    var nests = [];
    var y, x, c;
    for (y = 0; y < H; y++) {
      for (x = 0; x < COLS; x++) {
        c = cells[y][x];
        if (c === "+") sparks.push({ x: x, y: y, kind: "sap" });
        if (c === "*") sparks.push({ x: x, y: y, kind: "sun" });
        if (c === "N") nests.push({ x: x, y: y });
        if (c === "+" || c === "*" || c === "N" || c === "T") cells[y][x] = ".";
      }
    }
    return { cells: cells, sparks: sparks, nests: nests };
  }

  function getSpawnHints() {
    var nests = [];
    var y, x;
    for (y = 0; y < H; y++) {
      for (x = 0; x < COLS; x++) {
        if (LAYOUT[y].charAt(x) === "N") nests.push({ x: x, y: y });
      }
    }
    return { nests: nests };
  }

  w.Maze = {
    TILE: TILE,
    COLS: COLS,
    LAYOUT: LAYOUT,
    H: H,
    buildLevel: buildLevel,
    isWall: isWall,
    isMoss: isMoss,
    wrapX: wrapX,
    inBoundsY: inBoundsY,
    canWalk: canWalk,
    getSpawnHints: getSpawnHints
  };
})(window);
