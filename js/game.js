/* ============================================================
   GAME — Jairo, o impressor da Gráfica do Jairo.
   Sala das impressões 360°, duas portas (frente e fundos),
   pedidos para imprimir/embalar e sobrevivência até as 6 AM.
   ============================================================ */
const GAME = (function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const stage = $('stage');
  const canvas = $('view');
  const ctx = canvas.getContext('2d');

  const VW = ART.VW, VH = ART.VH;
  const HOUR = 50;                 // segundos por hora
  const NIGHT_LEN = HOUR * 6;
  /* bateria "viciada": gasta bem mais a cada noite (interpolar por dificuldade) */
  function drainRate() {
    const night = S ? (S.night | 0) : 1;
    if (night >= 7) {
      const avg = ['hori', 'akira', 'leo', 're'].reduce((a, k) => a + ((((S.levels || {})[k]) | 0)), 0) / 80; // 0..1
      return 1 / (7 - avg * 3.5);                    // personalizada: até 1/3.5
    }
    return 1 / Math.max(3.4, 8 - (night - 1) * 0.9);   // noite 1: 1/8 · noite 2: 1/7.1 · noite 3: 1/6.2 · noite 4: 1/5.3 · noite 5: 1/4.4 · noite 6: 1/3.5
  }
  const TAU = Math.PI * 2;
  const wrap = a => ART.ROOM.wrap(a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* ---------------- dificuldade ---------------- */
  const AI_TABLE = {
    1: { hori: 0, akira: 2, leo: 1, re: 1 },
    2: { hori: 0, akira: 4, leo: 3, re: 2 },
    3: { hori: 1, akira: 5, leo: 5, re: 3 },
    4: { hori: 2, akira: 7, leo: 7, re: 5 },
    5: { hori: 5, akira: 10, leo: 10, re: 8 },
    6: { hori: 8, akira: 14, leo: 14, re: 13 }
  };

  const QUOTA = { 1: 4, 2: 5, 3: 5, 4: 6, 5: 7, 6: 8, 7: 6 };

  /* curva de dificuldade da campanha:
     1 = tutorial/fácil · 2-3 = médias · 4-5 = bem difíceis · 6 = super difícil */
  const DIFF = {
    1: { mult: 1.00, ai: 1.00, patience: 10.0, atten: 1.5, decay: 1.2, gap: 19 },
    2: { mult: 1.05, ai: 1.15, patience: 8.0,  atten: 2.0, decay: 1.4, gap: 17 },
    3: { mult: 1.12, ai: 1.30, patience: 6.5,  atten: 2.5, decay: 1.7, gap: 15 },
    4: { mult: 1.25, ai: 1.55, patience: 4.8,  atten: 3.5, decay: 2.2, gap: 12 },
    5: { mult: 1.35, ai: 1.75, patience: 3.8,  atten: 4.5, decay: 2.7, gap: 10 },
    6: { mult: 1.45, ai: 2.00, patience: 3.0,  atten: 5.5, decay: 3.4, gap: 7  }
  };
  function diffOf(night) {
    const n = night | 0;
    return DIFF[n] || DIFF[6];
  }
const PRINTERS = ['print1', 'print2', 'print3'];
let lastPrinter = null;

// planta da referência: 9 câmeras, galpão mais distante, sala no centro-sul
// adjacências conforme a planta (mapa): galpão toca recebimento/acabamento/administrativo;
// corredor da frente liga linha de cima (1/2/6) a almoxarifado(3)/cozinha(5) e à porta da FRENTE;
// corredor de trás liga produção(4)/cozinha(5) à porta dos FUNDOS
// 0 GALPÃO(1A) 1 RECEB(1B) 2 ADMIN(1C) 3 ALMOX(2A) 4 PRODUÇÃO(2B) 5 COZINHA(3A) 6 ACAB(3B) 7 CORR-F(4A) 8 CORR-T(4B)
const ROOM_GRAPH = {
  0: [1, 2, 6],
  1: [0, 7],
  2: [0, 7],
  3: [7, 4],
  4: [3, 8],
  5: [7, 8],
  6: [0, 7],
  7: [1, 2, 6, 3, 5, 'F'],
  8: [4, 5, 'B']
};
function pickPrinter() {
  let choice;
  do { choice = PRINTERS[(Math.random() * PRINTERS.length) | 0]; } while (choice === lastPrinter && PRINTERS.length > 1);
  lastPrinter = choice;
  return choice;
}

const FRIEND_LINES = {
  akira: ['Alô, Jairo? É o Akira.', 'Tô indo aí na gráfica. Chego em breve, não me deixa esperando.'],
  leo: ['Oi, Jairo. É o Leo.', 'Vou passar aí hoje. Deixa eu entrar, tá?'],
  hori: ['Jairo, é o Hori.', 'Estou a caminho. Me espera.'],
  re: ['Fala, Jairo. É a Re.', 'Vou aparecer aí. Não fecha a porta na minha cara.']
};
/* falas de balão durante a atenção (aparecem aleatoriamente, com limite por noite) */
const FRIEND_SPEECH = {
  akira: ['Eu como minha própria bosta'],
  leo: ['Robert Plant'],
  hori: ['Oh vey'],
  re: ['Me vê um copão aí']
};
function pickSpeechLine(id) {
  const lines = FRIEND_SPEECH[id] || [];
  if (!lines.length) return '';
  return lines[(Math.random() * lines.length) | 0];
}

/* elenco por noite: 1 = Hori+Akira · 2 = +Re · 3+ = todos, ordem aleatória */
function nightCast(night, levels) {
  if (night >= 7) return Object.keys(levels || {}).filter(id => (levels[id] || 0) > 0);
  if (night >= 3) return ['hori', 'akira', 'leo', 're'];
  if (night === 2) return ['hori', 'akira', 're'];
  return ['hori', 'akira'];
}
function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = r[i]; r[i] = r[j]; r[j] = t;
  }
  return r;
}

  /* pedidos — cada produto tem tempo próprio de impressão e embalagem
     (jobs maiores demoram mais nas duas etapas); a noite multiplica os tempos */
  const ORDERS = [
    { n: 'Cartões de visita', print: 17, pack: 3.7 },
    { n: 'Panfletos do mercado', print: 19, pack: 4.1 },
    { n: 'Etiquetas do estoque', print: 19, pack: 4.0 },
    { n: 'Bloquinhos da farmácia', print: 19, pack: 4.2 },
    { n: 'Talões de nota', print: 22, pack: 4.6 },
    { n: 'Cardápio da lanchonete', print: 22, pack: 4.8 },
    { n: 'Menus do restaurante', print: 24, pack: 4.9 },
    { n: 'Cartazes do show', print: 25, pack: 5.3 },
    { n: 'Convites de casamento', print: 26, pack: 5.8 },
    { n: 'Revista da escola', print: 29, pack: 6.5 }
  ];
  // dificuldade da noite multiplica os tempos (noites avançadas pedem mais do trabalhador)
  function nightJobMult(night, levels) {
    if ((night | 0) >= 7) {
      const avg = ['hori', 'akira', 'leo', 're'].reduce((a, k) => a + (((levels || {})[k]) | 0), 0) / 4;
      return 1 + (avg / 20) * 0.45;             // personalizada: 1.0 … 1.45 (trabalho mais pesado com amigos mais agressivos)
    }
    return diffOf(night).mult;                     // campanha: curva por noite (1,00 … 1,45)
  }

  /* ---------------- ligações do pai ---------------- */
  const PHONE = {
    1: [
      'Alô? Jairo? É o seu pai.',
      'Oi, filho. Tudo bem? Olha, estou te ligando porque sobraram alguns pedidos para amanhã e o pessoal foi embora.',
      'Você é o único aí que sabe operar as impressoras. Pode ficar aí à noite e terminar tudo?',
      'Hoje são {q} pedidos. São 3 impressoras: offset, digital e UV. Cada pedido indica qual usar.',
      'A entrega é para amanhã de manhã. Se der tudo certo, o cliente renova o contrato.',
      'Só isso, viu? Qualquer coisa, me liga de volta.',
      'Boa noite, filho. Obrigado!'
    ],
    2: [
      'Alô, Jairo. Sou eu de novo.',
      'Mais uma noite de pedidos, {q} no total. Mesma coisa de sempre.',
      'Só queria avisar para você não esquecer de imprimir tudo certinho.',
      'Valeu, filho. Boa noite!'
    ],
    3: [
      'Alô. Tudo bem por aí?',
      'Olha, hoje são {q} pedidos. O cliente gosta do seu trabalho.',
      'Tome cuidado, Jairinho, a bateria do seu celular está ficando viciada. Gasta cada vez mais rápido.',
      'Qualquer dúvida é só me ligar. Boa noite, filho.'
    ],
    4: [
      'Alô? Jairo?',
      'Filho, o cliente pediu mais {q} pedidos para amanhã.',
      'Nada de anormal, é só trabalho mesmo. Você dá conta?',
      'Obrigado, viu? Boa noite!'
    ],
    5: [
      'Alô, filho. Como está?',
      'Olha, amanhã é a última entrega do contrato. São {q} pedidos.',
      'Jairinho, preste atenção, a bateria do seu celular VICIOU de vez. Economize bateria esta noite.',
      'Se sair tudo certo, a gráfica renova com a gente.',
      'Você faz um trabalho impecável. Orgulho de você. Boa noite!'
    ],
    6: [
      'Alô? Jairo?',
      'Filho, mais uma noite. São {q} pedidos, como de costume.',
      'Depois dessa, o assunto é seu e do cliente. Você garante.',
      'Bom trabalho, filho. Boa noite!'
    ],
    7: [
      'Alô, Jairo. Aqui é seu pai.',
      'Noite extra, {q} pedidos. O cliente pediu um favor.',
      'Boa sorte, filho. Estou torcendo por você!'
    ]
  };

  /* ---------------- estado ---------------- */
  let S = null;
  let screen = 'title';
  let last = 0;
  let camAnim = false, camMapAnim = 0;   // animação da câmera + proteção contra o mapa sumir no meio dela
  let save = loadSave();
  let helpReturn = 'title';
  let custom = { hori: 0, akira: 0, leo: 0, re: 0 };
  let muted = false;
  let drag = null;
  const keys = {};
  const HUD = {};

  function loadSave() {
    try {
      const raw = localStorage.getItem('fnaj_save');
      if (raw) {
        const s = JSON.parse(raw);
        if (s && typeof s.max === 'number') return s;
      }
    } catch (e) { /* file:// pode bloquear */ }
    return { max: 1, customDone: false, night6: false, backlog: 0 };
  }
  function writeSave() {
    try { localStorage.setItem('fnaj_save', JSON.stringify(save)); } catch (e) {}
  }

  function makeOrders(total) {
    const arr = ORDERS.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    while (arr.length < total) arr.push(ORDERS[(Math.random() * ORDERS.length) | 0]);
    return arr;
  }

  function newDoor() {
    return { closed: false, closedAmt: 0, light: false, char: null, wait: 0, atten: 0, attenNeed: 1.6, enterT: 0, leaving: false, bubbleT: 0, bubbleText: '', bubbleSide: 1, bubbleLift: 1 };
  }

  function newState(night, levels) {
    const quota = QUOTA[night] + (save.backlog || 0);
    const orders = makeOrders(quota);
    const mult = nightJobMult(night, levels);
    // elenco da noite, em ordem aleatória a cada visita
    const cast = nightCast(night, levels);
    const order = shuffle(cast);
    const arrivals = {};
    let ct = 10 + Math.random() * 10;
    const callSchedule = order.map(id => {
      const at = ct;
      ct += 34 + Math.random() * 22;
      return { id, at };
    });
    lastPrinter = null;
    return {
      night, levels, quota, orders, mult,
      t: 0,
      power: 100,
      yaw: 0,
      doors: { F: newDoor(), B: newDoor() },
      chars: {
        akira: { timer: 3.6 + Math.random() * 2.0, pos: null, arrived: false, targetDoor: Math.random() < 0.5 ? 'F' : 'B' },
        leo: { timer: 3.8 + Math.random() * 2.0, pos: null, arrived: false, targetDoor: Math.random() < 0.5 ? 'F' : 'B' },
        hori: { timer: 4.0 + Math.random() * 2.4, pos: null, arrived: false, targetDoor: Math.random() < 0.5 ? 'F' : 'B' }
      },
      re: { stage: 0, timer: 5.5, run: 0, runDelay: 0, blocked: 0, watchT: 0, resolved: false, pos: null, arrived: false, targetDoor: Math.random() < 0.5 ? 'F' : 'B' },
      cast,
      arrivals,
      arrivalNotified: {},
      roaming: { hori: null, akira: null, leo: null, re: null },
      cameras: [[], [], [], [], [], [], [], [], []],
      viewMode: 'room',
      activeCamera: 0,
      friendCall: null,
      friendCallNotified: {},
      callSchedule,
      job: {
        idx: 0, total: quota, step: 'print', progress: 0,
        name: orders[0].n, working: false, done: false, cooldown: 0,
        printer: pickPrinter(), locked: true,
        printTime: orders[0].print * mult, packTime: orders[0].pack * mult
      },
      camGlitchT: 0,
      holdE: false,
      printerOn: false,
      out: { active: false },
      jumping: null,
      shake: 0,
      ended: false,
      objectiveShown: false,
      bubbleCount: 0,
      phone: null,
      ambient: 7 + Math.random() * 8,
      ordersDone: 0,
      quotaDone: false
    };
  }

  /* ---------------- telas ---------------- */
  const SCREENS = ['title', 'night', 'pause', 'over', 'win', 'fail', 'custom', 'help', 'end'];
  function setScreen(name) {
    screen = name;
    SCREENS.forEach(k => {
      const el = $('scr-' + k);
      if (el) el.classList.toggle('hidden', k !== name);
    });
    const keepUI = name === 'play' || name === 'pause';
    $('hud').classList.toggle('hidden', !keepUI);
    const ct = $('camToggle');
    if (ct) ct.classList.toggle('hidden', !keepUI);
    const cbx = $('camBox');
    if (cbx && !camMapAnim) cbx.classList.toggle('show', keepUI && !!S && S.viewMode === 'camera' && !S.out.active);
    if (name !== 'play' && name !== 'pause') {
      $('subtitle').classList.add('hidden');
      const da = $('doorAtten'); if (da) da.classList.add('hidden');
      toast('');
    }
    if (name !== 'play') {
      drag = null;
      stage.classList.remove('dragging');
    }
  }

  function fitStage() {
    const r = stage.getBoundingClientRect();
    if (r.width > 0) stage.style.setProperty('--u', (r.width / 1600) + 'px');
  }

  function flashWhite() {
    const f = $('flash');
    f.style.transition = 'none';
    f.style.opacity = '0.9';
    setTimeout(() => {
      f.style.transition = 'opacity 1.2s ease';
      f.style.opacity = '0';
    }, 60);
  }

  /* ---------------- início ---------------- */
  function startNight(night, levels) {
    AUDIO.init();
    AUDIO.stopAll();
    const lv = levels || AI_TABLE[night] || AI_TABLE[1];
    S = newState(night, Object.assign({}, lv));
    keys.e = false;
    drag = null;
    setScreen('night');
    $('nightNum').textContent = night >= 7 ? 'NOITE PERSONALIZADA' : 'NOITE ' + night;
    const stageEl = document.getElementById('stage');
    if (stageEl) stageEl.classList.remove('jumping');
    // tela preta instantânea — a sala nunca aparece antes da tela de noite
    const blk = $('black');
    if (blk) {
      blk.style.transition = 'none';
      blk.style.opacity = '1';
      void blk.offsetWidth;
      blk.style.transition = '';
    }
    const jb = $('jobBox');
    if (jb) jb.classList.add('hidden'); // PEDIDOS só aparece depois do aviso
    const oc = $('objective');
    if (oc) { oc.classList.add('hidden'); oc.classList.remove('show'); }

    setTimeout(() => {
      if (screen !== 'night' || !S) return;
      setScreen('play');
      $('black').style.opacity = '0';
      AUDIO.startRoom();
      startPhone();
      updateHUD(true);
      toast(night === 1
        ? 'Imprima e embale os pedidos. Sobreviva até as 6.'
        : 'Meta da noite: ' + S.quota + ' pedidos.');
    }, 2500);
  }

  function startPhone() {
    const src = PHONE[S.night] || PHONE[1];
    const lines = src.map(l => l.replace(/\{q\}/g, S.quota).replace(/\{n\}/g, S.night));
    if (!lines.length) return;
    S.phone = { lines, i: 0, t: 0, shown: false, ringing: true, ringT: 0, dotT: 0 };
    $('subtitleText').textContent = 'Celular Tocando';
    $('subtitle').classList.remove('hidden');
    const ab = $('answerBtn');
    if (ab) ab.classList.add('hidden');
    AUDIO.ring(true);
  }

  function advancePhone() {
    if (!S || !S.phone) return;
    const p = S.phone;
    if (p.ringing) {
      // só pode atender após 3s de toque (botão aparece)
      if (p.ringT < 3) return;
      p.ringing = false;
      AUDIO.ring(false);
      AUDIO.phoneStatic(true);
      const ab = $('answerBtn'); if (ab) ab.classList.add('hidden');
      p.shown = true;
      const line = p.lines[0];
      $('subtitleText').textContent = line;
      $('subtitle').classList.remove('hidden');
      p.t = 0;
      p.dur = Math.max(3.0, Math.min(7.6, line.length * 0.06));
      AUDIO.phoneBlip(line.length);
      return;
    }
    // pular: avança e limpa a legenda anterior para não acumular
    p.i++;
    p.shown = false;
    $('subtitleText').textContent = '';
    if (p.i >= p.lines.length) { endPhone(); return; }
  }

  function updatePhone(dt) {
    const p = S.phone;
    if (!p) return;
    if (p.ringing) {
      p.ringT += dt;
      p.dotT = (p.dotT || 0) + dt;
      // etapas da legenda: "Celular Tocando" → "Celular Tocando..." → "Celular Tocando... (seu pai)" (ao fundo do ATENDER)
      if (p.ringT < 3) {
        const dots = Math.min(3, Math.floor(p.dotT / 0.34));
        $('subtitleText').textContent = 'Celular Tocando' + '.'.repeat(dots);
      } else {
        const ab = $('answerBtn');
        if (ab && ab.classList.contains('hidden')) ab.classList.remove('hidden');
        $('subtitleText').textContent = 'Celular Tocando... (seu pai)';
      }
      if (p.ringT >= 10) advancePhone(); // atende sozinho após 10s
      return;
    }
    if (!p.shown) {
      const line = p.lines[p.i];
      if (line == null) { endPhone(); return; }
      $('subtitleText').textContent = line;
      $('subtitle').classList.remove('hidden');
      p.shown = true;
      p.t = 0;
      p.dur = Math.max(3.0, Math.min(7.6, line.length * 0.06));
      AUDIO.phoneBlip(line.length);
    }
    p.t += dt;
    if (p.t >= p.dur) advancePhone();
  }

  /* tempo entre a ligação e a chegada do amigo — diminui conforme a noite avança (e conforme o nível, na personalizada) */
  function arrivalGapFor(id) {
    const night = S.night | 0;
    if (night >= 7) return Math.max(6, 19 - customDiff(id) * 10);   // nível 20 → ~9s
    return diffOf(night).gap;                                             // campanha: diminui a cada noite (19 → 7)
  }

  /* agenda as chegadas dos amigos (primeira ligação só após um respiro variável após o pai) —
     o turno SEMPRE se concretiza, mesmo que o celular morra no meio */
  function scheduleFriendArrivals() {
    if (!S || !S.callSchedule || !S.callSchedule.length) return;
    const base = S.t;
    const firstGap = 26 + Math.random() * 18;
    S.callSchedule.forEach((c, idx) => {
      if (!S.friendCallNotified[c.id]) {
        // o turno SEMPRE se concretiza: as chegadas são espalhadas e cabem antes das 6 AM
        c.at = Math.min(base + firstGap + idx * (46 + Math.random() * 16), NIGHT_LEN - 55);
        S.arrivals[c.id] = Math.min(c.at + arrivalGapFor(c.id) + Math.random() * 4, NIGHT_LEN - 12);
      }
    });
  }

  function endPhone() {
    if (!S) return;
    S.phone = null;
    $('subtitle').classList.add('hidden');
    AUDIO.phoneStatic(false);
    AUDIO.phoneEnd(); // sininho de despedida
    // primeira ligação de amigo só após um respiro variável após o pai
    scheduleFriendArrivals();
    showObjective();
  }

  function showObjective() {
    if (!S) return;
    S.objectiveShown = true;
    const el = $('objective');
    if (!el) return;
    const txt = 'OBJETIVO: imprimir e embalar ' + S.quota + ' pedidos antes das 6 AM';
    el.textContent = txt;
    el.classList.remove('hidden');
    el.classList.add('show');
    // destaca o painel no canto ao mover
    setTimeout(() => {
      if (!S) return;
      el.classList.remove('show');
      // PEDIDOS só aparece depois que o aviso sai da tela
      if (S.job) S.job.locked = false;
      const jb = $('jobBox');
      if (jb) {
        jb.classList.remove('hidden');
        jb.classList.add('flash');
        setTimeout(() => jb.classList.remove('flash'), 1600);
      }
    }, 3200);
  }

  function startFriendCall(id) {
    if (!S) return;
    const lines = FRIEND_LINES[id] || ['Alô, Jairo.'];
    S.friendCall = { id, lines, i: 0, t: 0, shown: false, dur: 0, ringing: true, ringT: 0, dotT: 0 };
    S.friendCallNotified[id] = true;
    const nm = (ART.CHARS[id] && ART.CHARS[id].name) || id;
    $('subtitleText').textContent = 'Celular Tocando';
    $('subtitle').classList.remove('hidden');
    const ab = $('answerBtn');
    if (ab) ab.classList.add('hidden');
    AUDIO.ring(true);
  }

  function endFriendCall() {
    if (!S) return;
    S.friendCall = null;
    $('subtitle').classList.add('hidden');
    AUDIO.phoneEnd(); // sininho de despedida
  }

  /* avança apenas a linha atual da ligação de amigo (mesma lógica da ligação do pai) */
  function advanceFriendCall() {
    if (!S || !S.friendCall) return;
    const c = S.friendCall;
    c.i++;
    c.shown = false;
    if (c.i >= c.lines.length) { endFriendCall(); return; }
    const line = c.lines[c.i];
    const nm = (ART.CHARS[c.id] && ART.CHARS[c.id].name) || c.id;
    $('subtitleText').textContent = nm + ': ' + line;
    $('subtitle').classList.remove('hidden');
    c.shown = true;
    c.t = 0;
    c.dur = Math.max(2.5, Math.min(6, line.length * 0.06));
    AUDIO.phoneBlip(line.length);
  }

  function updateFriendCall(dt) {
    if (!S || !S.friendCall) return;
    const c = S.friendCall;
    if (c.ringing) {
      c.ringT += dt;
      const nm = (ART.CHARS[c.id] && ART.CHARS[c.id].name) || c.id;
      c.dotT = (c.dotT || 0) + dt;
      // etapas da legenda: "Celular Tocando" → "..." → "Celular Tocando... (Nome)" (junto com o botão ATENDER)
      if (c.ringT < 3) {
        const dots = Math.min(3, Math.floor(c.dotT / 0.34));
        $('subtitleText').textContent = 'Celular Tocando' + '.'.repeat(dots);
      } else {
        const ab = $('answerBtn');
        if (ab && ab.classList.contains('hidden')) ab.classList.remove('hidden');
        $('subtitleText').textContent = 'Celular Tocando... (' + nm + ')';
      }
      if (c.ringT >= 10) { // atende sozinho
        c.ringing = false;
        AUDIO.ring(false);
        const ab2 = $('answerBtn'); if (ab2) ab2.classList.add('hidden');
      } else return;
    }
    if (!c.shown) {
      const line = c.lines[c.i];
      if (line == null) { endFriendCall(); return; }
      const nm = (ART.CHARS[c.id] && ART.CHARS[c.id].name) || c.id;
      $('subtitleText').textContent = nm + ': ' + line;
      $('subtitle').classList.remove('hidden');
      c.shown = true;
      c.t = 0;
      c.dur = Math.max(2.5, Math.min(6, line.length * 0.06));
      AUDIO.phoneBlip(line.length);
    }
    c.t += dt;
    if (c.t >= c.dur) {
      c.i++;
      c.shown = false;
      if (c.i >= c.lines.length) endFriendCall();
    }
  }

  /* o que E esta controlando neste frame: trabalho ou atenção de porta — o MAIS centralizado vence.
     Não dá para trabalhar e encarar um amigo ao mesmo tempo */
  function eTarget() {
    if (!S || !S.holdE) return null;
    // trabalho (se a estação necessária está ao alcance)
    const job = S.job;
    let workDist = Infinity;
    if (job && !job.locked && !job.done && !S.jumping && !S.ended) {
      const stationKey = job.step === 'print' ? (job.printer || 'print1') : 'pack';
      const st = ART.ROOM.stations[stationKey];
      const isPrint = stationKey === 'print1' || stationKey === 'print2' || stationKey === 'print3';
      const range = isPrint ? 0.28 : 0.40;
      if (st) {
        const d = Math.abs(wrap(st.angle - S.yaw));
        if (d < range) workDist = d;
      }
    }
    // atenção em porta (se há amigo e porta centralizada)
    let doorDist = Infinity;
    ['F', 'B'].forEach(side => {
      const d = S.doors[side];
      if (!d.char || d.leaving) return;
      const ang = side === 'F' ? 0 : Math.PI;
      const dd = Math.abs(wrap(ang - S.yaw));
      if (dd < 0.42 && dd < doorDist) doorDist = dd;
    });
    if (doorDist === Infinity) return workDist < Infinity ? 'work' : null;
    if (workDist < Infinity) return workDist <= doorDist ? 'work' : 'door';
    return 'door';
  }

  function nearStation(key) {
    if (!S) return false;
    const st = ART.ROOM.stations[key];
    if (!st) return false;
    const isPrint = key === 'print1' || key === 'print2' || key === 'print3';
    return Math.abs(wrap(st.angle - S.yaw)) < (isPrint ? 0.28 : 0.40);
  }

  function usageNow() {
    if (!S || S.out.active) return 0;
    let u = 1; // celular sempre consome (mesmo sem uso)
    if (S.viewMode === 'camera') u++;
    if (S.phone || S.friendCall) u++;
    return u;
  }

  function setPrinter(on) {
    if (!S) return;
    if (!!S.printerOn === !!on) return;
    S.printerOn = !!on;
    AUDIO.printer(!!on);
  }

  function toggleDoor(side) {
    // portas não fecham mais (estilo FNAF sem portas); apenas luz
    return;
  }

  function toggleLight(side) {
    if (!S || screen !== 'play' || S.jumping || S.ended) return;
    const d = S.doors[side];
    d.light = !d.light;
    AUDIO.lightOn();
    AUDIO.lightHum(side, d.light);
    if (d.light && d.char) {
      S.shake = Math.max(S.shake, 9);
      if (Math.random() < 0.55) AUDIO.laugh();
    }
  }

  function tryDoorButton(sx, sy) {
    if (!S) return false;
    for (const side of ['F', 'B']) {
      const D = ART.ROOM.doors[side];
      const px = ART.ROOM.screenX(D.angle, S.yaw) + D.btn;
      if (px < -90 || px > VW + 90) continue;
      if (Math.abs(sx - px) > 54) continue;
      if (Math.abs(sy - D.by[1]) < 54) { toggleLight(side); return true; }
    }
    return false;
  }

  /* o baixo encostado na parede — hitbox exata no contorno (capa, braço e headstock) */
  const BASS_ANGLE = (3740 - 4480) / 815;   // posição do baixo no panorama
  function tryBass(sx, sy) {
    if (!S) return false;
    const px = ART.ROOM.screenX(BASS_ANGLE, S.yaw);
    // transforma o clique para o espaço local do baixo (rotacionado -0.12 rad em torno de (px, 700))
    const dx = sx - px, dy = sy - 700;
    const lx = 0.9928 * dx - 0.1197 * dy;
    const ly = 0.1197 * dx + 0.9928 * dy;
    let hit = false;
    if (Math.abs(lx) <= 16 && ly >= -312 && ly <= -244) hit = true;      // headstock + tarrachas (com folga)
    else if (Math.abs(lx) <= 12 && ly >= -248 && ly <= -140) hit = true; // braço
    else if (Math.abs(lx) <= 34 && ly >= -225 && ly <= -155) hit = true; // topo da capa
    else if (Math.abs(lx) <= 51 && ly >= -158 && ly <= -5) hit = true;   // corpo/capa
    if (!hit) return false;
    AUDIO.slapBass();
    S.shake = Math.max(S.shake || 0, 2);
    return true;
  }

  /* ---------------- IA ---------------- */
  function castHas(id) { return S.cast && S.cast.indexOf(id) !== -1; }
  function aiSpeed(night) { return Math.min(2.2, diffOf(night).ai); }
  /* dificuldade individual (0..1) — usada na noite personalizada (níveis do menu) */
  function customDiff(id) {
    if (!S || (S.night | 0) < 7) return 0;
    return clamp(((S.levels || {})[id] | 0), 0, 20) / 20;
  }
  function interval(id) {
    const base = { hori: 10, akira: 12, leo: 12.5, re: 8.5 }[id] || 11;
    const ai = (S.night | 0) >= 7 ? (0.55 + customDiff(id) * 1.75) : aiSpeed(S.night);
    return Math.max(1.6, base / ai) * (0.75 + Math.random() * 0.6);
  }
  function doorPatience(night, id) {
    if ((night | 0) >= 7 && id) {
      const d = customDiff(id);
      return Math.max(4.4, 9.5 - d * 4.3);      // nível 0 → 9.5s · nível 20 → 5.2s
    }
    return diffOf(night).patience;                    // campanha: curva por noite (10,0s → 3,0s)
  }
  function attenTime(night) { return (night | 0) >= 7 ? 1.5 + (night - 1) * 0.55 : diffOf(night).atten; }
  function attenDecay(night, id) {
    if ((night | 0) >= 7 && id) return 1.15 + customDiff(id) * 2.35;  // nível 0 → 1.15 · nível 20 → 3.5
    return diffOf(night).decay;                                       // campanha: curva por noite (1,2 → 3,4)
  }

  function setCamPos(id, room) {
    if (!S || !S.cameras) return;
    // remove de todas as salas
    for (let i = 0; i < S.cameras.length; i++) {
      const arr = S.cameras[i];
      if (Array.isArray(arr)) {
        const ix = arr.indexOf(id);
        if (ix !== -1) arr.splice(ix, 1);
      } else if (arr === id) {
        S.cameras[i] = null;
      }
    }
    if (room != null && room >= 0 && room < S.cameras.length) {
      if (Array.isArray(S.cameras[room])) {
        if (!S.cameras[room].includes(id)) S.cameras[room].push(id);
      } else {
        S.cameras[room] = id;
      }
    }
    // sincroniza roaming / pos
    if (S.chars[id]) { S.chars[id].pos = room; S.chars[id].arrived = true; }
    if (id === 're' && S.re) { S.re.pos = room; S.re.arrived = true; }
    if (room != null) {
      S.camGlitchT = Math.max(S.camGlitchT || 0, 0.9); // câmeras piscam quando alguém se move
      S.roaming[id] = { room, t: 0, max: 8 + Math.random() * 6, x: (Math.random() * 2 - 1) * 55 };
    }
  }
  function clearFromCameras(id) {
    if (!S || !S.cameras) return;
    for (let i = 0; i < S.cameras.length; i++) {
      const arr = S.cameras[i];
      if (Array.isArray(arr)) {
        const ix = arr.indexOf(id);
        if (ix !== -1) arr.splice(ix, 1);
      } else if (arr === id) S.cameras[i] = null;
    }
    if (S.roaming) S.roaming[id] = null;
    if (S.chars[id]) { /* mantém pos */ }
  }

  /* caminho BFS entre salas e portas ('F' / 'B') */
  function bfsPath(from, to) {
    if (from === to) return [];
    const prev = {}; const seen = {}; seen[from] = true; const q = [from];
    while (q.length) {
      const cur = q.shift();
      const nb = ROOM_GRAPH[cur] || [];
      for (let i = 0; i < nb.length; i++) {
        const n = nb[i];
        if (seen[n]) continue;
        seen[n] = true; prev[n] = cur;
        if (n === to) {
          const path = [to]; let p = cur;
          while (p !== from) { path.unshift(p); p = prev[p]; }
          return path;
        }
        q.push(n);
      }
    }
    return null;
  }

  function pickWanderRoom(exclude) {
    const rooms = [1, 2, 3, 4, 5, 6, 7, 8].filter(r => r !== exclude);
    return rooms[(Math.random() * rooms.length) | 0];
  }

  /* ronda: ao ser repelido, o amigo dá uma volta pela gráfica antes de voltar a
     procurar uma porta — o tamanho da volta VARIA por noite, por dificuldade
     individual e aleatoriamente (não precisa ser a gráfica inteira) */
  function startTour(id) {
    const ch = id === 're' ? S.re : S.chars[id];
    const night = S.night | 0;
    const diff = night >= 7
      ? clamp(((S.levels || {})[id] | 0), 0, 20) / 20   // personalizada: cresce com o nível do amigo (mantém)
      : 1 - Math.min(1, (night - 1) / 5);               // CAMPANHA: começa com rondas MAIORES e diminui a cada noite
    const center = 1 + Math.round(diff * 3);            // campanha: noite 1 → 4 … noite 6 → 1 · personalizada: 1 a 4
    const n = Math.max(1, Math.round(center + (Math.random() * 2 - 1) * 1.6)); // variação aleatória em cada ronda
    const rooms = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(r => r !== ch.pos);
    ch.tour = shuffle(rooms).slice(0, n);
  }

  /* um passo do amigo: em ronda, vai ao próximo cômodo da lista (BFS);
     senão, escolhe a direção e se move em direção a uma porta */
  function stepFriend(id) {
    const ch = id === 're' ? S.re : S.chars[id];
    const pos = ch.pos;
    // ---- ronda pela gráfica ----
    if (ch.tour && ch.tour.length) {
      if (pos === ch.tour[0]) ch.tour.shift();
      if (!ch.tour.length) {
        ch.tour = null; // volta completa; daqui em diante volta a procurar porta como antes
      } else {
        const goal = ch.tour[0];
        const path = (pos == null) ? null : bfsPath(pos, goal);
        if (path && path.length) {
          const next = path[0];
          if (typeof next === 'number') setCamPos(id, next);
        } else {
          ch.tour.shift(); // cômodo inalcançável: pula para o próximo da ronda
        }
        return;
      }
    }
    // ---- comportamento normal (caminhar até uma porta) ----
    const target = ch.targetDoor;
    let next = null;
    const path = (pos == null) ? null : bfsPath(pos, target);
    const pathFollow = Math.min(0.78, 0.55 + ((S.night | 0) - 1) * 0.045); // nas noites avançadas, amigos seguem o caminho direto às portas com mais frequência
    if (path && path.length && Math.random() < pathFollow) next = path[0];
    else {
      const nb = ROOM_GRAPH[pos] || [];
      if (nb.length) next = nb[(Math.random() * nb.length) | 0];
    }
    if (next === 'F' || next === 'B') {
      if (arriveAtDoor(id, next)) clearFromCameras(id);
    } else if (typeof next === 'number') {
      setCamPos(id, next);
    }
  }

  /* o amigo escolhe uma porta-alvo e caminha por ela */
  function wander(id) {
    stepFriend(id);
  }

  function retreat(id, side) {
    const d = S.doors[side];
    if (d.char === id) { d.leaving = true; } // a animação de saída cuida do "char = null" quando terminar
    const ch = id === 're' ? S.re : S.chars[id];
    ch.targetDoor = Math.random() < 0.5 ? 'F' : 'B'; // nova porta a procurar, mas só após a volta
    S.shake = Math.max(S.shake, 3);
    AUDIO.doorCreak();
    AUDIO.attentionDone();
    // recua para a sala vizinha da porta (sem pular salas) e dá uma volta pela gráfica antes de procurar porta de novo
    const near = side === 'F' ? 7 : 8;
    setCamPos(id, near);
    startTour(id);
    ch.timer = Math.max(1.8, interval(id) * 0.55);
  }

  function arriveAtDoor(id, side) {
    const d = S.doors[side];
    if (d.char) return false;
    d.char = id;
    d.wait = 0;
    d.atten = 0;
    d.prox = 0;
    d.enterT = 1;          // sem animação de entrada: o amigo já está na soleira
    d.leaving = false;
    d.attenNeed = (S.night | 0) >= 7
      ? 0.9 + Math.random() * 1.6 + customDiff(id) * 1.35   // amigos mais agressivos exigem mais atenção
      : 0.9 + Math.random() * 1.6 + (S.night - 1) * 0.12;   // cada aparição exige atenção aleatória
    // porta avisa por som: batida na porta
    AUDIO.knockDoor();
    S.shake = Math.max(S.shake, 6);
    return true;
  }

  /* atenção: olhar + segurar E enche a barra; se encher, o amigo recua.
     a atenção decai rápido se o jogador olhar para outro lado ou soltar E */
  function handleDoorWait(id, side, d, dt) {
    if (d.leaving) return; // já está de saída; quem controla a saída é a animação de recuo
    d.wait += dt;
    const angle = side === 'F' ? 0 : Math.PI;
    const watching = Math.abs(wrap(angle - S.yaw)) < 0.42;
    const attending = watching && S.holdE && eTarget() === 'door';
    if (d.atten == null) d.atten = 0;
    if (attending) {
      d.atten = Math.min(1, d.atten + dt / (d.attenNeed || attenTime(S.night)));
      // balão de fala: evento semi-raro — poucas vezes por noite no máximo (texto fica vazio por enquanto)
      if (d.bubbleT <= 0 && (S.bubbleCount || 0) < 5 && Math.random() < dt * 0.10) {
        S.bubbleCount = (S.bubbleCount || 0) + 1;
        d.bubbleT = 2.6;
        d.bubbleText = pickSpeechLine(id);
        d.bubbleSide = Math.random() < 0.5 ? -1 : 1;    // lado varia a cada balão
        d.bubbleLift = 0.85 + Math.random() * 0.4;      // disposição vertical varia também
        AUDIO.phoneBlip(1);
      }
    } else {
      d.atten = Math.max(0, d.atten - dt * attenDecay(S.night, id));
    }
    // proximidade avança apenas quando NÃO está dando atenção — leve progresso do susto
    if (!attending) d.prox = Math.min(1, (d.prox || 0) + dt / (doorPatience(S.night, id) * 0.7));
    if (d.atten >= 1) { retreat(id, side); return; }
    if (d.wait > doorPatience(S.night, id)) triggerJumpscare(id);
  }

  function tickFriend(dt, id) {
    if (!castHas(id)) return;
    const arriveAt = S.arrivals[id];
    if (arriveAt == null || S.t < arriveAt) return;
    const ch = id === 're' ? S.re : S.chars[id];
    if (!ch.arrived) setCamPos(id, 0);
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 'F' : 'B';
      const d = S.doors[side];
      if (d.char === id) { handleDoorWait(id, side, d, dt); return; }
    }
    ch.timer -= dt;
    if (ch.timer <= 0) {
      const t = interval(id);
      ch.timer = (ch.tour && ch.tour.length) ? Math.max(1.8, t * 0.55) : t; // passos da ronda mais rápidos
      wander(id);
    }
  }

  function tickAI(dt) {
    S.cast.forEach(id => { if (!S.jumping) tickFriend(dt, id); });
  }

  function addPower(v) {
    if (!S || S.out.active) return;
    S.power = clamp(S.power + v, 0, 100);
    if (S.power <= 0) phoneOut();
  }

  /* ---------------- bateria do celular / tempo ---------------- */
  /* o celular morre: SOMENTE as ligações, os avisos e o aviso de meta param —
     a gráfica continua funcionando (luzes, portas, impressoras, trabalho) e o TURNO SE COMPLETA:
     se o celular morrer durante a ligação do pai, as chegadas são agendadas assim mesmo e o trabalho libera */
  function phoneOut() {
    if (!S || S.out.active) return;
    S.out.active = true;
    AUDIO.ring(false);
    const ab = $('answerBtn'); if (ab) ab.classList.add('hidden');
    // ligações em andamento caem na hora
    const hadPhoneCall = !!S.phone;
    if (S.phone) { S.phone = null; $('subtitle').classList.add('hidden'); AUDIO.phoneStatic(false); }
    if (S.friendCall) { S.friendCall = null; $('subtitle').classList.add('hidden'); AUDIO.phoneStatic(false); }
    // o pai caiu — mas o turno ainda acontece: agenda chegadas e libera o trabalho
    if (hadPhoneCall && !S.objectiveShown) {
      scheduleFriendArrivals();
      showObjective();
    }
    AUDIO.powerDown();
    toast('Bateria do celular acabou. Sem ligações nem avisos.');
  }

  /* ---------------- pedidos ---------------- */
  function completeOrder() {
    S.ordersDone++;
    S.shake = Math.max(S.shake, 4);
    AUDIO.staple();
    AUDIO.ding();
    if (S.ordersDone >= S.job.total) {
      S.job.done = true;
      S.job.step = 'done';
      S.job.progress = 1;
      S.job.working = false;
      S.quotaDone = true;
      toast('Meta batida! Agora só sobreviva até as 6.');
    } else {
      S.job.step = 'next';
      S.job.progress = 0;
      S.job.cooldown = 1.1;
      S.job.working = false;
      toast('Pedido ' + S.ordersDone + ' de ' + S.job.total + ' embalado.');
    }
    setPrinter(false);
  }

  function updateJob(dt) {
    const job = S.job;
    // nenhum progresso de tarefa durante ligações
    if (job && (S.phone || S.friendCall)) { job.working = false; setPrinter(false); return; }
    if (!job || job.locked) { if (job) job.working = false; return; }

    if (job.done) {
      job.working = false;
      setPrinter(false);
      return;
    }

    if (job.step === 'next') {
      job.working = false;
      setPrinter(false);
      job.cooldown -= dt;
      if (job.cooldown <= 0) {
        job.idx++;
        const o = S.orders[job.idx] || ORDERS[0];
        job.name = o.n;
        job.printTime = o.print * S.mult;
        job.packTime = o.pack * S.mult;
        job.step = 'print';
        job.progress = 0;
        job.printer = pickPrinter();
      }
      return;
    }

    if (S.jumping || S.ended) {
      job.working = false;
      setPrinter(false);
      return;
    }

    const working = eTarget() === 'work';
    job.working = working;

    if (!working) {
      setPrinter(false);
      return;
    }

    if (job.step === 'print') {
      if (!S.printerOn) {
        setPrinter(true);
        AUDIO.press();
      }
      job.progress += dt / (job.printTime || 15);
      if (job.progress >= 1) {
        job.progress = 0;
        job.step = 'pack';
        setPrinter(false);
        AUDIO.staple();
        AUDIO.ding();
        toast('Pedido impresso. Leve para a expedição.');
      }
    } else if (job.step === 'pack') {
      job.progress += dt / (job.packTime || 3.2);
      if (job.progress >= 1) completeOrder();
    }
  }

  /* ---------------- susto / fim ---------------- */
  // botão ATENDER (aparece 3s após o toque começar)
  function bindAnswerBtn() {
    const b = $('answerBtn');
    if (!b) return;
    b.addEventListener('click', () => {
      AUDIO.unlock();
      if (screen === 'play' && S && S.phone && S.phone.ringing) { advancePhone(); return; }
      if (screen === 'play' && S && S.friendCall && S.friendCall.ringing && S.friendCall.ringT >= 3) {
        S.friendCall.ringing = false;
        AUDIO.ring(false);
        b.classList.add('hidden');
      }
    });
  }

  function triggerJumpscare(id, fromPower) {
    if (!S || S.jumping) return;
    AUDIO.ring(false);
    const ab = $('answerBtn'); if (ab) ab.classList.add('hidden');
    S.jumping = { id, t: 0, power: !!fromPower };
    S.holdE = false;
    // desativa TODAS as funcionalidades e esconde o HUD durante o susto
    const stage = document.getElementById('stage');
    if (stage) stage.classList.add('jumping');
    if (S.job) S.job.working = false;
    setPrinter(false);
    AUDIO.setBreath(0, 0);
    AUDIO.musicBox(false);
    AUDIO.stopAll();
    AUDIO.scream();
    $('subtitle').classList.add('hidden');
    toast('');
  }

  function labelNight() {
    return S.night >= 7 ? 'Noite personalizada' : 'Noite ' + S.night;
  }

  function endGame() {
    if (!S) return;
    AUDIO.ring(false);
    const stage = document.getElementById('stage');
    if (stage) stage.classList.remove('jumping');
    const ab = $('answerBtn'); if (ab) ab.classList.add('hidden');
    const mins = Math.min(5, Math.floor(S.t / HOUR));
    const h = mins === 0 ? '12' : String(mins);
    $('overSub').textContent = labelNight() + ' · ' + h + ':00 AM · ' +
      S.ordersDone + '/' + S.quota + ' pedidos';
    setScreen('over');
    S.jumping = null;
    AUDIO.stopAll();
  }

  function endOfNight() {
    if (!S || S.ended) return;
    S.ended = true;
    $('clock').textContent = '6 AM';
    $('subtitle').classList.add('hidden');
    // atividades não finalizadas acumulam para a próxima noite
    const remaining = Math.max(0, S.quota - S.ordersDone);
    save.backlog = (save.backlog || 0) + remaining;
    if (S.night >= 1 && S.night <= 6) {
      save.max = Math.max(save.max, Math.min(6, S.night + 1));
      if (S.night === 6) save.night6 = true;
      writeSave();
    } else if (S.night >= 7) {
      const maxed = ['hori', 'akira', 'leo', 're'].every(k => (S.levels[k] || 0) >= 20);
      if (maxed) { save.customDone = true; writeSave(); }
    }
    winNight();
  }

  function winNight() {
    if (!S) return;
    AUDIO.stopAll();
    const isCustom = S.night >= 7;
    const finalEnding = S.night === 6;
    // no final ruim, melodia triste da mesma duração do tema do final bom
    if (finalEnding && (save.backlog || 0) > 0) AUDIO.badEnd();
    else AUDIO.sixAM();
    setPrinter(false);
    AUDIO.setBreath(0, 0);
    flashWhite();

    const h2 = document.querySelector('#scr-win h2');
    if (finalEnding) {
      const good = (save.backlog || 0) <= 0;
      if (h2) { h2.textContent = good ? '6:00 AM' : 'FIM'; h2.className = good ? 'gold' : 'red'; }
      $('winSub').textContent = good
        ? 'Os seis turnos foram vencidos e todos os pedidos foram entregues.'
        : 'Os pedidos se acumularam... o cliente cancelou o contrato.';
      const menu = document.querySelector('#scr-win .menu');
      if (menu) menu.style.display = 'none';
      setTimeout(() => { if (S && S.ended) { drawEnding(good); setScreen('end'); } }, 4200);
      setTimeout(() => { if (S) setScreen('title'); }, 12500);
    } else {
      if (h2) { h2.textContent = '6:00 AM'; h2.className = 'gold'; }
      const menu = document.querySelector('#scr-win .menu');
      if (menu) menu.style.display = '';
      $('winSub').textContent = (isCustom
        ? 'Noite personalizada sobrevivida'
        : 'Você sobreviveu à Noite ' + S.night) +
        ' — ' + S.ordersDone + '/' + S.quota + ' pedidos' +
        ((save.backlog || 0) > 0 ? ' · ' + save.backlog + ' acumulado(s)' : '');
      if (isCustom && save.customDone) $('winSub').textContent += ' — 20/20/20/20';
    }

    setTimeout(() => { if (S && S.ended) setScreen('win'); }, 1300);
  }

  /* ---------------- telas de final ilustrado ---------------- */
  function drawEnding(good) {
    const c = document.getElementById('endCanvas');
    if (!c) return;
    const g = c.getContext('2d');
    const W = c.width, H = c.height;
    if (good) {
      // amanhecer sobre a gráfica
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#f6c47a'); sky.addColorStop(0.45, '#d67a54'); sky.addColorStop(1, '#2c1a2e');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // sol nascente
      const sg = g.createRadialGradient(W * 0.62, H * 0.47, 8, W * 0.62, H * 0.47, 200);
      sg.addColorStop(0, '#fffbe0'); sg.addColorStop(0.25, '#ffd77a'); sg.addColorStop(1, 'rgba(255,205,120,0)');
      g.fillStyle = sg; g.beginPath(); g.arc(W * 0.62, H * 0.47, 200, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(W * 0.62, H * 0.47, 52, 0, Math.PI * 2); g.fill();
      // chão
      g.fillStyle = '#141a16'; g.fillRect(0, H * 0.74, W, H * 0.26);
      // calçada
      g.fillStyle = '#1f241f'; g.fillRect(0, H * 0.74, W, 10);
      // prédio da gráfica
      g.fillStyle = '#0d1014'; g.fillRect(W * 0.20, H * 0.30, W * 0.60, H * 0.44);
      g.fillStyle = '#141a22'; g.fillRect(W * 0.20, H * 0.66, W * 0.60, 12);
      // letreiro aceso
      g.fillStyle = '#f2c884'; g.font = 'bold 42px "Courier New", monospace'; g.textAlign = 'center';
      g.fillText('GRÁFICA DO JAIRO', W / 2, H * 0.43);
      // janelas acesas (simétricas e alinhadas, livres da porta)
      g.fillStyle = '#ffdc8e';
      [0.255, 0.345, 0.60, 0.695].forEach(fx => g.fillRect(W * fx, H * 0.46, W * 0.045, H * 0.075));
      // porta aberta com luz de dentro
      const dg = g.createLinearGradient(0, H * 0.52, 0, H * 0.74);
      dg.addColorStop(0, '#ffe9a0'); dg.addColorStop(1, '#e0a860');
      g.fillStyle = dg; g.fillRect(W * 0.445, H * 0.52, W * 0.11, H * 0.22);
      $('endTitle').textContent = 'A GRÁFICA SOBREVIVEU';
      $('endCaption').textContent = 'Após seis turnos, Jairo entrega o último pedido. O cliente renova o contrato — e a gráfica segue de portas abertas.';
    } else {
      // noite fria, gráfica fechada
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#020409'); sky.addColorStop(0.55, '#0b1220'); sky.addColorStop(1, '#141c2c');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // lua pálida
      const mg = g.createRadialGradient(W * 0.3, H * 0.18, 4, W * 0.3, H * 0.18, 130);
      mg.addColorStop(0, '#dfe5ec'); mg.addColorStop(0.18, 'rgba(200,210,225,.5)'); mg.addColorStop(1, 'rgba(200,210,225,0)');
      g.fillStyle = mg; g.beginPath(); g.arc(W * 0.3, H * 0.18, 130, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#cfd6df'; g.beginPath(); g.arc(W * 0.3, H * 0.18, 26, 0, Math.PI * 2); g.fill();
      // respingos de chuva
      g.strokeStyle = 'rgba(170,190,210,.16)'; g.lineWidth = 2;
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * W, y = Math.random() * H * 0.7, l = 8 + Math.random() * 16;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y + l); g.stroke();
      }
      // chão molhado
      g.fillStyle = '#05070c'; g.fillRect(0, H * 0.74, W, H * 0.26);
      // prédio apagado
      g.fillStyle = '#0c0e12'; g.fillRect(W * 0.20, H * 0.30, W * 0.60, H * 0.44);
      g.fillStyle = '#161c24'; g.fillRect(W * 0.20, H * 0.66, W * 0.60, 10);
      // letreiro apagado
      g.fillStyle = '#39424c'; g.font = 'bold 42px "Courier New", monospace'; g.textAlign = 'center';
      g.fillText('GRÁFICA DO JAIRO', W / 2, H * 0.43);
      // janelas escuras com pilhas de papel acumuladas dentro
      [0.25, 0.345, 0.60, 0.695].forEach(fx => {
        g.fillStyle = '#141b24'; g.fillRect(W * fx, H * 0.46, W * 0.05, H * 0.075);
        g.fillStyle = '#070a10';
        for (let i = 0; i < 4; i++) g.fillRect(W * fx + 6 + i * 9, H * 0.472 + (i % 2) * 3, 6, 14);
      });
      // janela única, escura, com papéis acumulados dentro
      g.fillStyle = '#131a22'; g.fillRect(W * 0.44, H * 0.50, W * 0.12, H * 0.24);
      g.fillStyle = '#080b10';
      for (let i = 0; i < 6; i++) g.fillRect(W * 0.452 + i * 6, H * 0.60 + Math.sin(i) * 3, 5, 18);
      // placa FECHADA
      g.fillStyle = '#5c1c14'; g.fillRect(W * 0.38, H * 0.55, W * 0.24, H * 0.115);
      g.fillStyle = '#e9dcc4'; g.font = 'bold 24px "Courier New", monospace';
      g.fillText('FECHADA', W / 2, H * 0.628);
      $('endTitle').textContent = 'A GRÁFICA FECHOU';
      $('endCaption').textContent = 'Os pedidos nunca saíram da pilha. Sem prazo e sem contrato, as portas da gráfica não abriram mais.';
    }
  }

  function failNight() {
    if (!S) return;
    AUDIO.stopAll();
    AUDIO.fail();
    setPrinter(false);
    AUDIO.setBreath(0, 0);
    $('failSub').textContent = labelNight() + ' · ' + S.ordersDone + ' de ' + S.quota +
      ' pedidos prontos. O contrato foi perdido.';
    setTimeout(() => { if (S && S.ended) setScreen('fail'); }, 1000);
  }

  /* ---------------- respiração direcional ---------------- */
  function updateBreath() {
    if (!S || S.jumping || S.ended) {
      AUDIO.setBreath(0, 0);
      return;
    }
    let bestL = 0, bestP = 0;
    ['F', 'B'].forEach(side => {
      const d = S.doors[side];
      if (!d.char) return;
      const rel = wrap(ART.ROOM.doors[side].angle - S.yaw);
      const facingAmt = Math.max(0, 1 - Math.abs(rel) / 1.35);
      let lvlB = (d.closed ? 0.35 : 0.55) + 0.4 * facingAmt;
      if (d.light) lvlB *= 0.55;
      if (lvlB > bestL) {
        bestL = lvlB;
        bestP = clamp(rel / 0.9, -1, 1) * (d.closed ? 0.6 : 1);
      }
    });
    AUDIO.setBreath(bestL, bestP);
  }

  /* ---------------- update ---------------- */
  function updatePlay(dt) {
    if (!S) return;

    if (S.jumping) {
      S.jumping.t += dt;
      if (S.jumping.t > 1.75) endGame();
      return;
    }
    if (S.ended) return;

    S.t += dt;
    if (S.camGlitchT > 0) S.camGlitchT = Math.max(0, S.camGlitchT - dt);

    // amigos chegando um por um
    if (!S.arrivalNotified) S.arrivalNotified = {};
    Object.keys(S.arrivals || {}).forEach(id => {
      const at = (S.arrivals[id] != null) ? S.arrivals[id] : Infinity;
    if (!S.arrivalNotified[id] && S.t >= at) {
        S.arrivalNotified[id] = true;
        if (S.power > 10 && !S.out.active) {
          const nm = (ART.CHARS[id] && ART.CHARS[id].name) || id;
          toast(nm + ' chegou — avisa no celular.');
        }
      }
    });

    // rotação pelo teclado
    if (keys.arrowleft) S.yaw = wrap(S.yaw - 2.0 * dt);
    if (keys.arrowright) S.yaw = wrap(S.yaw + 2.0 * dt);

    // animação das portas
    ['F', 'B'].forEach(side => {
      const d = S.doors[side];
      const target = d.closed ? 1 : 0;
      d.closedAmt += (target - d.closedAmt) * Math.min(1, dt * 13);
      if (Math.abs(d.closedAmt - target) < 0.002) d.closedAmt = target;
      // amigo recuando para fora da porta (saída)
      if (d.leaving) {
        d.enterT = Math.max(0, (d.enterT == null ? 1 : d.enterT) - dt / 1.15);
        if (d.enterT === 0 && d.char) {
          d.char = null; d.wait = 0; d.atten = 0; d.prox = 0; d.leaving = false;
        }
      }
      // tempo de vida do balão de fala
      if (d.bubbleT > 0) d.bubbleT = Math.max(0, d.bubbleT - dt);
    });

    updateJob(dt);

    if (S.t >= NIGHT_LEN) { endOfNight(); return; }

    // bateria do CELULAR: só mata as ligações/avisos; a gráfica (trabalho e amigos) continua normal
    S.power -= dt * drainRate() * usageNow();
    if (S.power <= 0) {
      S.power = 0;
      phoneOut();
    }
    tickAI(dt);

    // ligações dos amigos — só após o pai e só após o anterior ter CHEGADO
    // com bateria o amigo avisa; sem bateria chega em silêncio
    if (!S.phone && !S.friendCall && S.callSchedule) {
      for (let i = 0; i < S.callSchedule.length; i++) {
        const c = S.callSchedule[i];
        if (S.friendCallNotified[c.id]) continue;
        const prevOk = i === 0 || (() => {
          const prevId = S.callSchedule[i - 1].id;
          if (!S.friendCallNotified[prevId]) return false;
          const ch = S.chars[prevId];
          if (prevId === 're') return !!(S.re && S.re.arrived);
          return !!(ch && ch.arrived);
        })();
        if (!prevOk) continue;
        if (S.t >= c.at) {
          if (S.power > 10 && !S.out.active) startFriendCall(c.id);
          else S.friendCallNotified[c.id] = true; // sem bateria: chega sem avisar
          break;
        }
      }
    }
    updatePhone(dt);
    updateFriendCall(dt);
    updateBreath();

    // mostra/esconde mapa de câmeras + destaca câmera ativa
    const cb = $('camBox');
    if (cb && !camMapAnim) cb.classList.toggle('show', !!(S && S.viewMode === 'camera' && !S.out.active));
    const tog = $('camToggle');
    if (tog) tog.classList.toggle('hidden', !(screen === 'play'));
    document.querySelectorAll('.camRoom').forEach(b => {
      const v = b.dataset.cam;
      const isActive = S && S.viewMode === 'camera' && String(S.activeCamera) === v;
      b.classList.toggle('active', !!isActive);
    });

    // sons ambientes
    S.ambient -= dt;
    if (S.ambient <= 0) {
      S.ambient = 9 + Math.random() * 16;
      if (Math.random() < 0.55) AUDIO.step();
      else if (Math.random() < 0.4) AUDIO.knock();
    }

    S.shake = Math.max(0, S.shake - dt * 45);
    updateDoorAttenHUD();
    updateHUD();
  }

  /* barra de atenção quando um amigo está na porta */
  function updateDoorAttenHUD() {
    const el = $('doorAtten');
    if (!el) return;
    // só mostra atenção na porta que o jogador está olhando — sem denunciar a outra
    let side = null, fid = null;
    ['F', 'B'].forEach(s => {
      const d = S.doors[s];
      if (!d.char || d.leaving) return;
      const angle = s === 'F' ? 0 : Math.PI;
      if (Math.abs(wrap(angle - S.yaw)) < 0.42) { side = s; fid = d.char; }
    });
    if (!side || S.jumping || S.viewMode === 'camera') {
      el.classList.add('hidden');
      el.classList.remove('phoneOffset');
      return;
    }
    // sobe quando a ligação/telefone está na tela para não sobrepor ATENDER/legenda
    el.classList.toggle('phoneOffset', !!(S.phone || S.friendCall));
    el.classList.remove('hidden');
    const nm = (ART.CHARS[fid] && ART.CHARS[fid].name) || fid;
    $('daName').textContent = nm.toUpperCase() + ' — ' + (side === 'F' ? 'PORTA DA FRENTE' : 'PORTA DE TRÁS');
    const d = S.doors[side];
    const att = d.atten || 0;
    $('daFill').style.width = Math.round(att * 100) + '%';
    el.classList.add('facing');
  }

  function updateHUD(force) {
    if (!S) return;
    const hour = Math.min(6, Math.floor(S.t / HOUR));
    const label = hour === 0 ? '12 AM' : hour + ' AM';
    if (force || HUD.clock !== label) {
      HUD.clock = label;
      $('clock').textContent = label;
    }

    const nightTxt = S.night >= 7 ? 'PERSONALIZADA' : 'NOITE ' + S.night;
    if (force || HUD.night !== nightTxt) {
      HUD.night = nightTxt;
      $('nightLbl').textContent = nightTxt;
    }

    const pw = Math.ceil(S.power);
    if (force || HUD.power !== pw) {
      HUD.power = pw;
      $('powerPct').textContent = pw + '%';
      const f = $('powerFill');
      f.style.width = pw + '%';
      f.className = pw <= 20 ? 'crit' : pw <= 50 ? 'warn' : '';
    }

    const u = usageNow();
    if (force || HUD.usage !== u) {
      HUD.usage = u;
      let bars = '';
      for (let i = 0; i < 3; i++) bars += i < u ? '▮' : '▯';
      $('usageBars').textContent = bars;
    }

    const job = S.job;
    const count = S.ordersDone + '/' + (job ? job.total : S.quota);
    if (force || HUD.count !== count) {
      HUD.count = count;
      $('jobCount').textContent = count;
    }

    let name = '—', stepTxt = '', fill = 0;
    if (job) {
      name = job.name || '—';
      if (job.done) {
        stepTxt = 'META BATIDA · sobreviva até as 6';
        fill = 1;
      } else if (job.step === 'next') {
        stepTxt = 'Preparando o próximo pedido...';
      } else if (job.step === 'print') {
        stepTxt = '1/2 · Segure E na impressora';
        fill = job.progress;
      } else {
        stepTxt = '2/2 · Segure E na expedição';
        fill = job.progress;
      }
    }
    if (force || HUD.name !== name) {
      HUD.name = name;
      $('jobName').textContent = name;
    }
    if (force || HUD.step !== stepTxt) {
      HUD.step = stepTxt;
      $('jobStep').textContent = stepTxt;
    }
    const pct = Math.round(fill * 100);
    if (force || HUD.fill !== pct) {
      HUD.fill = pct;
      $('jobFill').style.width = pct + '%';
    }
    const done = !!(job && job.done);
    if (force || HUD.done !== done) {
      HUD.done = done;
      $('jobBox').classList.toggle('done', done);
    }
  }

  /* ---------------- render ---------------- */
  function render(t) {
    const rt = screen === 'pause' && pauseT != null ? pauseT : t;   // pausa congela todas as animações
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VW, VH);
    // sincroniza visibilidade do mapa de câmeras
    const cb = $('camBox');
    if (cb && S && !camMapAnim) cb.classList.toggle('show', S.viewMode === 'camera' && !S.out.active);

    if (!S || screen === 'title' || screen === 'custom' || (screen === 'help' && !S)) {
      ART.drawTitle(ctx, rt);
      return;
    }

    if (screen === 'night') {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, VW, VH);
      return;
    }

    if (S.jumping) {
      ART.drawJumpscare(ctx, S.jumping.id, S.jumping.t);
      return;
    }

    if (S.viewMode === 'camera') {
      ART.drawCamera(ctx, S, S.activeCamera, rt);
    } else {
      ART.drawRoom(ctx, {
        yaw: S.yaw,
        doors: S.doors,
        job: S.job,
        shake: S.shake,
        roaming: S.roaming
      }, rt);
    }
  }

  /* ---------------- loop ---------------- */
  function loop(now) {
    const t = now / 1000;
    const dt = Math.min(0.05, last ? t - last : 0.016);
    last = t;
    if (screen === 'play' && S) updatePlay(dt);
    render(t);
    requestAnimationFrame(loop);
  }

  /* ---------------- eventos ---------------- */
  function bind() {
    document.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        AUDIO.init();
        handleAct(btn.dataset.act);
      });
    });

    // clique na legenda pula a ligação — mas só DEPOIS de atender (na tela de "atende?" não pula nada)
    $('subtitle').addEventListener('pointerdown', e => {
      AUDIO.unlock();
      if (screen === 'play' && S && S.phone && !S.phone.ringing) {
        e.stopPropagation();
        advancePhone();
      } else if (screen === 'play' && S && S.friendCall && !S.friendCall.ringing) {
        e.stopPropagation();
        advanceFriendCall();
      }
    });

    function canvasPoint(e) {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * VW,
        y: ((e.clientY - r.top) / r.height) * VH
      };
    }

    stage.addEventListener('pointerdown', e => {
      AUDIO.unlock();
      if (screen !== 'play' || !S || S.jumping || S.ended) return;
      // não iniciar drag ao clicar em botões da interface
      if (e.target && (e.target.closest('button') || e.target.closest('#camBox') || e.target.closest('#camToggle'))) {
        return;
      }
      const p = canvasPoint(e);
      if (tryDoorButton(p.x, p.y)) {
        e.preventDefault();
        return;
      }
      if (tryBass(p.x, p.y)) {
        e.preventDefault();
        return;
      }
      drag = { id: e.pointerId, x: e.clientX };
      stage.classList.add('dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
    });

    stage.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id || !S) return;
      const r = canvas.getBoundingClientRect();
      const dx = (e.clientX - drag.x) * (VW / r.width);
      drag.x = e.clientX;
      S.yaw = wrap(S.yaw - dx / ART.ROOM.pprad);
    });

    function endDrag(e) {
      if (drag && e.pointerId !== drag.id) return;
      drag = null;
      stage.classList.remove('dragging');
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);

    window.addEventListener('keydown', e => {
      AUDIO.unlock();
      const k = e.key.toLowerCase();

      if (k === 'c') {
        if (S && screen === 'play' && !S.jumping && !S.ended) {
          S.viewMode = (S.viewMode === 'camera') ? 'room' : 'camera';
          if (S.viewMode === 'camera' && S.activeCamera == null) S.activeCamera = 0;
          toast(S.viewMode === 'camera' ? 'Câmeras abertas' : 'Voltando à sala');
        }
        return;
      }
      if (k === 'm') {
        muted = !muted;
        AUDIO.setMuted(muted);
        toast(muted ? 'Som desligado' : 'Som ligado');
        return;
      }

      if (k === 'escape') {
        if (screen === 'play' && S && !S.jumping) pauseGame();
        else if (screen === 'pause') resumeGame();
        else if (screen === 'help') setScreen(helpReturn);
        else if (screen === 'custom') setScreen('title');
        return;
      }

      if (screen !== 'play' || !S || S.jumping || S.ended) return;

      if (k === 'arrowleft' || k === 'arrowright') {
        e.preventDefault();
        keys[k] = true;
        return;
      }
      if (k === ' ' || k === 'spacebar') {
        e.preventDefault();
        if (S.phone) advancePhone();
        else if (S.friendCall && S.friendCall.ringing && S.friendCall.ringT >= 3) {
          S.friendCall.ringing = false;
          AUDIO.ring(false);
          const ab = $('answerBtn'); if (ab) ab.classList.add('hidden');
        } else if (S.friendCall && !S.friendCall.ringing) {
          advanceFriendCall();
        }
        return;
      }
      if (k === 'e') {
        e.preventDefault();
        S.holdE = true;
        return;
      }
      if (k === 's') { toggleLight('F'); return; }
      if (k === 'l') { toggleLight('B'); return; }
    });

    window.addEventListener('keyup', e => {
      const k = e.key.toLowerCase();
      keys[k] = false;
      if (k === 'e' && S) S.holdE = false;
    });

    window.addEventListener('blur', () => {
      Object.keys(keys).forEach(k => { keys[k] = false; });
      if (S) S.holdE = false;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && screen === 'play' && S && !S.jumping) pauseGame();
    });

    window.addEventListener('resize', fitStage);

    // câmeras — abertura animada (monitor subindo pela base);
    // o mapa da sala é parte da MESMA tela: aparece e some exatamente junto com o canvas
    function camMapTo(preset) {
      const cb = $('camBox');
      if (!cb) return;
      if (preset === 'hide') cb.classList.remove('show');
      else if (preset === 'show') {
        // sem bateria: o mapa NUNCA aparece (celular morto)
        if (S && S.out.active) cb.classList.remove('show');
        else cb.classList.add('show');
      }
    }
    function applyCamVisual() {
      document.querySelectorAll('.camRoom').forEach(b => {
        b.classList.toggle('active', !!(S && S.viewMode === 'camera' && String(S.activeCamera) === b.dataset.cam));
      });
      const cb = $('camBox');
      if (cb && !camMapAnim) cb.classList.toggle('show', !!(S && S.viewMode === 'camera' && !S.out.active));
    }
    function playCamWipe(opening) {
      camAnim = true;
      camMapAnim = 1;
      AUDIO.camSwitch();
      const w = $('camWipe');
      const applyState = () => {
        if (opening) {
          S.viewMode = 'camera';
          if (S.activeCamera == null) S.activeCamera = 0;
        } else {
          S.viewMode = 'room';
        }
        applyCamVisual();
      };
      if (!w) { applyState(); camMapTo(opening ? 'show' : 'hide'); camAnim = false; camMapAnim = 0; return; }
      if (opening) {
        // ABRIR: monitor sobe de baixo; no mesmo instante em que ele revela a câmera, o mapa entra junto
        camMapTo('hide');
        w.classList.remove('out', 'fade', 'hold', 'cover'); void w.offsetWidth; w.classList.add('in');
        setTimeout(() => { applyState(); camMapTo('show'); w.classList.add('fade'); }, 220);
        setTimeout(() => { w.classList.remove('in', 'fade'); camAnim = false; camMapAnim = 0; }, 600);
      } else {
        // FECHAR (reversa): o mapa some junto com a cortina que cobre a tela; a sala entra por baixo
        camMapTo('hide');
        w.classList.remove('in', 'out', 'fade', 'cover'); w.classList.add('hold');
        void w.offsetWidth;
        w.classList.remove('hold'); w.classList.add('cover');
        setTimeout(() => { applyState(); }, 200);
        setTimeout(() => { w.classList.remove('cover'); w.classList.add('out'); }, 260);
        setTimeout(() => { w.classList.remove('out'); camAnim = false; camMapAnim = 0; }, 600);
      }
    }

    const camToggle = $('camToggle');
    if (camToggle) camToggle.addEventListener('click', () => {
      if (!S || S.jumping || S.ended || camAnim) return;
      playCamWipe(S.viewMode !== 'camera');
    });

    document.querySelectorAll('.camRoom').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!S || S.jumping || S.ended) return;
        const n = parseInt(btn.dataset.cam, 10) || 0;
        if (S.viewMode === 'camera' && S.activeCamera === n) return;
        S.viewMode = 'camera';
        S.activeCamera = n;                 // troca instantânea, com um piscar de tela
        applyCamVisual();
        AUDIO.click();
        const bl = $('camBlink');
        if (bl) { bl.classList.remove('go'); void bl.offsetWidth; bl.classList.add('go'); }
      });
    });

    buildCustom();
  }

  let pauseT = null;
  function pauseGame() {
    if (!S) return;
    S.holdE = false;
    if (S.job) S.job.working = false;
    setPrinter(false);
    AUDIO.setBreath(0, 0);
    AUDIO.pauseAll();
    pauseT = performance.now() / 1000;
    const stg = document.getElementById('stage');
    if (stg) stg.classList.add('gamepaused');
    setScreen('pause');
  }

  function resumeGame() {
    if (screen === 'pause') {
      AUDIO.resumeAll();
      const stg = document.getElementById('stage');
      if (stg) stg.classList.remove('gamepaused');
      pauseT = null;
      setScreen('play');
    }
  }

  function handleAct(act) {
    switch (act) {
      case 'continue':
        startNight(save.max || 1);
        break;
      case 'new':
        save = { max: 1, customDone: save.customDone, night6: save.night6, backlog: 0 };
        writeSave();
        startNight(1);
        break;
      case 'custom':
        setScreen('custom');
        refreshCustom();
        break;
      case 'help':
        helpReturn = screen === 'pause' ? 'pause' : screen === 'custom' ? 'custom' : 'title';
        setScreen('help');
        break;
      case 'help-back':
        setScreen(helpReturn);
        break;
      case 'resume':
        resumeGame();
        break;
      case 'quit':
        quitToMenu();
        break;
      case 'retry':
        if (S) startNight(S.night, S.levels);
        else startNight(1);
        break;
      case 'next':
        if (S && S.night >= 6 && S.night < 7) { setScreen('title'); break; }
        else if (S && S.night >= 7) startNight(7, Object.assign({}, custom));
        else startNight(Math.min(6, (S ? S.night : 1) + 1));
        break;
      case 'cust-start':
        startNight(7, Object.assign({}, custom));
        break;
      case 'cust-reset':
        custom = { hori: 0, akira: 0, leo: 0, re: 0 };
        refreshCustom();
        break;
      case 'cust-max':
        custom = { hori: 20, akira: 20, leo: 20, re: 20 };
        refreshCustom();
        break;
    }
  }

  function quitToMenu() {
    AUDIO.stopAll();
    const ab = $('answerBtn'); if (ab) ab.classList.add('hidden');
    if (S) { S.holdE = false; S.printerOn = false; }
    S = null;
    drag = null;
    Object.keys(keys).forEach(k => { keys[k] = false; });
    setScreen('title');
    refreshTitle();
  }

  function refreshTitle() {
    const cont = document.querySelector('[data-act="continue"]');
    if (cont) cont.classList.toggle('hidden', !save.max || save.max <= 1);
  }

  /* ---------------- noite personalizada ---------------- */
  function buildCustom() {
    const grid = $('custGrid');
    if (!grid) return;
    grid.innerHTML = '';
    ['hori', 'akira', 'leo', 're'].forEach(id => {
      const row = document.createElement('div');
      row.className = 'custRow';
      const nm = document.createElement('div');
      nm.className = 'custName';
      nm.textContent = ART.CHARS[id].name;
      const sl = document.createElement('input');
      sl.type = 'range'; sl.min = '0'; sl.max = '20'; sl.step = '1';
      sl.value = custom[id];
      sl.dataset.char = id;
      const vl = document.createElement('div');
      vl.className = 'custVal';
      vl.textContent = custom[id];
      sl.addEventListener('input', () => {
        custom[id] = parseInt(sl.value, 10) || 0;
        vl.textContent = custom[id];
        refreshCustom();
      });
      row.appendChild(nm); row.appendChild(sl); row.appendChild(vl);
      grid.appendChild(row);
    });
  }

  function refreshCustom() {
    document.querySelectorAll('#custGrid input[type=range]').forEach(sl => {
      sl.value = custom[sl.dataset.char];
      const v = sl.parentElement.querySelector('.custVal');
      if (v) v.textContent = custom[sl.dataset.char];
    });
    const p = $('custPreset');
    if (p) p.textContent = [custom.hori, custom.akira, custom.leo, custom.re].join(' / ');
  }

  /* ---------------- toast ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $('toast');
    if (!el) return;
    if (!msg) { el.classList.add('hidden'); return; }
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 2600);
  }

  /* ---------------- init ---------------- */
  let inited = false;
  function init() {
    if (inited) return; // liga bindings uma única vez (load + chamadas extras não duplicam listeners)
    inited = true;
    fitStage();
    bind();
    bindAnswerBtn();
    refreshTitle();
    setScreen('title');
    $('black').style.opacity = '0';
    requestAnimationFrame(loop);
  }

  return {
    init,
    startNight,
    get state() { return S; },
    get screen() { return screen; },
    _tick: dt => { if (screen === 'play' && S) updatePlay(dt); },
    _render: render,
    _setScreen: setScreen,
    _aim: yaw => { if (S) S.yaw = wrap(yaw); },
    _hold: v => { if (S) S.holdE = !!v; }
  };
})();

// executa assim que o script carrega (o HTML já está parseado — os scripts estão no fim do <body>)
// não dependemos do evento "load", que pode atrasar indefinidamente se algum recurso de rede ficar pendurado
GAME.init();
window.addEventListener('load', () => GAME.init());
