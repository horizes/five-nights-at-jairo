/* ============================================================
   ART-CORE — utilidades de desenho e os mascotes
   ============================================================ */
const ART = {};

(function (A) {
  'use strict';

  A.VW = 1600;
  A.VH = 900;

  /* ---------------- utilidades ---------------- */
  A.cv = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };

  A.rgb = function (hex) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  A.shade = function (hex, k) {
    const c = A.rgb(hex);
    const f = v => Math.max(0, Math.min(255, Math.round(v * (k == null ? 1 : k))));
    return `rgb(${f(c[0])},${f(c[1])},${f(c[2])})`;
  };
  A.rgba = function (hex, a) {
    const c = A.rgb(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  };
  A.rr = function (g, x, y, w, h, r) {
    r = Math.min(r == null ? 8 : r, Math.abs(w) / 2, Math.abs(h) / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  A.ell = function (g, x, y, rx, ry, rot) {
    g.beginPath();
    g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
  };
  A.poly = function (g, pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  };
  A.cap = function (g, x1, y1, x2, y2, w, col) {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  };
  A.lin = function (g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(s => gr.addColorStop(s[0], s[1]));
    return gr;
  };
  A.rad = function (g, x, y, r0, r1, stops) {
    const gr = g.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(s => gr.addColorStop(s[0], s[1]));
    return gr;
  };
  A.rnd = function (a, b) { return a + Math.random() * (b - a); };
  A.pick = function (arr) { return arr[(Math.random() * arr.length) | 0]; };
  A.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  A.lerp = function (a, b, t) { return a + (b - a) * t; };

  // PRNG determinístico (para detalhes fixos dos personagens)
  A.seedRand = function (seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  A.hash = hash;

  /* ---------------- grão / estática ---------------- */
  let grainTile = null;
  function makeGrainTile(size, amt) {
    const c = A.cv(size, size);
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() < 0.5 ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = Math.random() * amt;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  A.grain = function (g, w, h, alpha, ox, oy) {
    if (!grainTile) grainTile = makeGrainTile(512, 34);
    g.save();
    g.globalAlpha = alpha;
    const offx = -((ox || 0) % 512), offy = -((oy || 0) % 512);
    for (let y = offy; y < h; y += 512) {
      for (let x = offx; x < w; x += 512) g.drawImage(grainTile, x, y);
    }
    g.restore();
  };
  A.staticNoise = function (g, w, h, alpha) {
    // estática forte: pedaços de ruído
    g.save();
    for (let y = 0; y < h; y += 16) {
      for (let x = 0; x < w; x += 16) {
        if (Math.random() < 0.06) {
          g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.6)';
          g.fillRect(x, y, 16, 16);
        }
      }
    }
    g.globalAlpha = alpha;
    g.restore();
  };
  A.vignette = function (g, w, h, strength) {
    const s = strength == null ? 0.85 : strength;
    g.fillStyle = A.rad(g, w / 2, h * 0.47, Math.min(w, h) * 0.34, Math.max(w, h) * 0.74, [
      [0, 'rgba(0,0,0,0)'],
      [0.62, 'rgba(0,0,0,0.22)'],
      [1, `rgba(0,0,0,${s})`]
    ]);
    g.fillRect(0, 0, w, h);
  };
  A.scanlines = function (g, w, h, alpha) {
    g.save();
    g.fillStyle = `rgba(0,0,0,${alpha == null ? 0.16 : alpha})`;
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1.4);
    g.restore();
  };
  A.text = function (g, str, x, y, o) {
    o = o || {};
    g.save();
    g.font = o.font || 'bold 40px "Courier New", monospace';
    g.fillStyle = o.color || '#ddd';
    g.textAlign = o.align || 'center';
    g.textBaseline = o.baseline || 'middle';
    if (o.alpha != null) g.globalAlpha = o.alpha;
    if (o.shadow) {
      g.shadowColor = o.shadow;
      g.shadowBlur = o.blur || 18;
    }
    if (o.spacing) {
      const chars = str.split('');
      let total = 0;
      chars.forEach(ch => total += g.measureText(ch).width + o.spacing);
      let cx = x - total / 2;
      g.textAlign = 'left';
      chars.forEach(ch => {
        g.fillText(ch, cx, y);
        cx += g.measureText(ch).width + o.spacing;
      });
    } else {
      g.fillText(str, x, y);
    }
    g.restore();
  };

  /* ---------------- personagens ---------------- */
  A.CHARS = {
    hori: { name: 'Hori', species: 'amigo', role: 'líder', eye: '#ff3b30', accent: '#9c3535', body: '#1A1A1A', dark: '#111', muzzle: '#F5E6D3', paw: '#D9C3A5' },
    akira: { name: 'Akira', species: 'amiga', role: 'silenciosa', eye: '#ff9a2e', accent: '#8d4aa6', body: '#1A1A1A', dark: '#111', muzzle: '#FAD6A5', paw: '#E8A87C' },
    leo: { name: 'Leo', species: 'amigo', role: 'barulhento', eye: '#ffd23f', accent: '#c2571f', body: '#1A1A1A', dark: '#111', muzzle: '#EAC9A8', paw: '#D4A373' },
    re: { name: 'Re', species: 'amigo', role: 'o corredor', eye: '#f6f1e4', accent: '#26262a', body: '#00529F', dark: '#111', muzzle: '#DEB887', paw: '#C19A6B' }
  };

  // detalhes determinísticos (manchas, rasgos)
  const DETAILS = {};
  Object.keys(A.CHARS).forEach((id, i) => {
    const R = A.seedRand(hash(id) + i * 99);
    const arr = [];
    for (let k = 0; k < 14; k++) {
      arr.push({ x: (R() - 0.5) * 110, y: -R() * 230 - 10, r: 3 + R() * 9, a: 0.06 + R() * 0.14 });
    }
    DETAILS[id] = arr;
  });

  function drawEye(g, ch, x, y, r, o, bright, sil, closed) {
    const glow = o.glow !== false;
    if (closed) {
      g.strokeStyle = sil ? '#000' : A.shade(ch.dark, 0.7);
      g.lineWidth = r * 0.55;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - r, y);
      g.quadraticCurveTo(x, y + r * 0.7, x + r, y);
      g.stroke();
      return;
    }
    // órbita
    g.fillStyle = sil ? '#040507' : A.shade(ch.muzzle, 0.28 * bright);
    A.ell(g, x, y, r * 1.3, r * 1.22); g.fill();

    if (!sil) {
      const sg = A.rad(g, x, y - r * 0.25, 0, r * 1.1, [
        [0, A.shade('#f3eee2', bright)],
        [1, A.shade('#b9b2a4', bright)]
      ]);
      g.fillStyle = sg;
      A.ell(g, x, y, r, r * 0.94); g.fill();
    }
    // íris
    g.fillStyle = sil ? A.rgba(ch.eye, 0.95) : A.shade('#141312', 1);
    A.ell(g, x, y + r * 0.06, r * 0.5, r * 0.56); g.fill();
    // brilho
    if (glow) {
      g.fillStyle = A.rad(g, x, y, 0, r * 3.1, [
        [0, A.rgba(ch.eye, sil ? 0.85 : 0.42)],
        [0.35, A.rgba(ch.eye, sil ? 0.32 : 0.13)],
        [1, A.rgba(ch.eye, 0)]
      ]);
      A.ell(g, x, y, r * 3.1, r * 3.1); g.fill();
    }
    g.fillStyle = A.rgba(ch.eye, 1);
    A.ell(g, x, y + r * 0.06, r * 0.34, r * 0.4); g.fill();
  }

  /**
   * Desenha um mascote com os pés em (o.x, o.y).
   * opts: scale, bright, silhouette, t, pose('idle'|'rage'|'peek'|'walk'),
   *       mouth, glow, shadow, headTurn
   */
  const HUMAN_THEMES = {
    hori:  { skin:'#F5E6D3', skinSh:'#D9C3A5', hair:'#7A5230', hairHi:'#C9A86A', shirt:'#1A1A1A', pants:'#1A1A1A', shoes:'#0a0a0a', sleeve:'#1A1A1A', eye:'#ff3b30', accent:'#FF4500', hairStyle:'hori', shirtStyle:'longsleeve', hasTie:true, pout:true },
    akira: { skin:'#FAD6A5', skinSh:'#E8A87C', hair:'#33201F', hairHi:'#9A3B2E', shirt:'#1A1A1A', pants:'#2a2a2a', shoes:'#111', sleeve:null, eye:'#ff9a2e', accent:'#90EE90', hairStyle:'akira', shirtStyle:'tank', hasTattoo:true, hasNecklace:true, hasBracelet:true },
    leo:   { skin:'#EAC9A8', skinSh:'#D4A373', hair:'#33251A', hairHi:'#B8936A', shirt:'#1A1A1A', pants:'#222', shoes:'#111', sleeve:null, eye:'#ffd23f', accent:'#C41E3A', hairStyle:'leo', shirtStyle:'tshirt', hasGlasses:true },
    re:    { skin:'#DEB887', skinSh:'#C19A6B', hair:'#1F1A14', hairHi:'#3D2B1F', shirt:'#00529F', pants:'#33507A', shoes:'#111', sleeve:null, eye:'#f6f1e4', accent:'#5C4033', hairStyle:'re', shirtStyle:'jersey', hasMustache:true, hasWatch:true }
  };

  function drawHumanEyes(g, o, bright, sil, eyeColor, eyeY, spacing, rage, skinSh) {
    // sobrancelhas (castanho escuro, não cor de pele)
    if (!sil) {
      g.strokeStyle = '#3a2415';
      g.lineWidth = 3.2;
      g.lineCap = 'round';
      [-1, 1].forEach(sgn => {
        const ex = sgn * spacing;
        g.beginPath();
        g.moveTo(ex - 9, eyeY - 13);
        g.quadraticCurveTo(ex, eyeY - 16, ex + 9, eyeY - 12);
        g.stroke();
      });
    }
    [-1, 1].forEach(sgn => {
      const ex = sgn * spacing;
      // órbita
      g.fillStyle = sil ? '#040507' : A.shade('#f3eee2', bright);
      A.ell(g, ex, eyeY, 8.5, 7); g.fill();
      // sombra da pálpebra
      if (!sil) {
        g.fillStyle = A.rgba(skinSh || '#000', 0.18);
        A.ell(g, ex, eyeY - 2.5, 8, 3.2); g.fill();
      }
      // íris
      g.fillStyle = sil ? A.rgba(eyeColor, 0.95) : A.shade(eyeColor, 0.55 * bright);
      A.ell(g, ex, eyeY + 0.5, 4.6, 5.2); g.fill();
      // pupila
      g.fillStyle = sil ? A.rgba('#fff', 0.9) : '#0a0a0a';
      A.ell(g, ex, eyeY + 0.8, 2.4, 2.8); g.fill();
      // brilho
      if (!sil) {
        g.fillStyle = 'rgba(255,255,255,.9)';
        A.ell(g, ex - 1.4, eyeY - 1.8, 1.7, 1.5); g.fill();
        g.fillStyle = 'rgba(255,255,255,.4)';
        A.ell(g, ex + 1.6, eyeY + 1.2, 1.0, 0.9); g.fill();
      }
      if (sil) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.fillStyle = A.rad(g, ex, eyeY, 0, 20, [[0, A.rgba(eyeColor, 0.85)], [1, A.rgba(eyeColor, 0)]]);
        A.ell(g, ex, eyeY, 20, 20); g.fill();
        g.restore();
      }
    });
    if (rage && !sil) {
      g.strokeStyle = A.shade('#1a1a1a', 0.9);
      g.lineWidth = 3.2;
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(-spacing - 9, eyeY - 10); g.lineTo(-spacing + 3, eyeY - 6); g.stroke();
      g.beginPath(); g.moveTo(spacing + 9, eyeY - 10); g.lineTo(spacing - 3, eyeY - 6); g.stroke();
    }
  }

  // Sprites PNG (enviados pelo usuário) — substitui o desenho procedural
  A.SPRITES = {};
  ['hori', 'akira', 'leo', 're'].forEach(id => {
    A.SPRITES[id] = {};
    const Cap = id.charAt(0).toUpperCase() + id.slice(1);
    const tries = {
      idle: ['assets/' + Cap + '_idle.png', 'assets/' + Cap + '-idle.png', 'assets/' + id + '_idle.png', 'assets/' + id + '-idle.png'],
      rage: ['assets/' + Cap + '_attack.png', 'assets/' + Cap + '-attack.png', 'assets/' + id + '_attack.png', 'assets/' + id + '_rage.png', 'assets/' + id + '-rage.png']
    };
    ['idle', 'rage'].forEach(pose => {
      const img = new Image();
      img.src = tries[pose][0];
      A.SPRITES[id][pose] = img;
      let ti = 0;
      img.onerror = () => {
        ti++;
        if (ti < tries[pose].length) img.src = tries[pose][ti];
      };
    });
  });

  A.mascot = function (g, id, o) {
    o = o || {};
    const ch = A.CHARS[id];
    if (!ch) return;
    const sc = o.scale == null ? 1 : o.scale;
    const pose = o.pose === 'rage' ? 'rage' : 'idle';
    const spr = A.SPRITES[id] ? A.SPRITES[id][pose] : null;
    if (spr && spr.complete && spr.naturalWidth) {
      g.save();
      g.translate(o.x || 0, o.y || 0);
      g.scale(sc, sc);
      const MAXW = 220, MAXH = 300;
      const k = Math.min(MAXW / spr.naturalWidth, MAXH / spr.naturalHeight);
      const W = spr.naturalWidth * k, H = spr.naturalHeight * k;
      g.drawImage(spr, -W/2, -H, W, H);
      g.restore();
      return;
    }
    // fallback simples enquanto o PNG não carrega
    const sil = !!o.silhouette;
    const bright = o.bright == null ? 1 : o.bright;
    g.save();
    g.translate(o.x || 0, o.y || 0);
    g.scale(sc, sc);
    g.fillStyle = sil ? '#0a0d10' : A.shade('#3a4a6b', bright);
    A.rr(g, -34, -190, 68, 190, 18); g.fill();
    g.fillStyle = sil ? '#0a0d10' : A.shade('#f5e6d3', bright);
    A.ell(g, 0, -218, 28, 30); g.fill();
    g.fillStyle = sil ? A.rgba(ch.eye||'#fff', 0.9) : '#0a0a0a';
    A.ell(g, -10, -220, 3, 3.5); g.fill(); A.ell(g, 10, -220, 3, 3.5); g.fill();
    g.restore();
  };

  /* desenha só a cabeça (para retratos, pôsteres, sustos) */
  A.mascotHead = function (g, id, o) {
    o = o || {};
    g.save();
    const sc = (o.scale == null ? 1 : o.scale);
    g.translate(o.x || 0, o.y || 0);
    g.scale(sc, sc);
    // desenha o corpo deslocado para que a cabeça caia na origem
    g.translate(0, 224);
    A.mascot(g, id, { ...o, x: 0, y: 0, scale: 1 });
    g.restore();
  };
})(ART);
