/* ============================================================
   ART-ROOM360 — sala industrial 360° com duas portas
   Panorama cilíndrico 5120x900 (1 rad = 815 px)
   ============================================================ */
(function (A) {
  'use strict';

  const VW = A.VW, VH = A.VH;
  const PW = 5120, PP = 815;
  const TAU = Math.PI * 2;
  const mod = (v, m) => ((v % m) + m) % m;
  const wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
  const X = a => mod(a * PP + 4480, PW);

  A.ROOM = {
    panoW: PW, pprad: PP, fov: VW / PP,
    wrap,
    doors: {
      F: { angle: 0, y: 150, w: 340, h: 550, btn: 266, by: [332, 470] },
      B: { angle: Math.PI, y: 150, w: 340, h: 550, btn: 266, by: [332, 470] }
    },
    stations: {
      print1: { angle: -1.63, name: 'OFFSET' },
      print2: { angle: -0.56, name: 'DIGITAL' },
      print3: { angle: 2.63, name: 'UV' },
      pack: { angle: Math.PI * 0.5, name: 'EXPEDIÇÃO' }
    },
    screenX(angle, yaw) { return VW / 2 + wrap(angle - yaw) * PP; }
  };

  /* ------------------------------------------------------------
     textura / helpers
  ------------------------------------------------------------ */
  function grime(g, x, y, w, h, n, alpha) {
    for (let i = 0; i < n; i++) {
      const px = x + Math.random() * w, py = y + Math.random() * h;
      g.fillStyle = `rgba(0,0,0,${(alpha || 0.06) * (0.3 + Math.random())})`;
      A.ell(g, px, py, 10 + Math.random() * 50, 8 + Math.random() * 60); g.fill();
    }
  }

  function wallBase(g, x0, top, bottom) {
    const gd = g.createLinearGradient(0, 130, 0, 700);
    gd.addColorStop(0, '#0b0f10');
    gd.addColorStop(0.3, top || '#1b2124');
    gd.addColorStop(0.75, bottom || '#181d20');
    gd.addColorStop(1, '#0c1012');
    g.fillStyle = gd;
    g.fillRect(x0, 130, 1280, 570);

    // painéis metálicos
    g.save();
    for (let i = 0; i < 5; i++) {
      const x = x0 + i * 256;
      g.fillStyle = 'rgba(255,255,255,.014)';
      g.fillRect(x + 6, 140, 244, 548);
      g.strokeStyle = 'rgba(0,0,0,.5)';
      g.lineWidth = 4;
      g.strokeRect(x + 6, 140, 244, 548);
      g.strokeStyle = 'rgba(255,255,255,.035)';
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x + 10, 146); g.lineTo(x + 10, 684); g.stroke();
    }
    g.restore();
    grime(g, x0, 150, 1280, 540, 22, 0.07);
  }

  /* ------------------------------------------------------------
     PANORAMA
  ------------------------------------------------------------ */
  let pano = null;

  function buildPano() {
    const c = A.cv(PW, 900), g = c.getContext('2d');

    /* ---- teto ---- */
    g.fillStyle = '#040607';
    g.fillRect(0, 0, PW, 150);
    const cg = g.createLinearGradient(0, 0, 0, 150);
    cg.addColorStop(0, '#050708'); cg.addColorStop(1, '#101517');
    g.fillStyle = cg;
    g.fillRect(0, 0, PW, 150);
    // vigas
    for (let x = 0; x < PW; x += 320) {
      g.fillStyle = 'rgba(0,0,0,.55)';
      g.fillRect(x, 0, 26, 150);
      g.fillStyle = 'rgba(255,255,255,.03)';
      g.fillRect(x + 26, 0, 4, 150);
    }
    // tubulação
    g.strokeStyle = '#0a0d0f'; g.lineWidth = 20;
    g.beginPath(); g.moveTo(0, 54); g.lineTo(PW, 54); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 44); g.lineTo(PW, 44); g.stroke();

    /* ---- piso ---- */
    const fg = g.createLinearGradient(0, 700, 0, 900);
    fg.addColorStop(0, '#171b1d');
    fg.addColorStop(1, '#050708');
    g.fillStyle = fg;
    g.fillRect(0, 700, PW, 200);
    // juntas do piso
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 3;
    for (let x = 0; x < PW; x += 128) {
      g.beginPath(); g.moveTo(x, 700); g.lineTo(x + (x % 256 ? 60 : -60), 900); g.stroke();
    }
    for (let i = 1; i < 5; i++) {
      const y = 700 + i * i * 8;
      g.strokeStyle = 'rgba(0,0,0,.35)';
      g.beginPath(); g.moveTo(0, y); g.lineTo(PW, y); g.stroke();
    }
    // faixa de segurança
    g.fillStyle = '#8a6a10';
    g.fillRect(0, 686, PW, 8);
    g.fillStyle = 'rgba(255,220,120,.10)';
    g.fillRect(0, 686, PW, 3);

    /* ---- luminárias em cada parede ---- */
    [640, 1920, 3200, 4480].forEach((x, i) => {
      const fl = i === 1 ? 0.55 : 1;
      g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(x, 60); g.lineTo(x, 118); g.stroke();
      g.fillStyle = '#151a1c';
      A.poly(g, [[x - 96, 152], [x + 96, 152], [x + 58, 112], [x - 58, 112]]); g.fill();
      g.fillStyle = `rgba(255,240,200,${0.55 * fl})`;
      g.fillRect(x - 54, 150, 108, 6);
      const cone = g.createLinearGradient(0, 150, 0, 700);
      cone.addColorStop(0, `rgba(255,240,200,${0.10 * fl})`);
      cone.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = cone;
      A.poly(g, [[x - 100, 156], [x + 100, 156], [x + 320, 700], [x - 320, 700]]); g.fill();
    });

    /* ============================================================
       PAREDE DIREITA (0..1280) — EXPEDIÇÃO
    ============================================================ */
    (function () {
      const x0 = 0;
      wallBase(g, x0, '#1d2427', '#161c1f');

      // placa
      g.fillStyle = 'rgba(0,0,0,.5)';
      g.fillRect(410, 176, 460, 62);
      g.fillStyle = '#1a2124';
      g.fillRect(410, 176, 460, 62);
      A.text(g, 'EXPEDIÇÃO', 640, 208, {
        font: 'bold 34px "Courier New", monospace', color: 'rgba(190,220,210,.55)', spacing: 10
      });

      // prateleiras laterais
      for (let s = 0; s < 2; s++) {
        const x = s ? 1000 : 60;
        g.fillStyle = '#0a0d0e';
        g.fillRect(x, 380, 220, 320);
        for (let r = 0; r < 3; r++) {
          const y = 400 + r * 96;
          g.fillStyle = '#1a2023';
          g.fillRect(x + 10, y, 200, 10);
          for (let b = 0; b < 3; b++) {
            g.fillStyle = b % 2 ? '#8a7c5c' : '#6e6448';
            g.fillRect(x + 18 + b * 62, y - 62, 54, 60);
            g.fillStyle = 'rgba(0,0,0,.35)';
            g.fillRect(x + 18 + b * 62, y - 30, 54, 4);
          }
        }
      }

      // mesa de embalagem
      g.fillStyle = '#0b0e0f';
      g.fillRect(340, 556, 600, 26);
      g.fillStyle = '#20262a';
      g.fillRect(340, 582, 600, 120);
      g.fillStyle = '#0e1214';
      g.fillRect(356, 596, 568, 8);
      g.fillStyle = '#161b1e';
      g.fillRect(372, 700, 24, 24);
      g.fillRect(884, 700, 24, 24);
      // caixas na mesa
      for (let i = 0; i < 3; i++) {
        const bx = 400 + i * 170;
        g.fillStyle = '#7a6c4e';
        g.fillRect(bx, 486, 130, 72);
        g.fillStyle = '#8d7f5f';
        g.fillRect(bx, 480, 130, 12);
        g.fillStyle = 'rgba(30,25,15,.45)';
        g.fillRect(bx + 10, 500, 60, 8);
        g.fillRect(bx + 10, 514, 40, 6);
      }
      // fitilho
      g.strokeStyle = 'rgba(200,190,160,.5)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(560, 470); g.quadraticCurveTo(700, 520, 840, 468); g.stroke();

      // (extintor removido para clareza)
    })();

    /* ============================================================
       PAREDE DOS FUNDOS (1280..2560) — PORTA DOS FUNDOS
    ============================================================ */
    (function () {
      const x0 = 1280;
      wallBase(g, x0, '#1a2023', '#141a1d');

      // porta (vão escuro)
      const dx = 1920, dw = 340;
      g.fillStyle = '#030405';
      g.fillRect(dx - dw / 2, 150, dw, 550);
      // moldura
      g.fillStyle = '#0c1012';
      g.fillRect(dx - dw / 2 - 16, 134, dw + 32, 16);
      g.fillRect(dx - dw / 2 - 16, 150, 16, 550);
      g.fillRect(dx + dw / 2, 150, 16, 550);
      g.fillStyle = 'rgba(255,255,255,.06)';
      g.fillRect(dx - dw / 2 - 16, 134, dw + 32, 3);

      // (placa SAÍDA removida)

      // canos
      g.strokeStyle = '#0a0d0f'; g.lineWidth = 22;
      g.beginPath(); g.moveTo(2540, 250); g.lineTo(2540, 700); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 4;

      // (quadro de avisos removido)

      // Impressora UV flatbed (fundos, à esquerda da porta)
      (function () {
        const mx = 1505;
        // sombra no chão
        g.fillStyle = 'rgba(0,0,0,.45)';
        A.ell(g, mx, 717, 240, 14); g.fill();
        // cama plana com estrutura
        g.fillStyle = '#0a0d0e'; A.rr(g, mx - 195, 600, 390, 58, 8); g.fill();
        g.fillStyle = A.lin(g, 0, 586, 0, 648, [[0, '#2b333b'], [1, '#12181d']]);
        A.rr(g, mx - 182, 586, 364, 48, 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(mx - 182, 586, 364, 3);
        // pernas até o chão
        g.fillStyle = '#0a0d0e'; g.fillRect(mx - 168, 650, 26, 52); g.fillRect(mx + 142, 650, 26, 52);
        // chapa sendo impressa (com arte colorida)
        g.fillStyle = '#ddd8c9'; g.fillRect(mx - 138, 556, 276, 34);
        g.fillStyle = '#c2513c'; g.fillRect(mx - 128, 562, 92, 22);
        g.fillStyle = '#3c6ec2'; g.fillRect(mx - 24, 562, 58, 22);
        g.fillStyle = '#4e8a4a'; g.fillRect(mx + 46, 562, 46, 22);
        g.fillStyle = 'rgba(20,20,25,.55)'; g.fillRect(mx - 128, 566, 92, 4);
        // colunas laterais (pórtico)
        [-1, 1].forEach(s => {
          g.fillStyle = '#0e1318'; A.rr(g, mx + s * 178 - 28, 356, 56, 240, 7); g.fill();
          g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(mx + s * 178 - 22, 362, 12, 228);
          g.fillStyle = '#07090b'; g.fillRect(mx + s * 178 - 32, 596, 64, 10);
        });
        // trilho do pórtico
        g.fillStyle = '#1c232b'; A.rr(g, mx - 206, 348, 412, 42, 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(mx - 198, 352, 396, 4);
        g.fillStyle = '#10161c'; g.fillRect(mx - 206, 386, 412, 6);
        // carro da cabeça + corpo da cabeça
        g.fillStyle = '#28313a'; A.rr(g, mx - 70, 330, 140, 60, 9); g.fill();
        g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(mx - 62, 336, 124, 5);
        g.fillStyle = '#3d4754'; A.rr(g, mx - 46, 316, 92, 24, 6); g.fill();
        // sulcos de ventilação
        g.fillStyle = 'rgba(0,0,0,.35)';
        for (let i = 0; i < 3; i++) g.fillRect(mx - 38 + i * 28, 322, 14, 3);
        // cabeça de impressão + barra de lâmpadas UV acesas
        g.fillStyle = '#45505d'; g.fillRect(mx - 44, 390, 88, 16);
        g.fillStyle = '#8a5cff'; g.fillRect(mx - 48, 406, 96, 5);
        g.fillStyle = A.rad(g, mx, 411, 4, 130, [[0, 'rgba(142,92,255,.45)'], [1, 'rgba(142,92,255,0)']]);
        A.poly(g, [[mx - 50, 411], [mx + 50, 411], [mx + 118, 556], [mx - 118, 556]]); g.fill();
        // painel de controle lateral com LED violeta
        g.fillStyle = '#0d1116'; A.rr(g, mx + 138, 420, 66, 96, 6); g.fill();
        g.fillStyle = 'rgba(142,92,255,.75)'; A.ell(g, mx + 171, 442, 8, 8); g.fill();
        g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(mx + 148, 462, 46, 5);
        g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(mx + 148, 476, 46, 5);
        // etiquetas
        A.text(g, 'UV', mx, 612, { font: 'bold 20px "Arial Black", Impact, sans-serif', color: 'rgba(200,170,255,.95)', spacing: 8, shadow: 'rgba(90,50,220,.6)', blur: 12 });
        A.text(g, 'FLATBED', mx, 628, { font: 'bold 10px "Courier New", monospace', color: 'rgba(200,210,220,.5)', spacing: 3 });
      })();

      // quadro de pedidos (murais com ordens pinadas) — à direita do botão de luz
      (function () {
        const bx = 2295, bw = 205;
        g.fillStyle = '#0b0d0f'; A.rr(g, bx - 12, 232, bw + 24, 258, 8); g.fill();
        g.fillStyle = '#241a12'; g.fillRect(bx, 242, bw, 238);
        const cols = [bx + 16, bx + 79, bx + 142];
        const rows = [264, 354];
        cols.forEach((px, ci) => {
          rows.forEach((py, ri) => {
            const rot = ((ci * 7 + ri * 13) % 5 - 2) * 0.035;
            g.save(); g.translate(px + 23, py + 32); g.rotate(rot);
            g.fillStyle = (ci + ri) % 2 ? '#e8e2d2' : '#ded8c8';
            g.fillRect(-23, -32, 46, 64);
            g.fillStyle = 'rgba(40,40,40,.6)';
            for (let l = 0; l < 4; l++) g.fillRect(-17, -19 + l * 11, 34, 3);
            g.restore();
            g.fillStyle = '#c33f34'; A.ell(g, px + 23, py + 6, 3.5, 3.5); g.fill();
          });
        });
        A.text(g, 'PEDIDOS', bx + bw / 2, 224, { font: 'bold 17px "Courier New", monospace', color: 'rgba(255,210,140,.75)', spacing: 4 });
      })();
    })();

    /* ============================================================
       PAREDE ESQUERDA (2560..3840) — IMPRESSORA OFFSET
    ============================================================ */
    (function () {
      const x0 = 2560;
      wallBase(g, x0, '#1c2225', '#151a1d');

      // placa (moldura igual à EXPEDIÇÃO)
      g.fillStyle = 'rgba(0,0,0,.5)';
      g.fillRect(2970, 176, 460, 62);
      g.fillStyle = '#1a2124';
      g.fillRect(2970, 176, 460, 62);
      A.text(g, 'IMPRESSÃO', 3200, 208, {
        font: 'bold 34px "Courier New", monospace', color: 'rgba(190,220,210,.55)', spacing: 10
      });

      // ---- Impressora 1: Offset (esquerda, centro da parede) ----
      (function () {
        const mx = 3150;
        // sombra no chão
        g.fillStyle = 'rgba(0,0,0,.45)';
        A.ell(g, mx, 717, 235, 14); g.fill();
        // mesa de entrada (esquerda) com pilha de papel
        g.fillStyle = '#0d1216'; A.rr(g, mx - 216, 470, 116, 230, 6); g.fill();
        g.fillStyle = A.lin(g, 0, 470, 0, 700, [[0, '#232d34'], [1, '#131a1f']]);
        A.rr(g, mx - 206, 478, 96, 212, 5); g.fill();
        g.fillStyle = '#ddd8c9'; g.fillRect(mx - 196, 512, 78, 10);
        g.fillStyle = '#c9c4b4'; g.fillRect(mx - 192, 500, 70, 10);
        g.fillStyle = '#b6b1a1'; g.fillRect(mx - 188, 489, 62, 10);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(mx - 196, 528, 78, 3);
        // mesa de entrega (direita) com folhas impressas
        g.fillStyle = '#0d1216'; A.rr(g, mx + 100, 470, 116, 230, 6); g.fill();
        g.fillStyle = A.lin(g, 0, 470, 0, 700, [[0, '#232d34'], [1, '#131a1f']]);
        A.rr(g, mx + 110, 478, 96, 212, 5); g.fill();
        g.fillStyle = '#e8e4d6'; g.fillRect(mx + 120, 520, 76, 8);
        g.fillStyle = '#3a5f9e'; g.fillRect(mx + 120, 523, 34, 5);
        g.fillStyle = '#e8e4d6'; g.fillRect(mx + 116, 506, 84, 8);
        g.fillStyle = '#9e3a3a'; g.fillRect(mx + 116, 509, 30, 5);
        // corpo principal (verde petróleo)
        g.fillStyle = '#080b0c'; A.rr(g, mx - 150, 310, 300, 356, 10); g.fill();
        g.fillStyle = A.lin(g, mx - 150, 310, mx + 150, 666, [[0, '#2f4b52'], [0.5, '#22343a'], [1, '#131c21']]);
        A.rr(g, mx - 138, 322, 276, 332, 8); g.fill();
        // friso e chapas de inspeção
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(mx - 138, 340, 276, 4);
        g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2;
        g.strokeRect(mx - 122, 348, 96, 60);
        g.strokeRect(mx + 26, 348, 96, 60);
        // janela dos cilindros (triângulo: placa, blanket, impressão)
        g.fillStyle = '#0c1114'; A.rr(g, mx - 118, 420, 236, 108, 6); g.fill();
        const cyls = [[mx - 66, 486], [mx, 434], [mx + 66, 486]];
        cyls.forEach(([cx, cy], i) => {
          const cols = ['#3c5a66', '#5a4632', '#37424a'];
          const grad = g.createRadialGradient(cx - 12, cy - 12, 3, cx, cy, 42);
          grad.addColorStop(0, cols[i]);
          grad.addColorStop(1, '#0a0e10');
          g.fillStyle = grad; A.ell(g, cx, cy, 41, 41); g.fill();
          g.strokeStyle = '#3d4850'; g.lineWidth = 5; A.ell(g, cx, cy, 41, 41); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; A.ell(g, cx, cy, 27, 27); g.stroke();
          g.fillStyle = '#8ba3ac'; A.ell(g, cx, cy, 6, 6); g.fill();
        });
        // tampa superior (alimentação de tinta)
        g.fillStyle = '#1a262c'; A.rr(g, mx - 96, 292, 192, 30, 6); g.fill();
        g.fillStyle = 'rgba(140,220,190,.25)'; g.fillRect(mx - 88, 300, 176, 4);
        // console lateral com display
        g.fillStyle = '#0a0d0f'; A.rr(g, mx + 60, 540, 88, 92, 6); g.fill();
        g.fillStyle = 'rgba(96,230,150,.18)'; A.rr(g, mx + 70, 552, 68, 36, 3); g.fill();
        A.text(g, 'OFFSET', mx + 104, 576, { font: 'bold 13px "Courier New", monospace', color: 'rgba(150,255,205,.75)', spacing: 1 });
        g.fillStyle = 'rgba(96,230,150,.6)'; A.ell(g, mx + 78, 606, 5, 5); g.fill();
        g.fillStyle = 'rgba(230,180,80,.8)'; A.ell(g, mx + 96, 606, 5, 5); g.fill();
        // base + pés com fita de segurança
        g.fillStyle = '#0a0d0e'; A.rr(g, mx - 165, 646, 330, 22, 6); g.fill();
        g.fillStyle = '#161c20'; A.rr(g, mx - 152, 640, 304, 10, 4); g.fill();
        for (let i = 0; i < 8; i++) {
          g.fillStyle = i % 2 ? '#c9a227' : '#151515';
          g.save(); g.translate(mx - 150 + i * 40, 668); g.transform(1, 0, -0.18, 1, 0, 0); g.fillRect(0, 0, 34, 10); g.restore();
        }
        g.fillStyle = '#0a0d0e'; g.fillRect(mx - 138, 678, 18, 22); g.fillRect(mx + 120, 678, 18, 22);
        // LED de status + ventilação
        g.fillStyle = 'rgba(96,230,150,.9)'; A.ell(g, mx - 116, 306, 6, 6); g.fill();
      })();

      // (impressoras digitais e UV ficam nas outras paredes)

      // cartaz de segurança acima dos tambores de tinta
      (function () {
        const px = 2745;
        g.fillStyle = '#0d1012'; A.rr(g, px - 105, 262, 210, 192, 4); g.fill();
        g.fillStyle = '#d8c94a'; g.fillRect(px - 97, 270, 194, 176);
        g.fillStyle = '#141414'; g.fillRect(px - 97, 270, 194, 34);
        A.text(g, 'ATENÇÃO', px, 294, { font: 'bold 20px "Arial Black", Impact, sans-serif', color: '#d8c94a', spacing: 3 });
        A.text(g, 'NÃO SEJA', px, 330, { font: 'bold 19px "Courier New", monospace', color: '#141414', spacing: 1 });
        A.text(g, 'UM ASNO!', px, 353, { font: 'bold 19px "Courier New", monospace', color: '#141414', spacing: 1 });
        g.fillStyle = '#141414';
        A.poly(g, [[px, 396], [px - 25, 426], [px + 25, 426]]); g.fill();
        g.fillStyle = '#d8c94a'; g.fillRect(px - 2, 406, 4, 10); g.fillRect(px - 2, 420, 4, 3);
      })();

      // tambores de tinta
      for (let i = 0; i < 3; i++) {
        g.fillStyle = ['#1d3a4a', '#3a1d1d', '#243a1d'][i];
        A.rr(g, x0 + 60 + i * 90, 560, 76, 140, 6); g.fill();
        g.fillStyle = 'rgba(0,0,0,.35)';
        A.ell(g, x0 + 98 + i * 90, 560, 38, 10); g.fill();
      }
      // rolo de papel gigante
      g.fillStyle = '#0b0e0f';
      A.rr(g, x0 + 1080, 400, 180, 300, 8); g.fill();
      g.fillStyle = '#c2bba8';
      A.rr(g, x0 + 1090, 410, 160, 280, 6); g.fill();
      g.fillStyle = 'rgba(0,0,0,.2)';
      for (let i = 0; i < 7; i++) g.fillRect(x0 + 1090, 430 + i * 36, 160, 5);

      // baixo em capa de violão encostado na parede (canto)
      (function () {
        g.save();
        g.translate(x0 + 1180, 700);
        g.rotate(-0.12);
        // capa de tecido preto no formato do baixo
        g.fillStyle = '#0e0a08';
        // corpo inferior (curvas do violão)
        A.poly(g, [
          [-30, -10], [-44, -40], [-52, -90], [-46, -150],
          [-30, -180], [-18, -210], [0, -220], [18, -210],
          [30, -180], [46, -150], [52, -90], [44, -40], [30, -10]
        ]);
        g.fill();
        // "cintura"
        g.fillStyle = '#14100c';
        A.ell(g, 0, -130, 26, 18); g.fill();
        // parte superior (braço)
        g.fillStyle = '#0e0a08';
        A.rr(g, -12, -220, 24, 120, 6); g.fill();
        // highlight de tecido
        g.fillStyle = 'rgba(255,255,255,.05)';
        A.poly(g, [[-20, -20], [-34, -80], [-26, -150], [-10, -200]]);
        g.fill();
        // costura / zíper
        g.strokeStyle = 'rgba(180,180,180,.25)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -200); g.lineTo(0, -20); g.stroke();
        // headstock do baixo aparecendo além da capa
        g.fillStyle = '#3a2a1a';
        A.rr(g, -12, -300, 24, 46, 4); g.fill();
        g.fillStyle = '#2a1e12';
        for (let i = 0; i < 4; i++) {
          g.beginPath(); g.arc(-9, -292 + i * 9, 3, 0, Math.PI * 2); g.fill();
        }
        // braço do baixo (entre capa e headstock)
        g.fillStyle = '#2a1e12';
        A.rr(g, -9, -254, 18, 34, 3); g.fill();
        g.restore();
      })();
    })();

    /* ============================================================
       PAREDE DA FRENTE (3840..5120) — PORTA DA FRENTE
    ============================================================ */
    (function () {
      const x0 = 3840;
      wallBase(g, x0, '#1e2427', '#171d20');

      const dx = 4480, dw = 340;
      g.fillStyle = '#030405';
      g.fillRect(dx - dw / 2, 150, dw, 550);
      g.fillStyle = '#0c1012';
      g.fillRect(dx - dw / 2 - 16, 134, dw + 32, 16);
      g.fillRect(dx - dw / 2 - 16, 150, 16, 550);
      g.fillRect(dx + dw / 2, 150, 16, 550);
      g.fillStyle = 'rgba(255,255,255,.06)';
      g.fillRect(dx - dw / 2 - 16, 134, dw + 32, 3);

      // letreiro
      g.fillStyle = 'rgba(0,0,0,.45)';
      g.fillRect(dx - 268, 56, 536, 66);
      A.text(g, 'GRÁFICA DO JAIRO', dx, 78, {
        font: 'bold 24px "Arial Black", Impact, sans-serif',
        color: 'rgba(220,200,150,.5)', shadow: 'rgba(0,0,0,.9)', blur: 10
      });
      A.text(g, 'SALA DAS IMPRESSÕES', dx, 105, {
        font: 'bold 18px "Courier New", monospace',
        color: 'rgba(190,220,210,.55)', spacing: 4
      });

      // Impressora digital (frente, à esquerda da porta)
      (function () {
        const mx = 4020;
        // sombra no chão
        g.fillStyle = 'rgba(0,0,0,.45)';
        A.ell(g, mx, 717, 225, 14); g.fill();
        // corpo esguio (grafite com laterais)
        g.fillStyle = '#080a0c'; A.rr(g, mx - 162, 296, 324, 348, 12); g.fill();
        g.fillStyle = A.lin(g, mx - 162, 296, mx + 162, 644, [[0, '#2c333b'], [0.5, '#1f262d'], [1, '#11161b']]);
        A.rr(g, mx - 150, 308, 300, 324, 10); g.fill();
        g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(mx - 150, 322, 300, 4);
        // tampa superior com saída de folhas
        g.fillStyle = '#1a2128'; A.rr(g, mx - 120, 282, 240, 32, 8); g.fill();
        g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(mx - 112, 288, 224, 3);
        // bandeja de saída com folha colorida
        g.fillStyle = '#0d1216'; A.rr(g, mx - 132, 336, 264, 88, 6); g.fill();
        g.fillStyle = '#efece1'; A.rr(g, mx - 116, 350, 232, 54, 3); g.fill();
        const art = ['#d94f30', '#e8b62a', '#3a7bd5', '#3f9e57'];
        for (let i = 0; i < 4; i++) {
          g.fillStyle = art[i];
          g.fillRect(mx - 104 + i * 56, 356, 44, 42);
        }
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(mx - 116, 396, 232, 6);
        // tela de toque inclinada (brilho ciano)
        g.fillStyle = '#05080a'; A.poly(g, [[mx - 92, 452], [mx + 92, 452], [mx + 78, 516], [mx - 78, 516]]); g.fill();
        g.fillStyle = A.lin(g, 0, 452, 0, 516, [[0, '#0e3d47'], [1, '#072730']]);
        A.poly(g, [[mx - 84, 458], [mx + 84, 458], [mx + 72, 510], [mx - 72, 510]]); g.fill();
        // miniatura de página na tela
        g.fillStyle = 'rgba(150,240,255,.8)'; A.rr(g, mx - 56, 466, 52, 36, 2); g.fill();
        g.fillStyle = 'rgba(6,20,26,.9)'; g.fillRect(mx - 48, 474, 36, 4); g.fillRect(mx - 48, 482, 28, 3); g.fillRect(mx - 48, 489, 32, 3);
        // botões na tela
        ['#29b6d8', '#d6338a', '#e7c832'].forEach((c, i) => {
          g.fillStyle = c; A.ell(g, mx + 24 + i * 18, 482, 5, 5); g.fill();
        });
        // gavetas de papel com puxadores
        [0, 1].forEach(i => {
          g.fillStyle = '#151c22'; A.rr(g, mx - 132, 528 + i * 46, 264, 38, 4); g.fill();
          g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(mx - 124, 533 + i * 46, 248, 3);
          g.fillStyle = '#2b3540'; A.rr(g, mx - 60, 542 + i * 46, 120, 10, 5); g.fill();
        });
        // etiquetas laterais: toners CMYK
        const toners = [['#19b6d6'], ['#d6338a'], ['#e7c832'], ['#222']];
        toners.forEach(([c], i) => {
          g.fillStyle = c; A.ell(g, mx - 96 + i * 24, 618, 7, 7); g.fill();
        });
        // base + pés
        g.fillStyle = '#0a0d0e'; A.rr(g, mx - 166, 632, 332, 18, 6); g.fill();
        g.fillStyle = '#0a0d0e'; g.fillRect(mx - 142, 650, 20, 52); g.fillRect(mx + 122, 650, 20, 52);
        // LED de status + nome
        g.fillStyle = 'rgba(230,200,90,.95)'; A.ell(g, mx + 126, 300, 6, 6); g.fill();
        A.text(g, 'DIGITAL', mx, 272, { font: 'bold 15px "Courier New", monospace', color: 'rgba(160,215,235,.65)', spacing: 5 });
      })();

      // relógio de ponto (canto direito, sem sobrepor a porta nem o botão de luz)
      g.fillStyle = '#c9c2ae';
      A.rr(g, 4860, 300, 120, 170, 4); g.fill();
      g.fillStyle = 'rgba(0,0,0,.15)';
      for (let i = 0; i < 6; i++) g.fillRect(4870, 320 + i * 24, 100, 10);
      g.fillStyle = 'rgba(30,30,30,.6)';
      g.fillRect(4920, 480, 10, 30);

      // (quadro de equipe removido)

      // mesa pequena com rádio
      g.fillStyle = '#0a0d0e';
      g.fillRect(4020, 620, 220, 16);
      g.fillRect(4034, 636, 16, 70);
      g.fillRect(4210, 636, 16, 70);
      g.fillStyle = '#1a2023';
      A.rr(g, 4060, 570, 140, 54, 5); g.fill();
      g.fillStyle = 'rgba(255,180,60,.10)';
      g.fillRect(4074, 582, 70, 30);
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 2;
      A.ell(g, 4170, 597, 16, 16); g.stroke();
    })();

    /* ---- cantos ---- */
    [0, 1280, 2560, 3840].forEach(x => {
      const cw = 110;
      for (const dir of [-1, 1]) {
        const gx = dir < 0 ? x - cw : x;
        const gr = g.createLinearGradient(gx, 0, gx + cw, 0);
        if (dir < 0) { gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.75)'); }
        else { gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); }
        g.fillStyle = gr;
        g.fillRect(gx, 130, cw, 570);
      }
      g.fillStyle = 'rgba(0,0,0,.9)';
      g.fillRect(x - 3, 130, 6, 570);
    });

    A.grain(g, PW, 900, 0.3, 5, 9);
    return c;
  }

  A.pano = function () {
    if (!pano) pano = buildPano();
    return pano;
  };

  /* ------------------------------------------------------------
     desenho do panorama com wrap
  ------------------------------------------------------------ */
  function drawPano(g, yaw) {
    const p = A.pano();
    const center = mod(yaw * PP + 4480, PW);
    let sx = mod(center - VW / 2, PW);
    if (sx + VW <= PW) {
      g.drawImage(p, sx, 0, VW, 900, 0, 0, VW, VH);
    } else {
      const first = PW - sx;
      g.drawImage(p, sx, 0, first, 900, 0, 0, first, VH);
      g.drawImage(p, 0, 0, VW - first, 900, first, 0, VW - first, VH);
    }
  }

  /* ------------------------------------------------------------
     porta
  ------------------------------------------------------------ */
  function drawDoor(g, S, side, t) {
    const D = A.ROOM.doors[side];
    const st = S.doors[side];
    const cx = A.ROOM.screenX(D.angle, S.yaw);
    if (cx < -700 || cx > VW + 700) return;

    const x = cx - D.w / 2, y = D.y, w = D.w, h = D.h;
    const lit = !!st.light && !S.powerOut;

    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();

    // corredor
    g.fillStyle = lit
      ? A.lin(g, 0, y, 0, y + h, [[0, '#2b2721'], [0.5, '#1d1a16'], [1, '#080807']])
      : A.lin(g, 0, y, 0, y + h, [[0, '#070a0d'], [1, '#010202']]);
    g.fillRect(x, y, w, h);

    const flick = lit ? 0.88 + Math.sin(t * 21) * 0.06 + Math.sin(t * 6.7) * 0.05 : 0;

    // perspectiva do corredor
    g.fillStyle = `rgba(0,0,0,${lit ? 0.42 : 0.72})`;
    A.poly(g, [[x, y], [x + w, y], [cx + w * 0.2, y + h * 0.2], [cx - w * 0.2, y + h * 0.2]]);
    g.fill();
    g.fillStyle = lit ? `rgba(150,120,70,${0.10 * flick})` : 'rgba(40,60,80,.04)';
    A.poly(g, [[x, y + h], [x + w, y + h], [cx + w * 0.2, y + h * 0.72], [cx - w * 0.2, y + h * 0.72]]);
    g.fill();

    if (lit) {
      g.fillStyle = A.rad(g, cx, y + h * 0.22, 10, w * 0.8, [
        [0, `rgba(255,236,190,${0.32 * flick})`],
        [0.55, `rgba(255,220,160,${0.10 * flick})`],
        [1, 'rgba(255,220,160,0)']
      ]);
      g.fillRect(x, y, w, h);
      g.fillStyle = `rgba(255,246,215,${0.8 * flick})`;
      A.rr(g, cx - 26, y + 30, 52, 9, 4); g.fill();
    }

    // personagem é desenhado DEPOIS de restaurar o clipe — escala e posição ditadas por d.approach:
    // começa como uma silhueta minúscula no fim do corredor e cresce até o corpo inteiro na soleira
    g.restore();
    const charVisible = st.char && (S.friendCallNotified ? S.friendCallNotified[st.char] : true);
    if (st.char && charVisible) {
      const approach = Math.max(0, Math.min(1, st.approach == null ? 1 : st.approach));
      const depth = st.leaving ? Math.max(0, Math.min(1, st.enterT == null ? 0 : st.enterT)) : approach;
      const ease = 1 - Math.pow(1 - depth, 2.2);             // ease-out: pequeno de longe, grande de perto
      const scMax = 1.62;                                    // corpo inteiro na soleira
      const sc = scMax * (0.08 + 0.92 * ease);               // longe = sombra minúscula
      const byFar = y + h * 0.56;                            // fundo do corredor (lá na escuridão)
      const byNear = y + h + 18 + ease * 46;                 // na soleira quando próximo
      const by = byFar + (byNear - byFar) * ease;
      const sway = Math.sin(t * 2.15 + st.char.length) * (1 - ease * 0.6) * 8;
      A.mascot(g, st.char, {
        x: cx + sway, y: by, scale: sc, t,
        bright: lit ? 0.55 + 0.35 * ease : 0.24 + 0.36 * ease,
        glow: true, pose: 'idle', mouth: 0.08 + ease * 0.25
      });
      // profundidade: quanto mais longe, mais afundado na escuridão do corredor
      const darkness = (1 - ease) * (lit ? 0.5 : 0.78);
      if (darkness > 0.03) {
        g.fillStyle = 'rgba(2,3,4,' + darkness.toFixed(3) + ')';
        g.fillRect(x, y, w, h + 100);
      }

      // balão de fala (aparece aleatoriamente enquanto você encara o amigo) — segue o amigo fisicamente,
      // só aparece se a tela estiver no lugar dele e some ao sair de lá ou se ele estiver saindo
      if (st.bubbleT > 0 && charVisible && !st.leaving) {
        // visibilidade real do amigo: só desenha o balão se a posição dele estiver dentro do campo de visão
        const facing = Math.abs(wrap(D.angle - S.yaw)) < 1.05; // ~metade do FOV + margem
        if (facing) {
          const BUBBLE = 2.6;
          const tIn = Math.min(1, (BUBBLE - st.bubbleT) / 0.18);
          const tOut = Math.min(1, st.bubbleT / 0.35);
          const alpha = Math.max(0, Math.min(tIn, tOut));
          if (alpha > 0) {
            const text = st.bubbleText || '';
            const side = st.bubbleSide === -1 ? -1 : 1;            // lado varia a cada balão
            const lift = st.bubbleLift == null ? 1 : st.bubbleLift; // altura varia a cada balão
            g.save();
            g.globalAlpha = alpha;
            g.font = 'bold 17px "Courier New", monospace';
            const textW = text ? g.measureText(text).width : 0;
            const bw = Math.max(230, textW + 76);
            const bh = 64;
            const R = 30;                                            // bem arredondado
            const headX = cx + sway;
            const headTop = by - 285 * sc;
            const off = bw / 2 + 34;
            let bx = headX + side * off;                             // lateralizado (um lado ou outro)
            // não deixa o balão sair da tela
            bx = A.clamp(bx, bw / 2 + 12, VW - bw / 2 - 12);
            const byBottom = headTop - 8 - (lift - 0.9) * 110;       // disposição/altura também varia
            const by0 = byBottom - bh;
            const bx0 = bx - bw / 2;
            // balão
            g.fillStyle = 'rgba(240,242,236,.95)';
            A.rr(g, bx0, by0, bw, bh, R); g.fill();
            g.strokeStyle = 'rgba(10,10,12,.85)'; g.lineWidth = 3.5;
            A.rr(g, bx0, by0, bw, bh, R); g.stroke();
            // rabicho — do lado do amigo, apontando para a cabeça dele
            const tailX = side === 1 ? bx0 + 18 : bx0 + bw - 18;     // canto interno inferior do balão
            g.fillStyle = 'rgba(240,242,236,.95)';
            A.poly(g, [[tailX - 13, byBottom - 6], [tailX + 13, byBottom - 6], [headX + side * 6, byBottom + 26]]); g.fill();
            g.strokeStyle = 'rgba(10,10,12,.85)'; g.lineWidth = 3.5;
            g.beginPath(); g.moveTo(tailX - 13, byBottom - 6); g.lineTo(headX + side * 6, byBottom + 26); g.lineTo(tailX + 13, byBottom - 6); g.stroke();
            // texto da fala
            if (text) {
              g.fillStyle = '#161616';
              g.textAlign = 'center';
              g.textBaseline = 'middle';
              g.fillText(text, bx, by0 + bh / 2 + 1);
            }
            g.restore();
          }
        }
      }
    }
    // folha da porta
    const p = A.clamp(st.closedAmt == null ? (st.closed ? 1 : 0) : st.closedAmt, 0, 1);
    if (p > 0.002) {
      const ph = h * p;
      g.save();
      g.beginPath(); g.rect(x, y, w, h); g.clip();
      g.fillStyle = A.lin(g, x, y, x + w, y, [
        [0, '#2b3238'], [0.35, '#1a2026'], [0.7, '#232a30'], [1, '#12171b']
      ]);
      g.fillRect(x, y, w, ph);
      for (let yy = y + 10; yy < y + ph; yy += 26) {
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(x, yy, w, 5);
        g.fillStyle = 'rgba(255,255,255,.05)';
        g.fillRect(x, yy + 5, w, 2);
      }
      g.fillStyle = 'rgba(0,0,0,.85)';
      g.fillRect(x, y + ph - 9, w, 9);
      g.restore();
    }

    // (lâmpada de status removida)

    // painel de botões
    drawPanel(g, cx + D.btn, D.by, st, S.powerOut, side, t);
  }

  function drawPanel(g, px, by, st, powerOut, side, t) {
    const R = 42;
    // placa (apenas luz)
    g.fillStyle = '#0b0e10';
    A.rr(g, px - 70, by[1] - 78, 140, 156, 10); g.fill();
    g.fillStyle = A.lin(g, px - 62, by[1] - 70, px + 62, by[1] + 70, [[0, '#20272c'], [1, '#12171a']]);
    A.rr(g, px - 62, by[1] - 70, 124, 140, 8); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2;
    A.rr(g, px - 62, by[1] - 70, 124, 140, 8); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.08)';
    [[px - 50, by[1] - 58], [px + 50, by[1] - 58], [px - 50, by[1] + 58], [px + 50, by[1] + 58]]
      .forEach(([x, y]) => { A.ell(g, x, y, 4, 4); g.fill(); });

    // barra de carga da lâmpada (drena enquanto a luz fica acesa com o amigo na porta)
    const charge = st.charge == null ? 1 : Math.max(0, Math.min(1, st.charge));
    const bw = 92, bh = 13, bx = px - bw / 2, byy = by[1] - R - 28;
    g.fillStyle = '#060708';
    A.rr(g, bx, byy, bw, bh, 3); g.fill();
    if (charge > 0.02) {
      const col = charge < 0.18 ? '#ff5a3d' : (charge < 0.35 ? '#ffb648' : '#7cc6ff');
      g.fillStyle = col;
      const fw = Math.max(4, (bw - 4) * charge);
      A.rr(g, bx + 2, byy + 2.5, fw, bh - 5, 2); g.fill();
      if (st.chargeState === 'low' || st.chargeState === 'empty') {
        g.fillStyle = 'rgba(255,120,40,' + (0.35 + Math.sin((t || 0) * 6) * 0.2).toFixed(3) + ')';
        A.rr(g, bx, byy, bw, bh, 3); g.fill();
      }
    }
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1.5;
    A.rr(g, bx, byy, bw, bh, 3); g.stroke();

    // botão luz
    g.fillStyle = powerOut ? '#141414' : (st.light ? '#8a6a12' : '#17303c');
    A.ell(g, px, by[1], R, R); g.fill();
    g.strokeStyle = powerOut ? '#222' : 'rgba(255,255,255,.22)';
    A.ell(g, px, by[1], R, R); g.stroke();
    g.fillStyle = powerOut ? 'rgba(200,200,200,.15)' : 'rgba(255,255,255,.6)';
    A.poly(g, [
      [px, by[1] - 18], [px + 16, by[1] + 5], [px + 5, by[1] + 5],
      [px + 5, by[1] + 18], [px - 5, by[1] + 18], [px - 5, by[1] + 5], [px - 16, by[1] + 5]
    ]);
    g.fill();

    A.text(g, 'LUZ', px, by[1] + R + 18, {
      font: 'bold 13px "Courier New", monospace', color: 'rgba(220,235,240,.45)', spacing: 2
    });
  }

  /* ------------------------------------------------------------
     estações de trabalho
  ------------------------------------------------------------ */
  function stationInfo(g, S, key, t) {
    const st = A.ROOM.stations[key];
    const cx = A.ROOM.screenX(st.angle, S.yaw);
    const near = Math.abs(wrap(st.angle - S.yaw)) < 0.45;
    const job = S.job;
    if (!job || job.done || job.locked) return;
    const isPack = key === 'pack';
    const isPrintStation = key === 'print1' || key === 'print2' || key === 'print3';
    if (isPack && job.step !== 'pack') return;
    if (isPrintStation && (job.step !== 'print' || job.printer !== key)) return;
    if (!isPack && !isPrintStation) return;
    if (!near) return;

    const pulse = 0.55 + Math.sin(t * 5) * 0.15;
    const yy = 452;
    g.save();
    // brilho no chão/máquina
    g.fillStyle = A.rad(g, cx, 640, 10, 300, [
      [0, `rgba(120,255,190,${0.10 * pulse})`],
      [1, 'rgba(120,255,190,0)']
    ]);
    A.ell(g, cx, 640, 300, 190); g.fill();

    // marcador
    g.globalAlpha = 0.9;
    g.fillStyle = 'rgba(8,14,12,.8)';
    A.rr(g, cx - 130, yy - 34, 260, 68, 8); g.fill();
    g.strokeStyle = `rgba(120,255,190,${0.5 * pulse})`;
    g.lineWidth = 3;
    A.rr(g, cx - 130, yy - 34, 260, 68, 8); g.stroke();

    const isPrint = key === 'print1' || key === 'print2' || key === 'print3';
    A.text(g, isPrint ? 'IMPRIMIR' : 'EMBALAR', cx, yy - 12, {
      font: 'bold 22px "Courier New", monospace', color: 'rgba(190,255,220,.9)', spacing: 4
    });
    A.text(g, 'segure  E', cx, yy + 18, {
      font: '16px "Courier New", monospace', color: 'rgba(190,230,210,.6)', spacing: 2
    });

    // progresso local
    if (job.progress > 0.01) {
      const w = 360;
      g.fillStyle = 'rgba(0,0,0,.6)';
      A.rr(g, cx - w / 2, yy + 48, w, 18, 9); g.fill();
      g.fillStyle = 'rgba(140,255,200,.85)';
      A.rr(g, cx - w / 2 + 3, yy + 51, (w - 6) * Math.min(1, job.progress), 12, 6); g.fill();
    }
    g.restore();
  }

  /* ------------------------------------------------------------
     bússola
  ------------------------------------------------------------ */
  function drawCompass(g, S) {
    const w = 560, x0 = VW / 2 - w / 2, y = 854;
    g.save();
    g.globalAlpha = 0.5;
    g.fillStyle = 'rgba(4,8,10,.55)';
    A.rr(g, x0, y - 24, w, 46, 23); g.fill();
    g.strokeStyle = 'rgba(180,210,225,.16)'; g.lineWidth = 2;
    A.rr(g, x0, y - 24, w, 46, 23); g.stroke();

    const marks = [
      [0, 'door', 'FRENTE'],
      [Math.PI / 2, 'box', 'EXPED.'],
      [Math.PI, 'door', 'FUNDOS'],
      [Math.PI * 1.5, 'press', 'IMPR.']
    ];
    marks.forEach(([a, kind, label]) => {
      const px = x0 + w / 2 + wrap(a - S.yaw) / TAU * w;
      if (px < x0 + 12 || px > x0 + w - 12) return;
      g.fillStyle = 'rgba(200,230,240,.55)';
      const iy = y - 8;
      if (kind === 'door') { g.fillRect(px - 7, iy - 9, 14, 18); }
      else if (kind === 'box') { g.fillRect(px - 8, iy - 7, 16, 14); }
      else { g.fillRect(px - 9, iy - 8, 18, 10); g.fillRect(px - 9, iy + 4, 18, 4); }
      A.text(g, label, px, y + 12, {
        font: 'bold 11px "Courier New", monospace', color: 'rgba(200,230,240,.5)', spacing: 1
      });
    });

    // marcador central
    g.globalAlpha = 0.85;
    g.fillStyle = '#ffb648';
    A.poly(g, [[x0 + w / 2, y - 26], [x0 + w / 2 - 8, y - 40], [x0 + w / 2 + 8, y - 40]]);
    g.fill();
    g.restore();
  }

  /* ------------------------------------------------------------
     cena completa
  ------------------------------------------------------------ */
  A.drawRoom = function (g, S, t) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, VW, VH);

    const shake = S.shake || 0;
    g.save();
    if (shake > 0.2) g.translate(A.rnd(-shake, shake) * 0.6, A.rnd(-shake, shake) * 0.4);

    drawPano(g, S.yaw);

    // portas (a de trás primeiro para casos de sobreposição)
    const order = Math.abs(wrap(0 - S.yaw)) > Math.abs(wrap(Math.PI - S.yaw)) ? ['F', 'B'] : ['B', 'F'];
    order.forEach(side => drawDoor(g, S, side, t));

    // (amigos não aparecem na sala de impressão; veja-os pelas câmeras)

    // estações
    stationInfo(g, S, 'print1', t);
    stationInfo(g, S, 'print2', t);
    stationInfo(g, S, 'print3', t);
    stationInfo(g, S, 'pack', t);

    g.restore();

    // pós (a gráfica segue normal; só o celular pode ter acabado a bateria)
    g.fillStyle = A.rad(g, VW / 2, VH * 0.5, 360, 1020, [
      [0, 'rgba(0,0,0,0)'], [0.68, 'rgba(0,0,0,.32)'], [1, 'rgba(0,0,0,.8)']
    ]);
    g.fillRect(0, 0, VW, VH);

    drawCompass(g, S);
    A.grain(g, VW, VH, 0.4, (t * 43) % 512, (t * 71) % 512);
  };

  /* ------------------------------------------------------------
     Tela de título — galpão industrial à noite
  ------------------------------------------------------------ */
  A.drawTitle = function (g, t) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, VW, VH);

    // parede de fundo
    const bg = A.lin(g, 0, 0, 0, VH, [[0, '#05080a'], [0.45, '#0d1316'], [1, '#030405']]);
    g.fillStyle = bg; g.fillRect(0, 0, VW, VH);

    // vigas do telhado
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 26;
    for (let i = 0; i < 5; i++) {
      const x = 140 + i * 330;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 110, 110); g.stroke();
    }

    // janelas sujas ao fundo (grade escura + reflexo fraco)
    for (const wx of [230, 610, 990]) {
      g.fillStyle = 'rgba(14,22,26,.95)'; g.fillRect(wx, 185, 175, 165);
      g.strokeStyle = 'rgba(150,180,190,.07)'; g.lineWidth = 6; g.strokeRect(wx, 185, 175, 165);
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(wx + 87, 185); g.lineTo(wx + 87, 350); g.stroke();
      g.beginPath(); g.moveTo(wx, 265); g.lineTo(wx + 175, 265); g.stroke();
      // reflexo de chuva fraco
      g.strokeStyle = 'rgba(170,210,225,.05)'; g.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        g.beginPath(); g.moveTo(wx + 20 + i * 40, 195); g.lineTo(wx + 12 + i * 40, 340); g.stroke();
      }
    }

    // letreiro de néon "GRÁFICA DO JAIRO" (pisca como néon velho)
    const neonWave = 0.62 + 0.38 * (Math.sin(t * 1.4) * 0.5 + 0.5);
    const hardFlick = (Math.sin(t * 9.7) > 0.9 || Math.sin(t * 23.3) > 0.985) ? 0.25 : 1;
    g.save();
    g.globalAlpha = neonWave * hardFlick;
    g.fillStyle = '#ffc46a';
    g.font = 'bold 78px "Courier New", monospace';
    g.textAlign = 'center';
    g.shadowColor = 'rgba(255,165,50,.95)';
    g.shadowBlur = 38;
    g.fillText('GRÁFICA DO JAIRO', VW / 2, 158);
    g.restore();

    // máquina ao fundo
    g.fillStyle = 'rgba(12,16,18,.95)';
    A.rr(g, 180, 300, 1240, 420, 14); g.fill();
    g.fillStyle = 'rgba(30,38,42,.9)';
    A.rr(g, 220, 330, 1160, 200, 8); g.fill();
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(8,10,12,.95)';
      A.ell(g, 330 + i * 240, 380, 78, 50); g.fill();
      g.strokeStyle = 'rgba(120,150,165,.10)'; g.lineWidth = 7;
      A.ell(g, 330 + i * 240, 380, 78, 50); g.stroke();
    }
    g.fillStyle = 'rgba(120,255,180,.06)';
    g.fillRect(250, 560, 300, 60);

    // lâmpada pendurada balançando
    const sway = Math.sin(t * 0.9) * 65;
    const lampX = VW / 2 + sway, lampY = 8;
    g.strokeStyle = 'rgba(90,90,90,.75)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(lampX, 0); g.lineTo(lampX, lampY + 46); g.stroke();
    g.fillStyle = '#181c20'; A.rr(g, lampX - 26, lampY + 44, 52, 24, 6); g.fill();
    // cone de luz quente sob a lâmpada
    const cone = g.createLinearGradient(0, lampY + 68, 0, 720);
    cone.addColorStop(0, 'rgba(255,222,150,.20)');
    cone.addColorStop(0.5, 'rgba(255,222,150,.07)');
    cone.addColorStop(1, 'rgba(255,222,150,0)');
    g.fillStyle = cone;
    A.poly(g, [[lampX - 26, lampY + 68], [lampX + 26, lampY + 68], [VW / 2 + 260, 690], [VW / 2 - 260, 690]]); g.fill();

    // piso
    g.fillStyle = A.lin(g, 0, 690, 0, VH, [[0, '#0e1214'], [1, '#020304']]);
    g.fillRect(0, 690, VW, VH - 690);
    g.strokeStyle = 'rgba(255,255,255,.03)';
    for (let i = -8; i <= 8; i++) {
      g.beginPath(); g.moveTo(800 + i * 130, VH); g.lineTo(800 + i * 40, 690); g.stroke();
    }
    // linha amarela de segurança no piso
    g.fillStyle = 'rgba(190,150,60,.14)';
    g.fillRect(0, 700, VW, 6);

    // névoa
    g.fillStyle = A.rad(g, VW / 2, 700, 100, 900, [
      [0, 'rgba(120,160,150,.06)'], [1, 'rgba(120,160,150,0)']
    ]);
    g.fillRect(0, 0, VW, VH);

    // mascotes silhueta mais nítidas, de costas
    const ids = ['hori', 'akira', 'leo', 're'];
    const xs = [380, 620, 980, 1220];
    ids.forEach((id, i) => {
      A.mascot(g, id, {
        x: xs[i] + Math.sin(t * 0.6 + i) * 3, y: 812, scale: 1.15, t: t + i * 2,
        bright: 0.3, glow: true, silhouette: true
      });
    });

    A.grain(g, VW, VH, 0.45, (t * 41) % 512, (t * 67) % 512);
    A.vignette(g, VW, VH, 0.96);
    A.scanlines(g, VW, VH, 0.2);
  };

  /* ------------------------------------------------------------
     susto
  ------------------------------------------------------------ */
  A.drawJumpscare = function (g, id, t) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, VW, VH);

    const k = Math.min(1, t / 0.12);
    const sc = 3.6 + k * 1.15 + Math.sin(t * 46) * 0.06;
    const sx = (Math.random() - 0.5) * 46;
    const sy = (Math.random() - 0.5) * 46;

    g.fillStyle = `rgba(255,30,20,${0.10 + Math.random() * 0.10})`;
    g.fillRect(0, 0, VW, VH);

    g.save();
    g.translate(VW / 2 + sx, VH / 2 + 234 * sc - 85 + sy);
    A.mascot(g, id, {
      x: 0, y: 0, scale: sc, t: t * 6,
      bright: 1.05, glow: true, pose: 'rage', mouth: 1
    });
    g.restore();

    A.grain(g, VW, VH, 0.85, Math.random() * 512, Math.random() * 512);
    if (Math.random() < 0.3) {
      g.fillStyle = `rgba(255,255,255,${0.10 + Math.random() * 0.22})`;
      g.fillRect(0, 0, VW, VH);
    }
    if (Math.random() < 0.18) {
      g.fillStyle = 'rgba(0,0,0,.6)';
      g.fillRect(0, 0, VW, VH);
    }
    A.vignette(g, VW, VH, 0.9);
    A.scanlines(g, VW, VH, 0.25);
  };
  A.drawCamera = function (g, S, room, t) {
    g.fillStyle = '#000';
    g.fillRect(0, 0, VW, VH);
    // celular sem bateria: a tela das câmeras vira pura escuridão com o símbolo de bateria morta
    if (S && S.out && S.out.active) {
      const cx = VW / 2, cy = VH / 2 - 30;
      // faixa de aviso sutil no topo e rodapé
      g.fillStyle = 'rgba(255,60,50,.08)';
      g.fillRect(0, 0, VW, 10); g.fillRect(0, VH - 10, VW, 10);
      // corpo da bateria
      const bw = 300, bh = 150, r = 26;
      g.strokeStyle = 'rgba(232,236,240,.85)'; g.lineWidth = 14;
      A.rr(g, cx - bw / 2, cy - bh / 2, bw, bh, r); g.stroke();
      // terminal (tampa) da bateria
      g.fillStyle = 'rgba(232,236,240,.85)';
      A.rr(g, cx + bw / 2 + 4, cy - 34, 34, 68, 8); g.fill();
      // símbolo de desligado (risco vermelho)
      g.strokeStyle = '#ff3b30'; g.lineWidth = 20; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx - 74, cy - 74); g.lineTo(cx + 74, cy + 74); g.stroke();
      // texto
      A.text(g, 'SEM BATERIA', cx, cy + 210, { font: 'bold 44px "Courier New", monospace', color: 'rgba(240,244,248,.92)', spacing: 10, align: 'center', baseline: 'middle' });

      return;
    }
    const roomNames = ['GALPÃO DE ENTRADA', 'RECEBIMENTO', 'ADMINISTRATIVO', 'ALMOXARIFADO', 'PRODUÇÃO', 'COZINHA', 'ACABAMENTO E CORTE', 'CORREDOR DA FRENTE', 'CORREDOR DE TRÁS'];
    // perspectiva como na sala principal: teto, parede com painéis e piso em perspectiva
    g.fillStyle = '#040607'; g.fillRect(0, 0, VW, 150);
    const cg = g.createLinearGradient(0, 0, 0, 150);
    cg.addColorStop(0, '#050708'); cg.addColorStop(1, '#101517');
    g.fillStyle = cg; g.fillRect(0, 0, VW, 150);
    for (let x = 0; x < VW; x += 320) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, 0, 26, 150); }
    g.strokeStyle = '#0a0d0f'; g.lineWidth = 20;
    g.beginPath(); g.moveTo(0, 54); g.lineTo(VW, 54); g.stroke();
    // parede
    const roomWall = ['#1a2420', '#1a2023', '#201a1a', '#1a1a1a'][room | 0] || '#1a2420';
    g.fillStyle = A.lin(g, 0, 130, 0, 700, [[0, '#0b0f10'], [0.3, roomWall], [1, '#0c1012']]);
    g.fillRect(0, 130, VW, 570);
    g.save();
    for (let i = 0; i < 5; i++) {
      const x = i * 320;
      g.fillStyle = 'rgba(255,255,255,.014)'; g.fillRect(x + 6, 140, 308, 548);
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 4; g.strokeRect(x + 6, 140, 308, 548);
      g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x + 10, 146); g.lineTo(x + 10, 684); g.stroke();
    }
    g.restore();
    // piso em perspectiva (como na sala principal)
    g.fillStyle = A.lin(g, 0, 700, 0, 900, [[0, '#171b1d'], [1, '#050708']]);
    g.fillRect(0, 700, VW, 200);
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 3;
    for (let x = 0; x < VW; x += 128) {
      g.beginPath(); g.moveTo(x, 700); g.lineTo(x + (x % 256 ? 60 : -60), 900); g.stroke();
    }
    for (let i = 1; i < 5; i++) {
      const y = 700 + i * i * 8;
      g.strokeStyle = 'rgba(0,0,0,.35)';
      g.beginPath(); g.moveTo(0, y); g.lineTo(VW, y); g.stroke();
    }
    g.fillStyle = '#8a6a10'; g.fillRect(0, 686, VW, 8);
    // detalhes por cômodo (9 salas da planta)
    if (room === 5) { // COZINHA — pia, fogão, armários e geladeira
      // armários superiores
      g.fillStyle = '#0e1a12'; g.fillRect(80, 180, 500, 120);
      g.fillStyle = '#1e2e22'; g.fillRect(90, 190, 150, 100); g.fillRect(250, 190, 150, 100); g.fillRect(410, 190, 150, 100);
      // bancada (só torneira em cima, em perspectiva; encostada no piso)
      g.fillStyle = '#0b0e0f'; g.fillRect(120, 420, 680, 280);
      g.fillStyle = '#2a3135'; g.fillRect(130, 430, 660, 250);
      g.fillStyle = '#9aa3ab'; g.fillRect(420, 358, 10, 62);
      g.fillStyle = '#c0c8d0'; g.fillRect(411, 354, 28, 8);
      // fogão (com pés até o piso)
      g.fillStyle = '#161b1e'; A.rr(g, 860, 430, 300, 200, 8); g.fill();
      g.fillStyle = '#0a0d0e'; g.fillRect(880, 630, 26, 70); g.fillRect(1114, 630, 26, 70);
      g.fillStyle = '#0a0d0e'; g.fillRect(880, 450, 260, 40);
      for (let i = 0; i < 4; i++) { g.fillStyle = '#39434a'; A.ell(g, 920 + i * 60, 470, 16, 10); g.fill(); }
      // geladeira (encostada no piso)
      g.fillStyle = '#d6cfbb'; A.rr(g, 1220, 300, 220, 400, 10); g.fill();
      g.fillStyle = '#b3ac99'; g.fillRect(1230, 420, 200, 6);
      // (ilha central removida — sobrepunha o fogão)
      A.text(g, 'COZINHA', 800, 170, { font: 'bold 26px "Courier New", monospace', color: 'rgba(190,220,190,.85)', spacing: 8 });
    } else if (room === 7 || room === 8) { // CORREDOR DE TRÁS / DA FRENTE — corredor da sala de impressão
      const nome = room === 7 ? 'CORREDOR DA FRENTE' : 'CORREDOR DE TRÁS';
      // vão do corredor: paredes laterais convergindo para a porta do fundo
      g.fillStyle = '#0c1114';
      A.poly(g, [[0, 140], [450, 205], [450, 640], [0, 700]]); g.fill();
      A.poly(g, [[VW, 140], [1150, 205], [1150, 640], [VW, 700]]); g.fill();
      // parede do fundo
      g.fillStyle = '#0e1418'; g.fillRect(450, 205, 700, 435);
      // piso do corredor
      g.fillStyle = '#0c0f10';
      A.poly(g, [[0, 700], [450, 640], [1150, 640], [VW, 700]]); g.fill();
      // VÃO DA SALA — mostra a luz da porta correspondente (FRENTE/TRÁS)
      const doorLit = room === 7 ? !!(S.doors && S.doors.F && S.doors.F.light) : !!(S.doors && S.doors.B && S.doors.B.light);
      g.fillStyle = '#020304'; g.fillRect(VW / 2 - 130, 300, 260, 340);
      // batente/moldura da passagem
      g.strokeStyle = doorLit ? 'rgba(255,230,170,.75)' : '#1b2227'; g.lineWidth = 14;
      g.strokeRect(VW / 2 - 130, 300, 260, 340);
      // lâmpada acima da porta (acesa/apagada)
      if (doorLit) {
        g.fillStyle = '#ffe9a8'; g.fillRect(VW / 2 - 16, 282, 32, 10);
        g.fillStyle = 'rgba(255,236,150,.35)'; g.fillRect(VW / 2 - 30, 274, 60, 24);
      } else {
        g.fillStyle = '#161c20'; g.fillRect(VW / 2 - 16, 282, 32, 10);
      }
      // profundidade interna da passagem
      if (doorLit) {
        const dg = g.createLinearGradient(0, 312, 0, 630);
        dg.addColorStop(0, 'rgba(255,240,205,.95)');
        dg.addColorStop(0.5, 'rgba(225,195,150,.75)');
        dg.addColorStop(1, 'rgba(150,125,90,.4)');
        g.fillStyle = dg; g.fillRect(VW / 2 - 118, 312, 236, 318);
        g.fillStyle = 'rgba(255,244,215,.28)'; g.fillRect(VW / 2 - 150, 640, 300, 60); // luz no piso
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(VW / 2 - 118, 312, 236, 26);
      } else {
        const dg = g.createLinearGradient(0, 310, 0, 640);
        dg.addColorStop(0, '#0c1013'); dg.addColorStop(0.55, '#05080a'); dg.addColorStop(1, '#020304');
        g.fillStyle = dg; g.fillRect(VW / 2 - 118, 312, 236, 318);
        g.fillStyle = 'rgba(130,170,190,.06)'; g.fillRect(VW / 2 - 118, 552, 236, 78);
      }
      A.text(g, room === 7 ? 'PORTA DA FRENTE' : 'PORTA DE TRÁS', VW / 2, 268, { font: 'bold 15px "Courier New", monospace', color: 'rgba(190,220,225,.6)', spacing: 3 });
      // 1 porta lateral para o vizinho (conforme a planta)
      if (room === 7) {
        g.fillStyle = '#0a0e10'; A.rr(g, 70, 300, 230, 340, 6); g.fill();
        g.fillStyle = '#141a1f'; g.fillRect(80, 312, 210, 318);
        g.fillStyle = '#4a525a'; A.ell(g, 258, 478, 8, 8); g.fill();
        A.text(g, 'ENTRADA', 185, 268, { font: 'bold 14px "Courier New", monospace', color: 'rgba(200,210,220,.5)', spacing: 3 });
      } else {
        g.fillStyle = '#0a0e10'; A.rr(g, VW - 300, 300, 230, 340, 6); g.fill();
        g.fillStyle = '#141a1f'; g.fillRect(VW - 290, 312, 210, 318);
        g.fillStyle = '#4a525a'; A.ell(g, VW - 98, 478, 8, 8); g.fill();
        A.text(g, 'ACABAMENTO', VW - 185, 268, { font: 'bold 14px "Courier New", monospace', color: 'rgba(200,210,220,.5)', spacing: 3 });
      }
      // extintor ao lado da porta da sala
      g.fillStyle = '#7a1d18'; A.rr(g, VW / 2 + 172, 470, 40, 110, 10); g.fill();
      g.fillStyle = '#2a2a2a'; g.fillRect(VW / 2 + 182, 456, 20, 16);
      A.text(g, nome, VW / 2, 170, { font: 'bold 24px "Courier New", monospace', color: 'rgba(200,210,220,.8)', spacing: 8 });
    } else if (room === 2) { // ADMINISTRATIVO — escritório com mesas, arquivos e mural
      // parede do escritório
      g.fillStyle = '#0d1013'; g.fillRect(0, 130, VW, 570);
      g.fillStyle = A.lin(g, 0, 130, 0, 700, [[0, '#1c2228'], [1, '#12161a']]);
      g.fillRect(0, 130, VW, 570);
      // janela com persianas à esquerda
      g.fillStyle = '#060809'; A.rr(g, 90, 165, 320, 230, 4); g.fill();
      g.fillStyle = '#141c24'; A.rr(g, 100, 175, 300, 210, 3); g.fill();
      g.strokeStyle = '#2e3842'; g.lineWidth = 7;
      for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(100, 192 + i * 27); g.lineTo(400, 192 + i * 27); g.stroke(); }
      g.fillStyle = 'rgba(120,160,190,.1)'; g.fillRect(100, 175, 300, 26);
      // mural de avisos no centro-esquerda
      g.fillStyle = '#0a0c0e'; A.rr(g, 470, 158, 280, 150, 6); g.fill();
      g.fillStyle = '#241a10'; g.fillRect(478, 166, 264, 134);
      ['#e8e2d2', '#d8d2c4', '#e8e2d2', '#d4ccb8'].forEach((c, i) => {
        g.fillStyle = c; g.fillRect(488 + i * 64, 180 + (i % 2) * 8, 52, 66);
        g.fillStyle = 'rgba(40,40,40,.6)'; g.fillRect(496 + i * 64, 192 + (i % 2) * 8, 36, 3); g.fillRect(496 + i * 64, 204 + (i % 2) * 8, 28, 3);
      });
      A.text(g, 'AVISOS', 610, 148, { font: 'bold 13px "Courier New", monospace', color: 'rgba(210,190,150,.5)', spacing: 4 });
      // armários de arquivo à direita (gavetas e etiquetas; apoiados no piso)
      [880, 1105, 1330].forEach((x) => {
        g.fillStyle = '#0b0e11'; A.rr(g, x, 200, 175, 500, 5); g.fill();
        g.fillStyle = '#1b222a'; A.rr(g, x + 9, 210, 157, 470, 4); g.fill();
        for (let d = 0; d < 4; d++) {
          g.fillStyle = '#222a33'; g.fillRect(x + 20, 228 + d * 108, 135, 82);
          g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 20, 228 + d * 108, 135, 5);
          g.fillStyle = '#313c47'; A.rr(g, x + 58, 258 + d * 108, 60, 14, 3); g.fill();
        }
      });
      // mesa administrativa à frente com pilhas de papéis soltos
      g.fillStyle = '#080a0c'; g.fillRect(60, 545, 900, 155);
      g.fillStyle = '#161d24'; g.fillRect(74, 556, 872, 136);
      for (let i = 0; i < 9; i++) {
        g.fillStyle = i % 2 ? '#e3ddcf' : '#d6d0c0';
        g.save(); g.translate(110 + i * 95, 512 + (i % 3) * 10); g.rotate(((i * 37) % 10 - 5) * 0.012);
        g.fillRect(-34, -8, 68, 46); g.restore();
      }
      // telefone antigo na mesa
      g.fillStyle = '#0a0c0f'; A.rr(g, 700, 480, 110, 78, 8); g.fill();
      g.fillStyle = '#151a20'; A.ell(g, 755, 505, 16, 16); g.fill();
      g.fillStyle = '#04060a'; A.ell(g, 755, 505, 8, 8); g.fill();
      // porta (lado direito do escritório)
      g.fillStyle = '#030405'; g.fillRect(VW - 150, 150, 150, 550);
      g.fillStyle = '#0c1012'; g.fillRect(VW - 158, 134, 166, 16);
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(VW - 158, 134, 166, 3);
      // título mais acima
      A.text(g, 'ADMINISTRATIVO', 800, 108, { font: 'bold 28px "Courier New", monospace', color: 'rgba(165,210,240,.9)', spacing: 6 });
    } else if (room === 0) { // GALPÃO DE ENTRADA — porta de entrada + caixas e doca
      g.fillStyle = '#0b0e0f'; g.fillRect(60, 400, 1480, 300);
      g.fillStyle = '#1a1f23'; g.fillRect(70, 410, 1460, 280);
      // PORTA DE ENTRADA (por onde os amigos chegam)
      g.fillStyle = '#030405'; g.fillRect(652, 200, 296, 500);
      g.fillStyle = '#0c1012'; g.fillRect(636, 184, 328, 16); g.fillRect(636, 200, 16, 500); g.fillRect(948, 200, 16, 500);
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(636, 184, 328, 3);
      g.fillStyle = '#0d1512'; A.rr(g, 756, 96, 88, 44, 6); g.fill();
      A.text(g, 'ENTRADA', 800, 120, { font: 'bold 18px "Courier New", monospace', color: 'rgba(255,210,120,.75)', spacing: 3 });
      // (doca removida)
      // caixas no canto esquerdo (não atrapalham a porta nem as mesas; encostadas no piso)
      const boxPos = [[150, 520], [150, 610], [330, 520], [330, 610]];
      boxPos.forEach(p => {
        g.fillStyle = '#7a6c4e'; g.fillRect(p[0], p[1], 150, 90);
        g.fillStyle = '#8d7f5f'; g.fillRect(p[0], p[1] - 6, 150, 12);
        g.fillStyle = 'rgba(30,25,15,.45)'; g.fillRect(p[0] + 12, p[1] + 16, 90, 10);
      });
      // mesas de apoio separadas (duas pernas simétricas até o piso)
      g.fillStyle = '#0b0e0f'; g.fillRect(1120, 500, 200, 20); g.fillStyle = '#20262a'; g.fillRect(1130, 520, 180, 20); g.fillRect(1140, 540, 16, 160); g.fillRect(1284, 540, 16, 160);
      g.fillStyle = '#0b0e0f'; g.fillRect(1360, 500, 200, 20); g.fillStyle = '#20262a'; g.fillRect(1370, 520, 180, 20); g.fillRect(1380, 540, 16, 160); g.fillRect(1524, 540, 16, 160);
      A.text(g, 'GALPÃO DE ENTRADA', 800, 170, { font: 'bold 26px "Courier New", monospace', color: 'rgba(220,190,130,.85)', spacing: 6 });
    } else if (room === 1) { // RECEBIMENTO — balcão, prateleira e papéis
      // prateleira acima do balcão (sem sobreposições)
      g.fillStyle = '#0e1214'; g.fillRect(300, 250, 700, 16);
      g.fillStyle = '#8a7c5c'; g.fillRect(330, 214, 120, 36); g.fillRect(470, 214, 90, 36); g.fillRect(600, 214, 140, 36);
      // balcão (encostado no piso)
      g.fillStyle = '#0b0e0f'; g.fillRect(200, 480, 1200, 220);
      g.fillStyle = '#1a2026'; g.fillRect(220, 490, 1160, 210);
      // tampo do balcão com papéis e caixa (encostados no balcão)
      g.fillStyle = '#2a3135'; g.fillRect(500, 420, 600, 60);
      g.fillStyle = '#d8d2c2'; g.fillRect(560, 378, 80, 42); g.fillRect(680, 376, 110, 44);
      g.fillStyle = '#7a6c4e'; g.fillRect(830, 356, 120, 64);
      A.text(g, 'RECEBIMENTO', 800, 170, { font: 'bold 24px "Courier New", monospace', color: 'rgba(210,225,235,.85)', spacing: 8 });
    } else if (room === 3) { // ALMOXARIFADO — prateleiras e caixas
      g.fillStyle = '#0b0e0f'; g.fillRect(80, 320, 1440, 380);
      for (let s = 0; s < 3; s++) {
        const x = 120 + s * 460;
        g.fillStyle = '#0a0d0e'; g.fillRect(x, 340, 400, 340);
        for (let r = 0; r < 3; r++) {
          g.fillStyle = '#1a2023'; g.fillRect(x + 10, 360 + r * 100, 380, 10);
          g.fillStyle = '#8a7c5c'; g.fillRect(x + 20, 320 + r * 100, 110, 38);
        }
      }
      A.text(g, 'ALMOXARIFADO', 800, 170, { font: 'bold 26px "Courier New", monospace', color: 'rgba(215,200,160,.85)', spacing: 8 });
    } else if (room === 4) { // PRODUÇÃO — mesas de trabalho
      g.fillStyle = '#0b0e0f'; g.fillRect(100, 420, 1400, 280);
      g.fillStyle = '#1a1f23'; g.fillRect(110, 430, 1380, 270);
      for (let i = 0; i < 3; i++) { g.fillStyle = '#0b0e0f'; g.fillRect(200 + i*430, 500, 360, 18); g.fillStyle = '#20262a'; g.fillRect(220 + i*430, 518, 320, 60); }
      A.text(g, 'PRODUÇÃO', 800, 170, { font: 'bold 26px "Courier New", monospace', color: 'rgba(200,215,230,.85)', spacing: 10 });
    } else if (room === 6) { // ACABAMENTO E CORTE — mesa de corte
      g.fillStyle = '#0b0e0f'; g.fillRect(200, 420, 1200, 280);
      g.fillStyle = '#1a1f23'; g.fillRect(220, 430, 1160, 270);
      g.fillStyle = '#c9c2ae'; g.fillRect(400, 460, 800, 40); // papel na mesa de corte
      A.text(g, 'ACABAMENTO E CORTE', 800, 170, { font: 'bold 24px "Courier New", monospace', color: 'rgba(220,220,215,.85)', spacing: 6 });
    }
    // título da câmera
    const camTags = ['CAM 1A', 'CAM 1B', 'CAM 1C', 'CAM 2A', 'CAM 2B', 'CAM 3A', 'CAM 3B', 'CAM 4A', 'CAM 4B'];
    A.text(g, (camTags[room | 0] || 'CAM') + ' — ' + (roomNames[room | 0] || 'SALA'), VW / 2, 60, {
      font: 'bold 32px "Courier New", monospace', color: 'rgba(150,255,195,.92)', spacing: 4
    });
    // timestamp
    A.text(g, 'REC ●', 24, 60, { font: 'bold 38px "Courier New", monospace', color: '#ff3b30', align: 'left', baseline: 'middle' });
    // amigos na sala (pode haver mais de um) — posições fixas com folga mínima:
    // nunca dois amigos na mesma posição nem um em cima do outro
    let friends = [];
    const raw = S.cameras ? S.cameras[room | 0] : null;
    if (Array.isArray(raw)) friends = raw.slice();
    else if (raw) friends = [raw];
    // fallback: quem está com pos === room mesmo sem estar na lista da câmera (só após ligar)
    ['hori', 'akira', 'leo', 're'].forEach(id => {
      const ch = S.chars ? S.chars[id] : null;
      const rp = id === 're' ? (S.re ? S.re.pos : null) : (ch ? ch.pos : null);
      const arrived = id === 're' ? (S.re && S.re.arrived) : (ch && ch.arrived);
      const called = S.friendCallNotified ? !!S.friendCallNotified[id] : true;
      const atDoor = S.doors && (S.doors.F.char === id || S.doors.B.char === id);
      if (called && arrived && rp === (room | 0) && !friends.includes(id) && !atDoor) friends.push(id);
    });
    // só amigos que já ligaram e terminaram a ligação (e chegaram)
    friends = friends.filter(id => !S.friendCallNotified || S.friendCallNotified[id]);
    // nos corredores, o amigo na porta também ocupa uma posição (nunca a mesma de outro)
    const corridorDoorSide = room === 7 ? 'F' : room === 8 ? 'B' : null;
    const corridorDoorFriend = corridorDoorSide && S.doors && S.doors[corridorDoorSide] ? S.doors[corridorDoorSide].char : null;
    const corridorDoorEnter = corridorDoorSide && S.doors && S.doors[corridorDoorSide] && S.doors[corridorDoorSide].enterT != null ? S.doors[corridorDoorSide].enterT : 1;
    const drawList = [];
    if (corridorDoorFriend && corridorDoorEnter > 0.45) drawList.push({ id: corridorDoorFriend, door: true });
    friends.forEach(fid => { if (fid !== corridorDoorFriend) drawList.push({ id: fid, door: false }); });
    if (drawList.length) {
      const N = drawList.length, STEP = 380, SPAN = (N - 1) * STEP;
      drawList.forEach((item, i) => {
        const slot = VW / 2 - SPAN / 2 + i * STEP;
        const r = S.roaming && S.roaming[item.id];
        const jitter = r && typeof r.x === 'number' ? Math.max(-60, Math.min(60, r.x)) : 0;
        const wave = Math.sin(t * 1.2 + i * 1.7) * 3;
        const cx = slot + jitter + wave;
        if (item.door) {
          // no fundo do corredor, de costas, para a porta da sala
          const doorSide = corridorDoorSide;
          if (!ART.SPRITES || !ART.SPRITES[item.id]) return;
          const spr = ART.SPRITES[item.id].idle;
          if (!spr || !spr.complete || !spr.naturalWidth) return;
          const lit = !!(S.doors[doorSide] && S.doors[doorSide].light);
          const k = Math.min(225 / spr.naturalWidth, 270 / spr.naturalHeight);
          const w = spr.naturalWidth * k, h = spr.naturalHeight * k;
          const by = 640;
          // sombra projetada no chão
          g.fillStyle = lit ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.75)';
          A.ell(g, cx, 648, 110, 14); g.fill();
          if (lit) {
            // luz por trás: contorno brilhante contornando o amigo de costas
            g.save();
            g.filter = 'brightness(2.6) sepia(1) saturate(2.3)';
            g.drawImage(spr, cx - w / 2, by - h, w, h);
            g.restore();
          }
          // silhueta escura (de costas)
          g.save();
          g.filter = 'brightness(0)';
          g.drawImage(spr, cx - w / 2, by - h, w, h);
          g.restore();
          return;
        }
        const fid = item.id;
        if (!ART.CHARS[fid]) return;
        const by = 720 + wave * 0.4;
        A.mascot(g, fid, { x: cx, y: by, scale: 1.45, t: t + i * 0.7, bright: 0.85 });
        A.text(g, ART.CHARS[fid].name, cx, 200 + i * 28, {
          font: 'bold 24px "Courier New", monospace', color: 'rgba(255,220,160,.8)', spacing: 3
        });
      });
    } else {
      A.text(g, 'sem movimento', VW / 2, VH / 2, {
        font: '18px "Courier New", monospace', color: 'rgba(120,160,150,.55)', spacing: 2
      });
    }
    // flicker sutil
    if (Math.random() < 0.08) {
      g.fillStyle = 'rgba(255,255,255,.04)';
      g.fillRect(0, 0, VW, VH);
    }
    // ---- filtro de falha da câmera (piora com gente na sala) ----
    const fault = drawList.length ? Math.min(1, 0.4 + 0.3 * drawList.length) : 0.12;
    // estática extra
    A.grain(g, VW, VH, 0.22 + fault * 0.42, (t * 97) % 512, (t * 131) % 512);
    // faixa de rolamento lenta (deriva do sinal)
    const bandY = ((t * 55) % (VH + 260)) - 130;
    g.fillStyle = 'rgba(190,230,255,' + (0.03 + fault * 0.09) + ')';
    g.fillRect(0, bandY, VW, 90);
    // rasgos horizontais (deslocamento do sinal)
    if (Math.random() < 0.12 + fault * 0.3) {
      const y = Math.random() * VH;
      const h = Math.max(4, 8 + Math.random() * 60 * (0.5 + fault));
      g.drawImage(g.canvas, 0, y, VW, h, (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 46 * fault), y, VW, h);
    }
    // barras pretas aleatórias
    if (Math.random() < fault * 0.25) {
      const y = Math.random() * VH;
      g.fillStyle = 'rgba(0,0,0,.5)';
      g.fillRect(0, y, VW, 5 + Math.random() * 16);
    }
    // perda de sinal ocasional
    if (Math.random() < fault * 0.045) {
      g.fillStyle = 'rgba(0,0,0,.4)';
      g.fillRect(0, 0, VW, VH);
    }
    A.vignette(g, VW, VH, 0.88);
    A.scanlines(g, VW, VH, 0.2);
    // câmera fora de sincronia por ~1s quando alguém se move entre salas
    if (S.camGlitchT > 0) {
      const g2 = Math.min(1, S.camGlitchT / 0.9);
      for (let i = 0; i < 7; i++) {
        const y = Math.random() * VH;
        const h = 18 + Math.random() * 110;
        g.fillStyle = 'rgba(190,215,225,' + (0.06 + Math.random() * 0.25 * g2) + ')';
        g.fillRect(0, y, VW, h);
        g.drawImage(g.canvas, 0, y, VW, h, (Math.random() - 0.5) * 80 * g2, y, VW, h);
      }
      g.fillStyle = 'rgba(0,0,0,' + (0.28 * g2) + ')';
      g.fillRect(0, 0, VW, VH);
      A.grain(g, VW, VH, 0.35 + 0.3 * g2, (t * 211) % 512, (t * 173) % 512);
    }
  };
})(ART);
