/* Dewgrid R8k — local high scores. */
(function (w) {
  var KEY = "dewgrid-hs";
  var EMPTY = "No scores yet. Be the first.";

  function storage() {
    try { return w.localStorage; } catch (e) { return null; }
  }

  function normalize(item) {
    if (!item || typeof item.name !== "string") return null;
    var name = item.name.toUpperCase();
    var score = Number(item.score);
    if (!/^[A-Z]{1,3}$/.test(name) || !isFinite(score)) return null;
    return { name: name, score: score };
  }

  function clean(list) {
    return list.map(normalize).filter(Boolean).sort(function (a, b) {
      return b.score - a.score;
    }).slice(0, 10);
  }

  function load() {
    var store = storage();
    if (!store) return [];
    try {
      var raw = JSON.parse(store.getItem(KEY) || "[]");
      return Array.isArray(raw) ? clean(raw) : [];
    } catch (e) { return []; }
  }

  function save(list) {
    var store = storage();
    if (!store) return;
    try { store.setItem(KEY, JSON.stringify(clean(list))); } catch (e) {}
  }

  function add(name, score) {
    if (typeof name !== "string" || !/^[A-Za-z]{1,3}$/.test(name)) {
      return { ok: false };
    }
    var list = load();
    list.push({ name: name.toUpperCase(), score: Number(score) || 0 });
    list = clean(list);
    save(list);
    return { ok: true, list: list };
  }

  function boardText(list) {
    return list.length ? list.map(function (item) {
      return item.name + " " + item.score;
    }).join(" / ") : EMPTY;
  }

  function render(list) {
    if (!w.document) return;
    list = list || load();
    var text = boardText(list);
    ["hs-display", "scores-board"].forEach(function (id) {
      var el = w.document.getElementById(id);
      if (el) el.textContent = text;
    });
  }

  function showError(on) {
    var input = w.document && w.document.getElementById("hs-name");
    var error = w.document && w.document.getElementById("hs-error");
    if (input) input.classList.toggle("is-invalid", !!on);
    if (error) error.classList.toggle("is-invalid", !!on);
  }

  function clearError() { showError(false); }

  function bind() {
    var button = w.document && w.document.getElementById("btn-save-hs");
    if (!button || button.__scoresBound) return;
    button.__scoresBound = true;
    button.addEventListener("click", function () {
      var input = w.document.getElementById("hs-name");
      var final = w.document.getElementById("final-score");
      var entity = w.Entities;
      var score = entity && entity.getScore ? entity.getScore() : Number(final && final.textContent);
      var result = add(input && input.value, score);
      if (!result.ok) { showError(true); return; }
      clearError();
      if (input) input.value = "";
      render(result.list);
    });
  }

  w.Scores = {
    KEY: KEY, load: load, save: save, add: add, render: render,
    showError: showError, clearError: clearError, bind: bind, refresh: function () {
      render(load());
    }
  };
})(window);
