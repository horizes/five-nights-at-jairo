/* ============================================================
   AUDIO — tudo sintetizado com WebAudio (sem arquivos externos)
   ============================================================ */
const AUDIO = (function () {
  'use strict';

  let ac = null, master = null, nbuf = null, bbuf = null;
  let fan = null, amb = null, breathLoop = null, phoneLoop = null;
  let printerLoop = null, printerTick = null;
  const lightHum = { F: null, B: null };
  let muted = false;
  let mbTimer = null, mbOn = false;

  const ok = () => !!ac && !muted;

  /* ---------------- bootstrap ---------------- */
  function init() {
    if (ac) { if (!frozen && ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 20;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    master = ac.createGain();
    master.gain.value = 0.75;
    master.connect(comp);
    comp.connect(ac.destination);
    nbuf = makeNoise(2.5, false);
    bbuf = makeNoise(2.5, true);
  }

  function makeNoise(sec, brown) {
    const len = Math.max(1, Math.floor(ac.sampleRate * sec));
    const b = ac.createBuffer(1, len, ac.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      else d[i] = w;
    }
    return b;
  }

  /* ---------------- primitivas ---------------- */
  function burst(o) {
    if (!ok()) return;
    o = o || {};
    const dur = o.dur || 0.3, freq = o.freq || 1200, q = o.q || 1;
    const gain = o.gain == null ? 0.4 : o.gain;
    const type = o.type || 'bandpass';
    const delay = o.delay || 0;
    const t0 = ac.currentTime + delay;
    const s = ac.createBufferSource();
    s.buffer = o.brown ? bbuf : nbuf;
    s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (o.slide) f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * o.slide), t0 + dur);
    f.Q.value = q;
    const g = ac.createGain();
    const atk = Math.min(o.attack || 0.008, dur * 0.4);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g);
    if (o.pan != null && ac.createStereoPanner) {
      const p = ac.createStereoPanner();
      p.pan.value = o.pan;
      g.connect(p); p.connect(master);
    } else {
      g.connect(master);
    }
    s.start(t0); s.stop(t0 + dur + 0.08);
  }

  function tone(o) {
    if (!ok()) return;
    o = o || {};
    const dur = o.dur || 0.3, freq = o.freq || 440, gain = o.gain == null ? 0.2 : o.gain;
    const t0 = ac.currentTime + (o.delay || 0);
    const osc = ac.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + Math.min(o.attack || 0.01, dur * 0.5));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    if (o.pan != null && ac.createStereoPanner) {
      const p = ac.createStereoPanner();
      p.pan.value = o.pan;
      g.connect(p); p.connect(master);
    } else {
      g.connect(master);
    }
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function loopNode(mk, gain, fadeIn) {
    if (!ok()) return null;
    const n = mk();
    n.g.gain.setValueAtTime(0.0001, ac.currentTime);
    n.g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), ac.currentTime + (fadeIn || 0.4));
    return n;
  }
  function killNode(n, fade) {
    if (!n || !ac) return;
    const t = ac.currentTime;
    try {
      n.g.gain.cancelScheduledValues(t);
      n.g.gain.setValueAtTime(Math.max(0.0001, n.g.gain.value), t);
      n.g.gain.exponentialRampToValueAtTime(0.0001, t + (fade || 0.25));
      n.s.stop(t + (fade || 0.25) + 0.05);
    } catch (e) { /* ignore */ }
  }
  function srcLoop(buf, type, freq, q) {
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); g.gain.value = 0.0001;
    s.connect(f); f.connect(g); g.connect(master); s.start();
    return { s, f, g };
  }

  /* ---------------- ambiência ---------------- */
  function startRoom() {
    if (!ok()) return;
    if (!fan) {
      fan = loopNode(() => srcLoop(bbuf, 'lowpass', 320, 0.8), 0.09, 1.2);
      // segundo sopro (pás)
      const s2 = ac.createBufferSource(); s2.buffer = nbuf; s2.loop = true;
      const f2 = ac.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 900; f2.Q.value = 0.7;
      const g2 = ac.createGain(); g2.gain.value = 0.0001;
      s2.connect(f2); f2.connect(g2); g2.connect(master); s2.start();
      g2.gain.exponentialRampToValueAtTime(0.018, ac.currentTime + 1.5);
      fan.extra = { s: s2, g: g2 };
    }
    if (!amb) {
      amb = loopNode(() => srcLoop(bbuf, 'lowpass', 120, 1.2), 0.05, 2.0);
    }
  }
  function stopRoom() { killNode(fan); killNode(fan && fan.extra); killNode(amb); fan = null; amb = null; }

  /* ---------------- sons pontuais ---------------- */
  const S = {
    doorDown() {
      burst({ dur: 0.5, freq: 500, q: 0.7, gain: 0.9, type: 'lowpass', slide: 0.25 });
      tone({ freq: 120, to: 34, dur: 0.4, gain: 0.7, type: 'sine' });
      burst({ dur: 0.12, freq: 2600, q: 2, gain: 0.35, delay: 0.02 });
    },
    doorUp() {
      burst({ dur: 0.42, freq: 700, q: 0.8, gain: 0.5, type: 'lowpass', slide: 2.2 });
      tone({ freq: 90, to: 180, dur: 0.3, gain: 0.35, type: 'sawtooth' });
      burst({ dur: 0.1, freq: 1800, q: 2, gain: 0.25, delay: 0.28 });
    },
    click() {
      burst({ dur: 0.035, freq: 3200, q: 1.2, gain: 0.4 });
      tone({ freq: 720, dur: 0.05, gain: 0.12, type: 'square' });
    },
    lightOn() {
      burst({ dur: 0.04, freq: 4200, q: 1, gain: 0.45 });
      tone({ freq: 130, dur: 0.25, gain: 0.16, type: 'sawtooth' });
    },
    lightDie() {
      // "bzzt" — a lâmpada apagando sozinha quando a carga acaba
      if (!ok()) return;
      tone({ freq: 950, to: 120, dur: 0.14, gain: 0.18, type: 'square' });
      burst({ dur: 0.05, freq: 750, q: 2.2, gain: 0.3, delay: 0.02 });
      tone({ freq: 62, to: 36, dur: 0.22, gain: 0.24, delay: 0.09 });
    },
    step() { burst({ dur: 0.16, freq: 180, q: 1.5, gain: 0.35, type: 'lowpass', brown: true }); },
    knock() {
      for (let i = 0; i < 3; i++) {
        burst({ dur: 0.18, freq: 180, q: 1.2, gain: 0.55, type: 'lowpass', delay: i * 0.22, brown: true });
        tone({ freq: 70, to: 44, dur: 0.22, gain: 0.35, delay: i * 0.22 });
      }
    },
    knockDoor(pan, stillThere) {
      // pan: -1 esquerda … 0 centro … +1 direita — posição da porta na perspectiva de quem joga
      // stillThere(): opcional; as batidas 2 e 3 só tocam se o amigo AINDA estiver na porta — evita "batida do nada" depois que ele saiu
      if (pan == null || isNaN(pan)) pan = 0;
      pan = Math.max(-0.9, Math.min(0.9, pan));
      if (!ok()) return;
      for (let i = 0; i < 3; i++) {
        const delayMs = i * 300;
        setTimeout(() => {
          if (stillThere && !stillThere()) return;
          burst({ dur: 0.22, freq: 420, q: 2.4, gain: 0.55, type: 'bandpass', brown: true, delay: 0, pan });
          tone({ freq: 95, to: 52, dur: 0.28, gain: 0.46, type: 'sine', delay: 0, pan });
          burst({ dur: 0.05, freq: 1650, q: 4.0, gain: 0.17, type: 'highpass', delay: 0.004, pan }); // estalo da batida
        }, delayMs);
      }
    },
    footsteps(pan) {
      // passos pesados ecoando no corredor — chegada do amigo (substitui a batida na porta)
      if (pan == null || isNaN(pan)) pan = 0;
      pan = Math.max(-0.9, Math.min(0.9, pan));
      if (!ok()) return;
      for (let i = 0; i < 4; i++) {
        const delayMs = i * 330;
        setTimeout(() => {
          const near = i / 3;                           // o passo vai ficando mais perto
          burst({ dur: 0.2, freq: 145 + near * 65, q: 1.5, gain: 0.36 + near * 0.2, type: 'lowpass', brown: true, delay: 0, pan });
          tone({ freq: 50 + near * 16, to: 33 + near * 12, dur: 0.24, gain: 0.28 + near * 0.14, delay: 0.01, pan });
        }, delayMs);
      }
    },
    stepFar(pan, vol) {
      // passo rústico de bota pesada no corredor — estalo duro, corpo fundo, madeira do piso
      if (pan == null || isNaN(pan)) pan = 0;
      pan = Math.max(-0.9, Math.min(0.9, pan));
      if (!ok()) return;
      const v = vol == null ? 0.5 : Math.max(0.08, Math.min(1, vol));
      const side = walkStepAlt ? -0.15 : 0.15;
      walkStepAlt = !walkStepAlt;
      const p = Math.max(-0.95, Math.min(0.95, pan + side));
      const f = 0.88 + Math.random() * 0.24;
      // estalo duro do salto contra o piso (presença)
      burst({ dur: 0.075, freq: 950 * f, q: 2.6, gain: 0.52 * v, type: 'bandpass', pan: p });
      // batida funda da sola (corpo do passo)
      burst({ dur: 0.14, freq: 190 * f, q: 1.4, gain: 0.58 * v, type: 'lowpass', brown: true, pan: p });
      tone({ freq: 64 * f, to: 44, dur: 0.16, gain: 0.42 * v, type: 'triangle', pan: p });
      // ressonância de madeira do piso (o "tock" rústico)
      burst({ dur: 0.1, freq: 480 * f, q: 4.6, gain: 0.34 * v, type: 'bandpass', pan: p });
      // eco curto e arenoso do corredor
      burst({ dur: 0.3, freq: 240 * f, q: 2.0, gain: 0.13 * v, type: 'lowpass', brown: true, delay: 0.12, pan: p });
    },
    doorCreak() {
      if (!ok()) return;
      tone({ freq: 225, to: 160, dur: 0.5, gain: 0.16, type: 'sawtooth' });
      burst({ dur: 0.3, freq: 750, q: 1.6, gain: 0.12, delay: 0.08 });
    },
    attentionDone() {
      if (!ok()) return;
      tone({ freq: 392, dur: 0.45, gain: 0.13, type: 'sine' });
      tone({ freq: 587.33, dur: 0.8, gain: 0.11, type: 'sine', delay: 0.14 });
    },
    camSwitch() {
      // servo do monitor de câmeras + "clunk" mecânico
      burst({ dur: 0.18, freq: 640, q: 1.1, gain: 0.42, type: 'bandpass', slide: 0.4 });
      tone({ freq: 150, to: 62, dur: 0.16, gain: 0.3, type: 'sine' });
      burst({ dur: 0.07, freq: 2300, q: 2.4, gain: 0.16, delay: 0.19 });
    },
    // pool de 7 músicas (MIDI) — atrai amigos pelas câmeras; variação total (sacola embaralhada)
    lure() {
      if (!ok()) return;
      if (!lureBag.length) {
        // sacola vazia: embaralha todas as músicas e enche de novo
        const bag = LURE_SONGS.map((_, i) => i);
        for (let i = bag.length - 1; i > 0; i--) {
          const j = (Math.random() * (i + 1)) | 0;
          const t = bag[i]; bag[i] = bag[j]; bag[j] = t;
        }
        // garante que a primeira da nova sacola não seja a que acabou de tocar
        if (bag.length > 1 && bag[bag.length - 1] === lastLure) {
          const swap = (Math.random() * (bag.length - 1)) | 0;
          const t = bag[bag.length - 1]; bag[bag.length - 1] = bag[swap]; bag[swap] = t;
        }
        lureBag = bag;
      }
      const idx = lureBag.pop();
      lastLure = idx;
      playLureSong(idx);
      // leve estática por baixo, como alto-falante distante da gráfica
      burst({ dur: 1.1, freq: 1000, q: 1.1, gain: 0.045, type: 'bandpass', brown: true, delay: 0.05 });
    },
    slapBass() {
      // slap seco e quase acústico: triângulo grave + lowpass sem ressonância + decaimento curto
      if (!ok()) return;
      const notes = [41.2, 55.0, 61.74, 73.42, 82.41];  // E1 A1 B1 D2 E2
      const f = notes[(Math.random() * notes.length) | 0];
      const t0 = ac.currentTime;
      const o = ac.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(f, t0);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
      lp.frequency.setValueAtTime(2200, t0);
      lp.frequency.exponentialRampToValueAtTime(300, t0 + 0.22);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.52, t0 + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75);
      o.connect(lp); lp.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + 0.8);
      // estalo de dedo abafado (sem brilho sintético)
      burst({ dur: 0.022, freq: 1400 + Math.random() * 250, q: 3.2, gain: 0.22 });
      // dedo grave por dentro
      tone({ freq: f * 2, dur: 0.3, gain: 0.12, type: 'sine' });
    },
    bang() {
      for (let i = 0; i < 5; i++) {
        burst({ dur: 0.22, freq: 300, q: 0.8, gain: 0.7, type: 'lowpass', delay: i * 0.13 + Math.random() * 0.03 });
        tone({ freq: 90, to: 40, dur: 0.25, gain: 0.5, delay: i * 0.13 });
      }
    },
    foxyRun() {
      for (let i = 0; i < 11; i++) {
        const d = i * 0.085 + (i * i) * 0.0035;
        burst({ dur: 0.13, freq: 220, q: 1.1, gain: 0.45, type: 'lowpass', delay: d, brown: true });
        tone({ freq: 95 + i * 4, to: 55, dur: 0.1, gain: 0.18, delay: d });
      }
      burst({ dur: 0.7, freq: 500, q: 0.5, gain: 0.3, type: 'lowpass', delay: 1.0, slide: 0.2 });
    },
    breath(on) { S.setBreath(on ? 0.7 : 0, 0); },
    setBreath(level, pan) {
      level = Math.max(0, Math.min(1, level || 0));
      pan = Math.max(-1, Math.min(1, pan || 0));
      if (level <= 0.02) {
        if (breathLoop) {
          if (breathLoop.lfo) try { breathLoop.lfo.stop(); } catch (e) {}
          killNode(breathLoop, 0.5);
          breathLoop = null;
        }
        return;
      }
      if (!ok()) return;
      if (!breathLoop) {
        breathLoop = loopNode(() => {
          const n = srcLoop(nbuf, 'bandpass', 620, 0.9);
          const lfo = ac.createOscillator(); lfo.frequency.value = 0.26;
          const lg = ac.createGain(); lg.gain.value = 260;
          lfo.connect(lg); lg.connect(n.f.frequency); lfo.start();
          n.lfo = lfo;
          if (ac.createStereoPanner) {
            const p = ac.createStereoPanner();
            p.pan.value = pan;
            n.g.disconnect();
            n.g.connect(p); p.connect(master);
            n.pan = p;
          }
          return n;
        }, 0.09, 0.8);
      }
      const t = ac.currentTime;
      try {
        breathLoop.g.gain.cancelScheduledValues(t);
        breathLoop.g.gain.setTargetAtTime(0.115 * level, t, 0.08);
        if (breathLoop.pan) breathLoop.pan.pan.setTargetAtTime(pan, t, 0.1);
      } catch (e) { /* ignore */ }
    },
    lightHum(side, on) {
      if (on) {
        if (lightHum[side]) return;
        lightHum[side] = loopNode(() => {
          const s = ac.createOscillator(); s.type = 'sawtooth'; s.frequency.value = 118;
          const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
          const g = ac.createGain(); g.gain.value = 0.0001;
          s.connect(f); f.connect(g); g.connect(master); s.start();
          return { s, f, g };
        }, 0.02, 0.1);
      } else { killNode(lightHum[side], 0.1); lightHum[side] = null; }
    },
    powerDown() {
      tone({ freq: 220, to: 28, dur: 2.2, gain: 0.45, type: 'sawtooth' });
      burst({ dur: 0.8, freq: 600, q: 0.6, gain: 0.5, type: 'lowpass', slide: 0.15 });
      tone({ freq: 55, to: 30, dur: 1.2, gain: 0.5, delay: 0.15 });
    },
    laugh() {
      if (!ok()) return;
      for (let i = 0; i < 4; i++) {
        const f = 150 - i * 12;
        tone({ freq: f, to: f * 0.82, dur: 0.16, gain: 0.16, type: 'sawtooth', delay: i * 0.17 });
        burst({ dur: 0.13, freq: 900, q: 1.4, gain: 0.12, delay: i * 0.17 });
      }
    },
    scream() {
      if (!ok()) return;
      const t0 = ac.currentTime;
      // estalo seco (impacto)
      burst({ dur: 0.22, freq: 300, q: 0.6, gain: 0.9, type: 'lowpass', brown: true });
      tone({ freq: 70, to: 30, dur: 0.4, gain: 0.6, type: 'sine' });
      // O GRITO: harmônicos agudos com vibrato violento (tremor de voz) caindo
      const layers = [920, 1244, 1664, 2217];
      layers.forEach((f, i) => {
        const s = ac.createOscillator(); s.type = i % 2 ? 'square' : 'sawtooth';
        s.frequency.setValueAtTime(f, t0);
        s.frequency.exponentialRampToValueAtTime(f * 0.38, t0 + 1.05);
        // vibrato rápido e forte
        const vib = ac.createOscillator(); vib.frequency.value = 30 + i * 7;
        const vg = ac.createGain(); vg.gain.value = 70 + i * 26;
        vib.connect(vg); vg.connect(s.frequency); vib.start(t0); vib.stop(t0 + 1.1);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.3 - i * 0.045, t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.05);
        s.connect(g); g.connect(master); s.start(t0); s.stop(t0 + 1.1);
      });
      // rasgo de respiração (ar atravessando a garganta)
      burst({ dur: 0.95, freq: 1500, q: 0.32, gain: 0.7, attack: 0.001, slide: 0.5 });
      // guincho de chapa rangendo
      tone({ freq: 2650, to: 700, dur: 0.8, gain: 0.18, type: 'square', delay: 0.06 });
      // abismo grave por baixo de tudo
      burst({ dur: 1.5, freq: 68, q: 0.8, gain: 0.85, type: 'lowpass', brown: true, delay: 0.05 });
      tone({ freq: 56, to: 24, dur: 1.5, gain: 0.55, type: 'sawtooth', delay: 0.05 });
      // eco curto
      burst({ dur: 0.28, freq: 850, q: 0.7, gain: 0.5, type: 'bandpass', delay: 0.5 });
    },
    sixAM() { endingTheme(GOOD_NOTES, { type: 'triangle', gain: 0.16, octGain: 0.05, pad: [130.81, 196.0, 261.63] }); },
    badEnd() { endingTheme(BAD_NOTES, { type: 'sine', gain: 0.155, octGain: 0.045, pad: [110.0, 164.81, 220.0] }); },
    win() {
      const seq = [392, 523.25, 659.25, 783.99, 1046.5];
      seq.forEach((f, i) => tone({ freq: f, dur: 1.1, gain: 0.15, delay: i * 0.18, type: 'triangle' }));
    },
    phoneStatic(on) {
      if (on) {
        if (phoneLoop) return;
        phoneLoop = loopNode(() => srcLoop(nbuf, 'bandpass', 1500, 0.8), 0.05, 0.5);
      } else { killNode(phoneLoop, 0.4); phoneLoop = null; }
    },
    _lastBlip: 0,
    _blipTimer: null,
    phoneBlip(len) {
      if (!ok()) return;
      const now = performance.now();
      if (now - (this._lastBlip || 0) < 350) return;
      this._lastBlip = now;
      // cancela o blip anterior (não acumula)
      if (this._blipTimer) { clearInterval(this._blipTimer); this._blipTimer = null; }
      const n = Math.max(1, Math.min(4, Math.round(len / 6)));
      // toca curto e único (substitui o anterior)
      tone({ freq: 150, to: 110, dur: 0.12, gain: 0.09, type: 'sine' });
      burst({ dur: 0.07, freq: 900, q: 2, gain: 0.04 });
    },
    _ringNode: null,
    ring(on) {
      if (on) {
        if (this._ringNode) return;
        if (!ok()) return;
        // toque agradável: duo de senoides (D5+A5) com tremolo suave — tipo "telefone antigo", um pouco mais chamativo
        this._ringNode = loopNode(() => {
          const o1 = ac.createOscillator(); o1.type = 'sine'; o1.frequency.value = 587.33;
          const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = 880;
          const g1 = ac.createGain(); g1.gain.value = 0.075;
          const g2 = ac.createGain(); g2.gain.value = 0.05;
          const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2600;
          const g = ac.createGain(); g.gain.value = 0.135;
          o1.connect(g1); o2.connect(g2); g1.connect(f); g2.connect(f); f.connect(g); g.connect(master);
          o1.start(); o2.start();
          // tremolo para simular toque de campainha
          const lfo = ac.createOscillator(); lfo.frequency.value = 11;
          const lg = ac.createGain(); lg.gain.value = 0.05;
          lfo.connect(lg); lg.connect(g.gain); lfo.start();
          return { s: o1, o1, o2, f, g, lfo };
        }, 0.095, 0.15);
      } else {
        if (this._ringNode) {
          const n = this._ringNode;
          ['o1', 'o2', 'lfo'].forEach(k => { try { n[k] && n[k].stop(); } catch (e) {} });
          killNode(n, 0.05);
          this._ringNode = null;
        }
      }
    },
    ding() {
      tone({ freq: 880, dur: 0.6, gain: 0.12, type: 'sine' });
      tone({ freq: 1320, dur: 0.5, gain: 0.06, type: 'sine', delay: 0.02 });
    },
    phoneEnd() {
      // sininho suave de despedida quando a ligação termina (D5 → A4 → F4 descendente)
      if (!ok()) return;
      tone({ freq: 587.33, dur: 0.9, gain: 0.11, type: 'sine' });
      tone({ freq: 440, dur: 1.0, gain: 0.09, type: 'sine', delay: 0.22 });
      tone({ freq: 349.23, dur: 1.4, gain: 0.075, type: 'sine', delay: 0.44 });
      tone({ freq: 1174.66, dur: 0.5, gain: 0.035, type: 'sine', delay: 0.0 });
    },
    press() {
      burst({ dur: 0.16, freq: 240, q: 0.9, gain: 0.4, type: 'lowpass', brown: true });
      tone({ freq: 70, to: 46, dur: 0.22, gain: 0.28, type: 'sine' });
    },
    staple() {
      burst({ dur: 0.045, freq: 2800, q: 1.6, gain: 0.4 });
      burst({ dur: 0.075, freq: 320, q: 1, gain: 0.28, type: 'lowpass' });
      tone({ freq: 190, to: 110, dur: 0.07, gain: 0.12, type: 'square' });
    },
    printer(on) {
      if (on) {
        if (printerLoop) return;
        printerLoop = loopNode(() => {
          const n = srcLoop(bbuf, 'lowpass', 420, 1.1);
          const osc = ac.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 76;
          const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
          const og = ac.createGain(); og.gain.value = 0.022;
          osc.connect(f); f.connect(og); og.connect(master); osc.start();
          n.osc = osc; n.og = og;
          return n;
        }, 0.05, 0.3);
        let k = 0;
        printerTick = setInterval(() => {
          if (!ok() || !printerLoop) return;
          k++;
          burst({ dur: 0.05, freq: 1350 + (k % 2) * 380, q: 2.0, gain: 0.045 });
          burst({ dur: 0.07, freq: 210, q: 1.0, gain: 0.055, type: 'lowpass', brown: true });
        }, 265);
      } else {
        if (printerTick) { clearInterval(printerTick); printerTick = null; }
        if (printerLoop) {
          if (printerLoop.osc) try { printerLoop.osc.stop(); } catch (e) {}
          if (printerLoop.og) try { printerLoop.og.disconnect(); } catch (e) {}
          killNode(printerLoop, 0.25);
          printerLoop = null;
        }
      }
    },
    fail() {
      [330, 262, 196, 147].forEach((f, i) => {
        tone({ freq: f, dur: 0.7, gain: 0.14, type: 'triangle', delay: i * 0.18 });
      });
      tone({ freq: 60, to: 32, dur: 1.4, gain: 0.35, type: 'sine', delay: 0.3 });
    }
  };

  /* ---------------- temas de final (grade rítmica única => mesma duração) ---------------- */
  // durações em segundos; ambos os temas usam exatamente a mesma grade
  const END_GRID = [0.55, 0.55, 0.7, 1.5, 0.5, 0.55, 1.9, 0.4, 0.55, 0.7, 1.6, 0.4, 0.5, 0.55, 0.6, 2.3];
  // final bom — mesmo motivo original (C5 E5 G5 C6 B5 G5 D5) desenvolvido com uma segunda frase
  const GOOD_NOTES = [523.25, 659.25, 783.99, 1046.5, 987.77, 783.99, 587.33, 659.25, 783.99, 880.0, 1046.5, 987.77, 880.0, 783.99, 659.25, 523.25];
  // final ruim — mesmo contorno em lá menor, terminando grave e sem resolução feliz
  const BAD_NOTES = [440.0, 523.25, 659.25, 880.0, 830.61, 659.25, 698.46, 659.25, 587.33, 698.46, 659.25, 587.33, 523.25, 493.88, 415.30, 440.0];
  function endingTheme(notes, opt) {
    killNode(fan); killNode(amb); fan = null; amb = null;
    if (!ok()) return;
    let t = 0;
    notes.forEach((f, i) => {
      const d = END_GRID[i];
      tone({ freq: f, dur: d + 0.3, gain: opt.gain, delay: t, type: opt.type, attack: 0.02 });
      tone({ freq: f * 2, dur: Math.max(0.2, d), gain: opt.octGain, delay: t, type: 'sine' });
      t += d;
    });
    const total = t;
    (opt.pad || []).forEach(f => {
      tone({ freq: f, dur: total + 0.4, gain: 0.055, type: 'sine', attack: 0.4 });
      tone({ freq: f * 2, dur: Math.max(0.5, total - 0.5), gain: 0.018, delay: 0.4, type: 'sine' });
    });
  }

  /* ---------------- caixinha de música (power out) ---------------- */
  const MELODY = [
    [0, 659.25], [0.42, 587.33], [0.84, 523.25], [1.26, 587.33],
    [1.68, 659.25], [2.10, 783.99], [2.52, 659.25], [2.94, 587.33],
    [3.36, 523.25], [3.78, 493.88], [4.20, 523.25], [4.62, 587.33],
    [5.04, 523.25], [5.46, 440.0], [5.88, 392.0], [6.30, 440.0]
  ];
  function playMusicBox() {
    if (!ok()) return;
    const t0 = ac.currentTime + 0.1;
    MELODY.forEach(([d, f]) => {
      const t = t0 + d;
      const o = ac.createOscillator(); o.type = 'triangle';
      o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.13, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 1.2);
      const o2 = ac.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2;
      const g2 = ac.createGain();
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.linearRampToValueAtTime(0.035, t + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o2.connect(g2); g2.connect(master);
      o2.start(t); o2.stop(t + 0.7);
    });
  }
  function musicBox(on) {
    if (on) {
      if (mbOn) return;
      mbOn = true;
      const loop = () => {
        if (!mbOn) return;
        playMusicBox();
        const wait = 7200;
        mbTimer = setTimeout(loop, wait);
      };
      loop();
    } else {
      mbOn = false;
      if (mbTimer) clearTimeout(mbTimer);
      mbTimer = null;
    }
  }

  /* ---------------- controle ---------------- */
  let frozen = false; // true enquanto o jogo está pausado — cliques/teclas NÃO devolvem o som
  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.value = muted ? 0 : 0.75;
  }
  function isMuted() { return muted; }
  function stopAll() {
    frozen = false;
    musicBox(false);
    S.ring(false);
    S.phoneStatic(false);
    S.printer(false);
    S.setBreath(0, 0);
    S.lightHum('F', false);
    S.lightHum('B', false);
    stopRoom();
  }
  // congela/restaura TODO o áudio do jogo (pausa) — suspende o AudioContext por completo
  function pauseAll() {
    frozen = true;
    if (ac && ac.state === 'running') { try { ac.suspend(); } catch (e) { /* ignore */ } }
  }
  function resumeAll() {
    frozen = false;
    if (ac && ac.state === 'suspended') { try { ac.resume(); } catch (e) { /* ignore */ } }
  }
  function unlock() { if (frozen) return; if (ac && ac.state === 'suspended') ac.resume(); }

  /* ---------- guitarra sintetizada (Karplus–Strong) + pool de músicas ---------- */
  /* 1.mid a 7.mid decodificados (tempo 365854 µs/q, divisão 96 ticks/q → ~164 BPM) */
  const LURE_SONGS = [
    [ [0, .274, 47], [0, .274, 52], [.366, .183, 47], [.366, .183, 52], [.549, .183, 47], [.549, .183, 52] ],   // 1.mid — power-chord B2+E3 (x3)
    [ [0, .183, 69], [.183, .183, 68], [.366, .366, 64], [.732, .366, 64] ],                               // 2.mid — A4 G#4 E4 E4
    [ [0, .183, 68], [.183, .183, 69], [.366, .366, 64], [.732, .366, 64] ],                               // 3.mid — G#4 A4 E4 E4
    [ [0, .274, 49], [0, .274, 54], [.366, .183, 49], [.366, .183, 54], [.549, .183, 49], [.549, .183, 54] ], // 4.mid — power-chord C#3+F#3 (x3)
    [ [0, .183, 69], [.183, .183, 71], [.366, .366, 64], [.732, .366, 64] ],                               // 5.mid — A4 B4 E4 E4
    [ [0, .183, 71], [.183, .183, 69], [.366, .366, 64], [.732, .366, 64] ],                                // 6.mid — B4 A4 E4 E4
    [ [0, .183, 69], [.183, .183, 71], [.366, .366, 68], [.732, .366, 64] ]                                // 7.mid — A4 B4 G#4 E4
  ];
  let lastLure = -1;                                             // última música tocada (sacola não repete até acabar)
  let walkStepAlt = false;                                       // alterna o passo esquerda/direita
  let lureBag = [];
  /* caixa de música: senoides parciais inharmônicas com decaimento lento e sutil */
  const BELL_PARTIALS = [ { r: 1.0, g: 1.00 }, { r: 2.76, g: 0.42 }, { r: 5.40, g: 0.16 }, { r: 8.93, g: 0.06 } ];
  function bellNote(midi, when, gain, pan) {
    if (!ok()) return;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const out = ac.createGain();
    if (pan != null && ac.createStereoPanner) {
      const p = ac.createStereoPanner(); p.pan.value = pan; out.connect(p); p.connect(master);
    } else {
      out.connect(master);
    }
    BELL_PARTIALS.forEach(({ r, g }) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * r;
      const env = ac.createGain();
      env.gain.setValueAtTime(0.0001, when);
      env.gain.linearRampToValueAtTime(gain * g, when + 0.004);
      env.gain.exponentialRampToValueAtTime(0.0001, when + 2.6);
      o.connect(env); env.connect(out);
      o.start(when);
      o.stop(when + 2.7);
    });
  }
  /* piano elétrico (rhodes) para os power-chords graves — martelo + parciais harmônicos, decaimento médio */
  const RHODES_PARTIALS = [ { r: 1.0, g: 1.00, dur: 2.0 }, { r: 2.0, g: 0.30, dur: 1.5 }, { r: 3.0, g: 0.12, dur: 0.9 }, { r: 4.2, g: 0.05, dur: 0.6 } ];
  function rhodesNote(midi, when, gain, pan) {
    if (!ok()) return;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const out = ac.createGain();
    if (pan != null && ac.createStereoPanner) {
      const p = ac.createStereoPanner(); p.pan.value = pan; out.connect(p); p.connect(master);
    } else {
      out.connect(master);
    }
    // martelo — clique percussivo do ataque
    burst({ dur: 0.025, freq: 1600, q: 1.6, gain: 0.22, delay: Math.max(0, when - ac.currentTime), pan });
    RHODES_PARTIALS.forEach(({ r, g, dur }) => {
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * r;
      const env = ac.createGain();
      env.gain.setValueAtTime(0.0001, when);
      env.gain.linearRampToValueAtTime(gain * g, when + 0.005);
      env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(env); env.connect(out);
      o.start(when);
      o.stop(when + dur + 0.05);
    });
  }
  /* toca a música (índice 0..6) — 1.mid e 4.mid com rhodes, as demais com caixa de música */
  function playLureSong(idx) {
    if (!ok()) return;
    const song = LURE_SONGS[idx];
    if (!song) return;
    const rhodes = (idx === 0 || idx === 3);
    const noteFn = rhodes ? rhodesNote : bellNote;
    const t0 = ac.currentTime + 0.03;
    song.forEach(([t, dur, midi]) => {
      const pan = (Math.random() - 0.5) * 0.5;               // leve variação estéreo por nota
      noteFn(midi, t0 + t, dur > 0.3 ? (rhodes ? 0.34 : 0.30) : (rhodes ? 0.28 : 0.24), pan);
    });
  }

  return {
    init, unlock, setMuted, isMuted, stopAll, pauseAll, resumeAll,
    startRoom, stopRoom, musicBox,
    ...S,
    ring: (...a) => S.ring(...a),
    phoneStatic: (...a) => S.phoneStatic(...a),
    phoneBlip: (...a) => S.phoneBlip(...a)
  };
})();
