/* Dewgrid R8j — oscillator SFX + ambient. */
(function (w) {
  var muted = false, pausedGate = false, wantAmbient = false;
  var ctx = null, amb = null;

  function setMuted(v) {
    muted = !!v;
    if (muted) stopNodes();
    else if (wantAmbient) startNodes();
  }
  function isMuted() { return muted; }
  function setPausedGate(v) {
    pausedGate = !!v;
    if (pausedGate) stopNodes();
    else if (wantAmbient) startNodes();
  }
  function isPausedGate() { return pausedGate; }
  function canPlay() { return !muted && !pausedGate; }

  function ensureCtx() {
    if (ctx) return ctx;
    var AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    return ctx;
  }

  function beep(freq, dur, type) {
    if (!canPlay()) return;
    try {
      var c = ensureCtx();
      if (!c) return;
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.value = 0.035;
      o.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0.035, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  function sap() { beep(880, 0.035); }
  function sun() { beep(520, 0.12, "triangle"); }
  function hit() { beep(120, 0.25, "triangle"); }
  function eat() { beep(220, 0.15, "triangle"); }
  function wave() {
    beep(440, 0.1);
    if (!canPlay()) return;
    try {
      var c = ensureCtx();
      if (!c) return;
      var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + 0.08;
      o.type = "sine";
      o.frequency.value = 660;
      g.gain.value = 0.035;
      o.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0.035, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.start(t);
      o.stop(t + 0.1);
    } catch (e) {}
  }

  function unlock() {
    if (!canPlay()) return;
    beep(523.25, 0.09, "triangle");
    try {
      var c = ensureCtx();
      if (!c) return;
      var t0 = c.currentTime;
      [[783.99, 0.09, 0.12, "triangle"], [1046.5, 0.18, 0.16, "sine"]].forEach(function (row) {
        var o = c.createOscillator(), g = c.createGain(), t = t0 + row[1];
        o.type = row[3];
        o.frequency.value = row[0];
        g.gain.value = 0.04;
        o.connect(g);
        g.connect(c.destination);
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + row[2]);
        o.start(t);
        o.stop(t + row[2] + 0.02);
      });
    } catch (e) {}
  }

  function stopNodes() {
    if (!amb) return;
    try {
      amb.o1.stop(); amb.o1.disconnect();
      amb.o2.stop(); amb.o2.disconnect();
      amb.lfo.stop(); amb.lfo.disconnect();
      amb.lg.disconnect(); amb.g.disconnect();
    } catch (e) {}
    amb = null;
  }

  function startNodes() {
    if (!canPlay() || amb) return;
    try {
      var c = ensureCtx();
      if (!c) return;
      var o1 = c.createOscillator(), o2 = c.createOscillator();
      var g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o1.type = "sine"; o1.frequency.value = 55;
      o2.type = "triangle"; o2.frequency.value = 82.5;
      lfo.type = "sine"; lfo.frequency.value = 0.15;
      lg.gain.value = 0.008;
      g.gain.value = 0.012;
      lfo.connect(lg);
      lg.connect(g.gain);
      o1.connect(g);
      o2.connect(g);
      g.connect(c.destination);
      o1.start(); o2.start(); lfo.start();
      amb = { o1: o1, o2: o2, g: g, lfo: lfo, lg: lg };
    } catch (e) { amb = null; }
  }

  function startAmbient() { wantAmbient = true; startNodes(); }
  function stopAmbient() { wantAmbient = false; stopNodes(); }

  w.Sfx = {
    setMuted: setMuted, isMuted: isMuted,
    setPausedGate: setPausedGate, isPausedGate: isPausedGate,
    canPlay: canPlay, ensureCtx: ensureCtx, beep: beep,
    sap: sap, sun: sun, hit: hit, wave: wave, eat: eat, unlock: unlock,
    startAmbient: startAmbient, stopAmbient: stopAmbient
  };
})(window);
