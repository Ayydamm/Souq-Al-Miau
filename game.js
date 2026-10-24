/* ==========================================================================
   Souq al-Miau — site + game
   ========================================================================== */

(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };

  var STORE_KEY = 'souqalMiau.v1';
  var TOTAL_TIME = 40;
  var TILE_COUNT = 12;

  /* ---------------------------------------------------------------- ledger */

  function blankLedger() {
    return { best: 0, bestCombo: 0, runs: 0, scores: [] };
  }

  function readLedger() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return blankLedger();
      var data = JSON.parse(raw) || {};
      return {
        best: Number(data.best) || 0,
        bestCombo: Number(data.bestCombo) || 0,
        runs: Number(data.runs) || 0,
        scores: Array.isArray(data.scores) ? data.scores.slice(0, 5) : []
      };
    } catch (err) {
      return blankLedger();
    }
  }

  function writeLedger(ledger) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(ledger));
    } catch (err) {
      /* private browsing or file:// with storage disabled — the game still works */
    }
  }

  function rankFor(score) {
    if (score >= 15000) return { title: 'Mythical — the 7th cat', line: 'You were never on the staff. You are the staff.' };
    if (score >= 10000) return { title: 'Grand Vizier of the Souq', line: 'The cats now address you first.' };
    if (score >= 6500) return { title: 'Sultan of Slapping', line: 'Your palm has diplomatic immunity.' };
    if (score >= 3500) return { title: 'Respectable Shawl Merchant', line: 'You may now touch the shawl. Briefly.' };
    if (score >= 1500) return { title: 'Junior Litter Manager', line: 'You are paid in fish and vague respect.' };
    return { title: 'Unpaid Intern of the Souq', line: 'The cats have already forgotten your name.' };
  }

  function formatDate(ts) {
    var d = new Date(Number(ts) || Date.now());
    try {
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' · ' +
        d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      return 'sometime';
    }
  }

  /* ----------------------------------------------------------------- sound */

  var AudioCtx = (function () {
    var ctx = null;

    function get() {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (err) { return null; }
      }
      if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
      return ctx;
    }

    return {
      get: get,
      peek: function () { return ctx; }
    };
  })();

  var Sound = (function () {
    var muted = false;

    try {
      muted = localStorage.getItem(STORE_KEY + '.muted') === '1';
    } catch (err) { /* ignore */ }

    function ensure() {
      return AudioCtx.get();
    }

    function tone(f0, f1, dur, type, vol, delay) {
      if (muted) return;
      var c = ensure();
      if (!c) return;
      var t = c.currentTime + (delay || 0);
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(Math.max(20, f0), t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.04);
    }

    return {
      isMuted: function () { return muted; },
      setMuted: function (value) {
        muted = !!value;
        try { localStorage.setItem(STORE_KEY + '.muted', muted ? '1' : '0'); } catch (err) { /* ignore */ }
      },
      unlock: function () { ensure(); },
      hit: function (combo) {
        var base = 392 * Math.pow(1.0595, Math.min(combo || 0, 14));
        tone(base, base * 1.01, 0.09, 'triangle', 0.075);
        tone(base * 1.5, base * 1.51, 0.08, 'sine', 0.04, 0.05);
      },
      miss: function () { tone(180, 64, 0.28, 'sawtooth', 0.06); },
      start: function () {
        tone(392, 392, 0.13, 'triangle', 0.06, 0);
        tone(523, 523, 0.13, 'triangle', 0.06, 0.11);
        tone(659, 659, 0.2, 'triangle', 0.06, 0.22);
      },
      end: function () {
        tone(659, 650, 0.2, 'sine', 0.06, 0);
        tone(523, 515, 0.2, 'sine', 0.06, 0.13);
        tone(392, 385, 0.3, 'sine', 0.06, 0.26);
      },
      tick: function () { tone(880, 880, 0.045, 'square', 0.025); },
      meow: function () {
        tone(560, 380, 0.2, 'sawtooth', 0.028);
        tone(430, 620, 0.16, 'triangle', 0.024, 0.13);
      }
    };
  })();

  /* --------------------------------------------------------------- music */

  var Music = (function () {
    var enabled = true;
    var mode = 'ambient';
    var playing = false;
    var master = null;
    var busA = null;
    var busB = null;
    var revIn = null;
    var noise = null;
    var timer = 0;
    var nextT = 0;
    var step = 0;
    var droneOn = false;

    /* D Hijaz-ish scale: the whole point of the Mediterranean thing */
    var SCALE = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 523.25];
    var HIGH = [587.33, 622.25, 739.99, 783.99, 880.0];
    var BELL = [587.33, 0, 0, 523.25, 0, 0, 440.0, 0, 466.16, 0, 0, 440.0, 0, 0, 392.0, 0];
    var KICKS = { 0: 1, 6: 0.85, 8: 1, 11: 0.55, 16: 1, 22: 0.85, 24: 1, 27: 0.55 };
    var BASSES = { 0: 73.42, 6: 73.42, 8: 87.31, 14: 65.41 };

    try {
      enabled = localStorage.getItem(STORE_KEY + '.music') !== '0';
    } catch (err) { /* ignore */ }

    function impulse(c, seconds) {
      var len = Math.floor(c.sampleRate * seconds);
      var buf = c.createBuffer(2, len, c.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var data = buf.getChannelData(ch);
        for (var i = 0; i < len; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
        }
      }
      return buf;
    }

    function noiseBuffer(c) {
      var len = Math.floor(c.sampleRate * 1.2);
      var buf = c.createBuffer(1, len, c.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    }

    function fade(param, target, seconds) {
      var c = AudioCtx.peek();
      if (!c || !param) return;
      var now = c.currentTime;
      param.cancelScheduledValues(now);
      param.setValueAtTime(param.value, now);
      param.linearRampToValueAtTime(target, now + seconds);
    }

    function build(c) {
      master = c.createGain();
      master.gain.value = 0.0001;
      master.connect(c.destination);

      busA = c.createGain();
      busA.gain.value = 0.0001;
      busA.connect(master);

      busB = c.createGain();
      busB.gain.value = 0.0001;
      busB.connect(master);

      var conv = c.createConvolver();
      conv.buffer = impulse(c, 2.4);
      revIn = c.createGain();
      revIn.gain.value = 0.6;
      var revOut = c.createGain();
      revOut.gain.value = 0.5;
      revIn.connect(conv);
      conv.connect(revOut);
      revOut.connect(master);

      noise = noiseBuffer(c);
      startDrone(c);
    }

    function startDrone(c) {
      if (droneOn) return;
      droneOn = true;

      var out = c.createGain();
      out.gain.value = 0.06;
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 460;
      f.Q.value = 0.8;
      f.connect(out);
      out.connect(busA);

      [73.42, 110.0, 146.83].forEach(function (fr, i) {
        var o = c.createOscillator();
        o.type = i === 2 ? 'triangle' : 'sine';
        o.frequency.value = fr;
        var g = c.createGain();
        g.gain.value = i === 2 ? 0.16 : 0.4;
        o.connect(g);
        g.connect(f);
        o.start();
      });

      var lfo = c.createOscillator();
      var lfoGain = c.createGain();
      lfo.frequency.value = 0.05;
      lfoGain.gain.value = 150;
      lfo.connect(lfoGain);
      lfoGain.connect(f.frequency);
      lfo.start();
    }

    function pluck(freq, t, vol) {
      var c = AudioCtx.peek();
      if (!c) return;
      var o1 = c.createOscillator();
      var o2 = c.createOscillator();
      var g = c.createGain();
      var f = c.createBiquadFilter();

      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o1.frequency.value = freq;
      o2.frequency.value = freq * 1.005;

      f.type = 'lowpass';
      f.Q.value = 3;
      f.frequency.setValueAtTime(Math.min(6000, freq * 9), t);
      f.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 2), t + 0.4);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);

      o1.connect(f);
      o2.connect(f);
      f.connect(g);
      g.connect(busA);
      g.connect(revIn);

      o1.start(t);
      o2.start(t);
      o1.stop(t + 1.5);
      o2.stop(t + 1.5);
    }

    function thump(t, vol) {
      var c = AudioCtx.peek();
      if (!c) return;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(118, t);
      o.frequency.exponentialRampToValueAtTime(62, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g);
      g.connect(busA);
      o.start(t);
      o.stop(t + 0.46);
    }

    function kick(t, vol) {
      var c = AudioCtx.peek();
      if (!c) return;
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(168, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(g);
      g.connect(busB);
      o.start(t);
      o.stop(t + 0.38);
    }

    function snare(t, vol) {
      var c = AudioCtx.peek();
      if (!c) return;

      var s = c.createBufferSource();
      s.buffer = noise;
      var f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1850;
      f.Q.value = 0.9;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      s.connect(f);
      f.connect(g);
      g.connect(busB);
      s.start(t);
      s.stop(t + 0.2);

      var o = c.createOscillator();
      var og = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(205, t);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(vol * 0.45, t + 0.004);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(og);
      og.connect(busB);
      o.start(t);
      o.stop(t + 0.12);
    }

    function hat(t, vol, open) {
      var c = AudioCtx.peek();
      if (!c) return;
      var dur = open ? 0.17 : 0.045;
      var s = c.createBufferSource();
      s.buffer = noise;
      var f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 7800;
      var g = c.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f);
      f.connect(g);
      g.connect(busB);
      s.start(t);
      s.stop(t + dur + 0.02);
    }

    function cowbell(t, freq, vol) {
      var c = AudioCtx.peek();
      if (!c) return;
      var f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1400;
      f.Q.value = 1.1;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      f.connect(g);
      g.connect(busB);
      g.connect(revIn);
      [1, 1.48].forEach(function (m) {
        var o = c.createOscillator();
        o.type = 'square';
        o.frequency.value = freq * m;
        o.connect(f);
        o.start(t);
        o.stop(t + 0.2);
      });
    }

    function bassLine(t, freq, vol) {
      var c = AudioCtx.peek();
      if (!c) return;
      var o = c.createOscillator();
      var f = c.createBiquadFilter();
      var g = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(freq, t);
      f.type = 'lowpass';
      f.Q.value = 5;
      f.frequency.setValueAtTime(440, t);
      f.frequency.exponentialRampToValueAtTime(120, t + 0.26);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
      o.connect(f);
      f.connect(g);
      g.connect(busB);
      o.start(t);
      o.stop(t + 0.5);
    }

    function stab(t) {
      var c = AudioCtx.peek();
      if (!c) return;
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1100;
      f.Q.value = 2;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      f.connect(g);
      g.connect(busB);
      g.connect(revIn);
      [146.83, 174.61, 220.0].forEach(function (fr) {
        var o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = fr * 2;
        o.detune.value = Math.random() * 12 - 6;
        o.connect(f);
        o.start(t);
        o.stop(t + 1.2);
      });
    }

    function ambientStep(i, t) {
      if (i % 8 === 0) thump(t, 0.16);
      if (Math.random() < 0.34) pluck(pick(SCALE), t, 0.09);
      if (i % 8 === 5 && Math.random() < 0.45) pluck(pick(HIGH), t, 0.055);
    }

    function battleStep(i, t) {
      var s = i % 16;
      var k = KICKS[i % 32];

      if (k) kick(t, 0.5 * k);
      if (s === 8) snare(t, 0.26);
      if (s % 2 === 0) hat(t, s % 4 === 0 ? 0.05 : 0.028, false);
      if (s === 14) hat(t, 0.045, true);
      if (BELL[s]) cowbell(t, BELL[s], 0.05);
      if (BASSES[s]) bassLine(t, BASSES[s], 0.2);
      if (s === 0) stab(t);
    }

    function tick() {
      var c = AudioCtx.peek();
      if (!c || !playing) return;

      /* waking from a throttled tab: do not machine-gun the backlog */
      if (nextT < c.currentTime - 0.2) {
        nextT = c.currentTime + 0.05;
        step = 0;
        return;
      }

      var horizon = c.currentTime + 0.2;
      var guard = 0;
      while (nextT < horizon && guard < 48) {
        guard++;
        if (mode === 'battle') {
          battleStep(step, nextT);
          nextT += 0.1;
        } else {
          ambientStep(step, nextT);
          nextT += 0.5;
        }
        step++;
      }
    }

    function start() {
      var c = AudioCtx.get();
      if (!c) return;
      if (!master) build(c);
      if (!enabled) return;

      playing = true;
      fade(master.gain, 0.7, 1.4);

      if (!timer) {
        nextT = c.currentTime + 0.15;
        step = 0;
        timer = window.setInterval(tick, 45);
      }

      fade(busA.gain, mode === 'ambient' ? 0.9 : 0.0001, 1.2);
      fade(busB.gain, mode === 'battle' ? 0.8 : 0.0001, 1.0);
    }

    function stop() {
      playing = false;
      if (timer) {
        window.clearInterval(timer);
        timer = 0;
      }
      fade(master.gain, 0.0001, 0.7);
    }

    function setMode(next) {
      if (next !== 'ambient' && next !== 'battle') return;
      mode = next;
      if (!enabled) return;

      var c = AudioCtx.get();
      if (!c) return;
      if (!master) build(c);
      if (!playing) {
        start();
        return;
      }

      fade(busA.gain, mode === 'ambient' ? 0.9 : 0.0001, 1.0);
      fade(busB.gain, mode === 'battle' ? 0.8 : 0.0001, 0.8);
      nextT = c.currentTime + 0.1;
      step = 0;
    }

    return {
      isEnabled: function () { return enabled; },
      setEnabled: function (value) {
        enabled = !!value;
        try { localStorage.setItem(STORE_KEY + '.music', enabled ? '1' : '0'); } catch (err) { /* ignore */ }
        if (enabled) start();
        else stop();
      },
      start: function () { if (enabled) start(); },
      stop: stop,
      setMode: setMode
    };
  })();

  /* --------------------------------------------------------------- voice */

  var Voice = (function () {
    var enabled = true;
    var supported = typeof window.speechSynthesis !== 'undefined' &&
      typeof window.SpeechSynthesisUtterance !== 'undefined';
    var voice = null;
    var sayId = 0;

    try {
      enabled = localStorage.getItem(STORE_KEY + '.voice') !== '0';
    } catch (err) { /* ignore */ }

    function choose() {
      if (!supported) return;
      var list = window.speechSynthesis.getVoices() || [];
      if (!list.length) return;

      var wanted = [/Google UK English Male/i, /Microsoft (Guy|Ryan|George|David)/i, /Daniel/i, /Arthur/i, /Google UK English/i];
      for (var i = 0; i < wanted.length; i++) {
        for (var j = 0; j < list.length; j++) {
          if (wanted[i].test(list[j].name)) {
            voice = list[j];
            return;
          }
        }
      }

      var english = list.filter(function (v) { return /^en[-_]/i.test(v.lang); });
      voice = english.length ? english[0] : list[0];
    }

    if (supported) {
      choose();
      if (typeof window.speechSynthesis.addEventListener === 'function') {
        window.speechSynthesis.addEventListener('voiceschanged', choose);
      } else {
        window.speechSynthesis.onvoiceschanged = choose;
      }
    }

    function say(text, opts) {
      if (!supported || !enabled || !text) return;

      var synth = window.speechSynthesis;
      if (!voice) choose();

      var utter = new window.SpeechSynthesisUtterance(text);
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang;
      } else {
        utter.lang = 'en-US';
      }
      utter.rate = (opts && opts.rate) || 0.92;
      utter.pitch = (opts && opts.pitch) || 0.8;
      utter.volume = 1;

      sayId += 1;
      var me = sayId;
      try { synth.cancel(); } catch (err) { /* ignore */ }

      /* a beat after cancel(), otherwise Chrome eats the new utterance */
      window.setTimeout(function () {
        if (me !== sayId) return;
        try { synth.speak(utter); } catch (err) { /* ignore */ }
      }, 45);
    }

    return {
      isEnabled: function () { return enabled; },
      isSupported: function () { return supported; },
      setEnabled: function (value) {
        enabled = !!value;
        try { localStorage.setItem(STORE_KEY + '.voice', enabled ? '1' : '0'); } catch (err) { /* ignore */ }
        if (!enabled && supported) {
          sayId += 1;
          try { window.speechSynthesis.cancel(); } catch (err) { /* ignore */ }
        }
      },
      say: say
    };
  })();

  /* ------------------------------------------------------------- utilities */

  var toastTimer = 0;
  function toast(message) {
    var el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text)
        .then(function () { return true; })
        .catch(function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /* ---------------------------------------------------------- site renders */

  function renderHero() {
    var host = $('#heroCats');
    if (!host) return;
    var dy = ['20px', '9px', '0px', '0px', '9px', '20px'];
    var rot = ['-11deg', '-6deg', '-2deg', '2deg', '6deg', '11deg'];
    host.innerHTML = CATS.map(function (cat, i) {
      return '<span class="hero-cat" style="--dy:' + dy[i] + ';--rot:' + rot[i] +
        ';--delay:' + (-i * 0.45) + 's">' + catSVG(cat) + '</span>';
    }).join('');
  }

  function renderMarquee() {
    var host = $('#marquee');
    if (!host) return;
    var one = CATS.map(function (cat) {
      return '<span>' + cat.name + ' <b aria-hidden="true">✦</b></span>';
    }).join('');
    host.innerHTML = one + one;
  }

  function renderRoster() {
    var host = $('#rosterGrid');
    if (!host) return;

    host.innerHTML = CATS.map(function (cat, i) {
      var stats = cat.stats.map(function (pair) {
        return '<li><span>' + pair[0] + '</span>' +
          '<span class="s-bar"><i data-v="' + pair[1] + '" style="--v:0%"></i></span></li>';
      }).join('');

      return '<article class="cat-card reveal" data-cat="' + cat.id + '" style="transition-delay:' + (i * 55) + 'ms">' +
        '<div class="card-top">' +
          '<span class="card-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="chip">' + cat.title + '</span>' +
        '</div>' +
        '<div class="portrait">' + catSVG(cat) + '</div>' +
        '<button class="cat-name" type="button" data-copy="' + cat.name + '">' +
          '<span>' + cat.name + '</span>' +
          '<span class="copy-hint">copy</span>' +
        '</button>' +
        '<p class="cat-quote">' + cat.quote + '</p>' +
        '<ul class="stats">' + stats + '</ul>' +
      '</article>';
    }).join('');

    host.addEventListener('click', function (event) {
      var copyBtn = event.target.closest('[data-copy]');
      if (copyBtn) {
        copyText(copyBtn.getAttribute('data-copy')).then(function (ok) {
          toast(ok ? 'Copied. Good luck pronouncing it.' : 'Your browser refused to copy. Rude.');
        });
        return;
      }
      var card = event.target.closest('.cat-card');
      if (!card) return;
      var cat = CAT_BY_ID[card.getAttribute('data-cat')];
      if (!cat) return;
      card.classList.remove('pok');
      void card.offsetWidth;
      card.classList.add('pok');
      if (Voice.isEnabled()) Voice.say(cat.name);
      else Sound.meow();
      toast('“' + cat.quote + '” — ' + cat.name);
    });
  }

  function renderStudy() {
    var host = $('#studyGrid');
    if (!host) return;
    host.innerHTML = CATS.map(function (cat) {
      return '<div class="study-cat">' + catSVG(cat) + '<b>' + cat.name + '</b></div>';
    }).join('');
  }

  function renderLedger() {
    var ledger = readLedger();

    var bestScore = $('#bestScore');
    var bestCombo = $('#bestCombo');
    var runCount = $('#runCount');
    if (bestScore) bestScore.textContent = ledger.best.toLocaleString();
    if (bestCombo) bestCombo.textContent = ledger.bestCombo;
    if (runCount) runCount.textContent = ledger.runs;

    var list = $('#scores');
    if (!list) return;

    if (!ledger.scores.length) {
      list.innerHTML = '<li class="scores-empty">No shifts recorded yet. The ledger is embarrassingly blank. Slap something.</li>';
      return;
    }

    list.innerHTML = ledger.scores.map(function (entry, i) {
      return '<li class="score-row' + (i === 0 ? ' is-best' : '') + '">' +
        '<span class="rank">' + (i + 1) + '</span>' +
        '<span class="rank-line"><b>' + rankFor(entry.score).title + '</b><small>' + formatDate(entry.date) + '</small></span>' +
        '<span class="combo">combo ' + (entry.combo || 0) + '</span>' +
        '<span class="pts">' + Number(entry.score || 0).toLocaleString() + '</span>' +
      '</li>';
    }).join('');
  }

  function observeReveals() {
    var items = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in'); });
      $$('.s-bar i').forEach(function (bar) { bar.style.setProperty('--v', bar.getAttribute('data-v') + '%'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        $$('.s-bar i', entry.target).forEach(function (bar) {
          bar.style.setProperty('--v', bar.getAttribute('data-v') + '%');
        });
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------ game */

  var board = $('#board');
  var orderName = $('#orderName');
  var veil = $('#veil');

  var G = {
    phase: 'intro',
    score: 0,
    combo: 0,
    bestCombo: 0,
    time: TOTAL_TIME,
    target: null,
    tiles: [],
    hits: {},
    lastFrame: 0,
    raf: 0,
    lastTick: 0
  };

  function multiplier() {
    return 1 + Math.min(4, Math.floor(G.combo / 3));
  }

  function buildBoard() {
    if (!board) return;
    board.innerHTML = '';
    G.tiles = [];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < TILE_COUNT; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tile';
      btn.setAttribute('data-index', String(i));
      frag.appendChild(btn);
      G.tiles.push({ el: btn, cat: null });
    }
    board.appendChild(frag);
  }

  function paintAt(index, catId) {
    var tile = G.tiles[index];
    if (!tile) return;
    var cat = CAT_BY_ID[catId];
    if (!cat) return;
    tile.cat = catId;
    tile.el.setAttribute('data-cat', catId);
    tile.el.setAttribute('aria-label', cat.name);
    tile.el.innerHTML = catSVG(cat);
  }

  function idPool(excludeId) {
    return CATS.filter(function (c) { return c.id !== excludeId; }).map(function (c) { return c.id; });
  }

  function forceTarget() {
    var copies = G.tiles.filter(function (t) { return t.cat === G.target.id; }).length;
    var need = 2 + (Math.random() < 0.4 ? 1 : 0);
    if (copies >= need) return;

    var spare = G.tiles
      .map(function (t, i) { return t.cat === G.target.id ? -1 : i; })
      .filter(function (i) { return i >= 0; });

    shuffle(spare);
    for (var k = 0; k < need - copies && k < spare.length; k++) {
      paintAt(spare[k], G.target.id);
    }
  }

  function announceTarget() {
    if (!orderName || !G.target) return;
    orderName.textContent = G.target.name;
    orderName.classList.remove('pop');
    void orderName.offsetWidth;
    orderName.classList.add('pop');
    Voice.say(G.target.name);
  }

  function newTarget(previousId) {
    var options = CATS.filter(function (c) { return c.id !== previousId; });
    return pick(options.length ? options : CATS);
  }

  function dealBoard() {
    var pool = CATS.map(function (c) { return c.id; });
    for (var i = 0; i < TILE_COUNT; i++) paintAt(i, pick(pool));
    G.target = pick(CATS);
    forceTarget();
    announceTarget();
  }

  function updateHud() {
    var scoreEl = $('#hudScore');
    var comboEl = $('#hudCombo');
    var timeEl = $('#hudTime');
    if (scoreEl) scoreEl.textContent = G.score.toLocaleString();
    if (comboEl) comboEl.textContent = 'x' + multiplier();
    if (timeEl) timeEl.textContent = String(Math.ceil(G.time));

    var comboItem = comboEl ? comboEl.parentElement : null;
    if (comboItem) comboItem.classList.toggle('hot', G.combo >= 6);

    var timeItem = timeEl ? timeEl.parentElement : null;
    if (timeItem) timeItem.classList.toggle('danger', G.time <= 10);
  }

  function renderTime() {
    var fill = $('#timerFill');
    if (fill) fill.style.width = ((G.time / TOTAL_TIME) * 100).toFixed(2) + '%';

    var timeEl = $('#hudTime');
    if (timeEl) timeEl.textContent = String(Math.ceil(G.time));

    var timeItem = timeEl ? timeEl.parentElement : null;
    if (timeItem) timeItem.classList.toggle('danger', G.time <= 10);

    var whole = Math.ceil(G.time);
    if (whole <= 3 && whole > 0 && whole !== G.lastTick) {
      G.lastTick = whole;
      Sound.tick();
    }
  }

  function floatText(el, text, negative) {
    var span = document.createElement('span');
    span.className = 'float' + (negative ? ' neg' : '');
    span.textContent = text;
    el.appendChild(span);
    window.setTimeout(function () { span.remove(); }, 800);
  }

  function correct(index) {
    G.combo += 1;
    G.bestCombo = Math.max(G.bestCombo, G.combo);
    var gain = 100 * multiplier();
    G.score += gain;
    G.hits[G.target.id] = (G.hits[G.target.id] || 0) + 1;

    var tile = G.tiles[index];
    tile.el.classList.add('hit');
    window.setTimeout(function () { tile.el.classList.remove('hit'); }, 470);

    var previous = G.target.id;
    G.target = newTarget(previous);

    paintAt(index, pick(idPool(G.target.id)));
    forceTarget();
    floatText(tile.el, '+' + gain);
    announceTarget();
    updateHud();
    Sound.hit(G.combo);
  }

  function wrong(index) {
    var tile = G.tiles[index];
    G.combo = 0;
    G.time = Math.max(0, G.time - 2);

    tile.el.classList.add('miss');
    window.setTimeout(function () { tile.el.classList.remove('miss'); }, 470);
    floatText(tile.el, '-2s', true);

    updateHud();
    renderTime();
    Sound.miss();

    if (G.time <= 0) endGame();
  }

  function onBoardClick(event) {
    if (G.phase !== 'playing') return;
    var btn = event.target.closest ? event.target.closest('.tile') : null;
    if (!btn || !board.contains(btn)) return;
    var index = Number(btn.getAttribute('data-index'));
    var tile = G.tiles[index];
    if (!tile || !G.target) return;
    if (tile.cat === G.target.id) correct(index);
    else wrong(index);
  }

  function loop(ts) {
    if (G.phase !== 'playing') return;
    if (!G.lastFrame) G.lastFrame = ts;
    var dt = Math.min(0.1, (ts - G.lastFrame) / 1000);
    G.lastFrame = ts;

    G.time = Math.max(0, G.time - dt);
    renderTime();

    if (G.time <= 0) {
      endGame();
      return;
    }
    G.raf = window.requestAnimationFrame(loop);
  }

  function showPanel(name) {
    if (!veil) return;
    $$('.panel', veil).forEach(function (panel) {
      panel.classList.toggle('is-active', panel.getAttribute('data-panel') === name);
    });
    veil.classList.remove('is-hidden');
  }

  function hideVeil() {
    if (veil) veil.classList.add('is-hidden');
  }

  var studyTimer = 0;
  var studyLeft = 6;

  function beginStudy() {
    Sound.unlock();
    Music.start();
    Voice.say('Memorise the merchants.');
    showPanel('study');
    studyLeft = 6;

    var countEl = $('#studyCount');
    if (countEl) countEl.textContent = '6';

    window.clearInterval(studyTimer);
    studyTimer = window.setInterval(function () {
      studyLeft -= 1;
      if (countEl) countEl.textContent = String(Math.max(0, studyLeft));
      if (studyLeft <= 0) {
        window.clearInterval(studyTimer);
        startGame();
      }
    }, 1000);
  }

  function startGame() {
    window.clearInterval(studyTimer);
    Sound.unlock();

    G.phase = 'playing';
    G.score = 0;
    G.combo = 0;
    G.bestCombo = 0;
    G.time = TOTAL_TIME;
    G.hits = {};
    G.lastFrame = 0;
    G.lastTick = 0;

    var fill = $('#timerFill');
    if (fill) fill.style.width = '100%';

    dealBoard();
    updateHud();
    renderTime();
    hideVeil();

    window.cancelAnimationFrame(G.raf);
    G.raf = window.requestAnimationFrame(loop);
    Sound.start();
    Music.setMode('battle');
  }

  function mostSlapped() {
    var bestId = null;
    var bestCount = 0;
    Object.keys(G.hits).forEach(function (id) {
      if (G.hits[id] > bestCount) {
        bestCount = G.hits[id];
        bestId = id;
      }
    });
    return bestId ? { name: CAT_BY_ID[bestId].name, count: bestCount } : null;
  }

  function endGame() {
    G.phase = 'over';
    window.cancelAnimationFrame(G.raf);
    G.raf = 0;

    var ledger = readLedger();
    var isBest = G.score > ledger.best;

    ledger.best = Math.max(ledger.best, G.score);
    ledger.bestCombo = Math.max(ledger.bestCombo, G.bestCombo);
    ledger.runs += 1;
    ledger.scores.push({ score: G.score, combo: G.bestCombo, date: Date.now() });
    ledger.scores.sort(function (a, b) { return b.score - a.score; });
    ledger.scores = ledger.scores.slice(0, 5);
    writeLedger(ledger);

    renderLedger();

    var rank = rankFor(G.score);
    var titleEl = $('#overTitle');
    var rankEl = $('#overRank');
    var scoreEl = $('#overScore');
    var comboEl = $('#overCombo');
    var mostEl = $('#overMost');
    var noteEl = $('#overNote');

    if (titleEl) titleEl.textContent = rank.title;
    if (rankEl) rankEl.textContent = rank.line;
    if (scoreEl) scoreEl.textContent = G.score.toLocaleString();
    if (comboEl) comboEl.textContent = String(G.bestCombo);

    var most = mostSlapped();
    if (mostEl) {
      mostEl.textContent = most ? most.name + ' ×' + most.count : '—';
      mostEl.classList.toggle('small', !!most);
    }

    if (noteEl) {
      if (G.score === 0) noteEl.textContent = 'You slapped nobody. Bold strategy.';
      else if (isBest) noteEl.textContent = 'New personal best. The cats are furious.';
      else noteEl.textContent = 'The ledger has been updated. No one is impressed.';
    }

    showPanel('over');
    Sound.end();
    Music.setMode('ambient');
  }

  function primeBoard() {
    var pool = CATS.map(function (c) { return c.id; });
    for (var i = 0; i < TILE_COUNT; i++) paintAt(i, pick(pool));
  }

  /* ----------------------------------------------------------------- wiring */

  function init() {
    renderHero();
    renderMarquee();
    renderRoster();
    renderStudy();
    renderLedger();
    buildBoard();
    primeBoard();
    observeReveals();

    var soundBtn = $('#muteBtn');
    var musicBtn = $('#musicBtn');
    var voiceBtn = $('#voiceBtn');

    function paintToggle(btn, off) {
      if (!btn) return;
      btn.classList.toggle('is-muted', off);
      btn.setAttribute('aria-pressed', off ? 'false' : 'true');
    }

    if (soundBtn) {
      paintToggle(soundBtn, Sound.isMuted());
      soundBtn.addEventListener('click', function () {
        Sound.setMuted(!Sound.isMuted());
        paintToggle(soundBtn, Sound.isMuted());
        if (!Sound.isMuted()) { Sound.unlock(); Sound.hit(1); }
      });
    }

    if (musicBtn) {
      paintToggle(musicBtn, !Music.isEnabled());
      musicBtn.classList.toggle('is-live', Music.isEnabled());
      musicBtn.addEventListener('click', function () {
        Music.setEnabled(!Music.isEnabled());
        var off = !Music.isEnabled();
        paintToggle(musicBtn, off);
        musicBtn.classList.toggle('is-live', !off);
        toast(off ? 'The bazaar falls silent. Somewhere, a cat sighs.' : 'The bazaar starts humming again.');
      });
    }

    if (voiceBtn) {
      paintToggle(voiceBtn, !Voice.isEnabled());
      if (!Voice.isSupported()) {
        voiceBtn.disabled = true;
        voiceBtn.setAttribute('aria-label', 'Voice not available in this browser');
        voiceBtn.title = 'This browser has no voice';
      }
      voiceBtn.addEventListener('click', function () {
        if (!Voice.isSupported()) return;
        Voice.setEnabled(!Voice.isEnabled());
        var off = !Voice.isEnabled();
        paintToggle(voiceBtn, off);
        if (!off) Voice.say('The bazaar will shout the names now.');
      });
    }

    var audioArmed = false;
    function armAudio() {
      if (audioArmed) return;
      audioArmed = true;
      if (Music.isEnabled()) Music.start();
    }
    document.addEventListener('pointerdown', armAudio, { once: true });
    document.addEventListener('keydown', armAudio, { once: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        Music.stop();
        if (Voice.isSupported()) {
          try { window.speechSynthesis.cancel(); } catch (err) { /* ignore */ }
        }
      } else if (audioArmed && Music.isEnabled()) {
        Music.start();
      }
    });

    if (board) board.addEventListener('click', onBoardClick);

    var startBtn = $('#startBtn');
    if (startBtn) startBtn.addEventListener('click', beginStudy);

    var readyBtn = $('#readyBtn');
    if (readyBtn) readyBtn.addEventListener('click', startGame);

    var againBtn = $('#againBtn');
    if (againBtn) againBtn.addEventListener('click', startGame);

    var resetBtn = $('#resetLedger');
    if (resetBtn) {
      var armed = false;
      resetBtn.addEventListener('click', function () {
        if (!armed) {
          armed = true;
          resetBtn.textContent = 'Tap again to erase everything';
          window.setTimeout(function () {
            armed = false;
            resetBtn.textContent = 'Erase the ledger (the cats will notice)';
          }, 4000);
          return;
        }
        writeLedger(blankLedger());
        renderLedger();
        resetBtn.textContent = 'Erase the ledger (the cats will notice)';
        armed = false;
        toast('The ledger is empty. The cats pretend not to care.');
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && G.phase === 'playing') {
        G.time = 0;
        endGame();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
