/* Dewgrid R8d — movement intent (keys + touch); ignore key-repeat clobber. */
(function (w) {
  var DIR = {
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
  };
  var PAD = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  var intent = { dx: 0, dy: 0 };
  var bound = false;

  function inGame() {
    var S = w.Screens;
    return S && S.getScreen() === "game" && !S.isPaused();
  }

  function hsFocused() {
    var ae = document.activeElement;
    return ae && ae.id === "hs-name";
  }

  function setIntent(dx, dy) {
    intent.dx = dx;
    intent.dy = dy;
  }

  function onKey(ev) {
    var pair = DIR[ev.key];
    if (!pair) return;
    if (!inGame() || hsFocused()) return;
    /* Holding a direction re-fires keydown; that must not wipe a buffered turn. */
    if (ev.repeat) {
      ev.preventDefault();
      return;
    }
    setIntent(pair[0], pair[1]);
    ev.preventDefault();
  }

  function onPad(ev) {
    var b = ev.target.closest("[data-dir]");
    if (!b || !inGame()) return;
    var pair = PAD[b.getAttribute("data-dir")];
    if (!pair) return;
    ev.preventDefault();
    setIntent(pair[0], pair[1]);
  }

  function bind() {
    if (bound) return;
    bound = true;
    w.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPad);
  }

  function getIntent() {
    return { dx: intent.dx, dy: intent.dy };
  }

  function peek() {
    return getIntent();
  }

  function clearIntent() {
    intent.dx = 0;
    intent.dy = 0;
  }

  w.Input = {
    DIR: DIR,
    PAD: PAD,
    bind: bind,
    getIntent: getIntent,
    peek: peek,
    clearIntent: clearIntent,
    setIntent: setIntent
  };
})(window);
