/* Campo de líneas: el recurso gráfico de la marca.
   Líneas finas y translúcidas que nacen dispersas a la izquierda y convergen en un haz calmo a la derecha,
   con algunos puntos de luz que viajan por ellas (los que llegan toman el color de destaque).
   Uso: <canvas class="campo" data-campo="hero|cabecera" aria-hidden="true"></canvas> dentro de un contenedor con position:relative.
   Colores: variables CSS --campo y --campo-destaque del canvas. Con movimiento reducido, se dibuja quieto.
   Arranca cuando la página terminó de cargar (no compite con la primera pintura) y en celular dibuja más liviano. */
(function () {
  var lienzos = document.querySelectorAll('canvas.campo');
  if (!lienzos.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Escritorio: el texto va a la izquierda, así que las líneas se atenúan ahí (máscara).
  // Celular: el texto va arriba, así que las líneas nacen en la parte de abajo.
  var CFG = {
    hero: {
      ancho: { n: 64, conv: { x: 1.02, y: 0.6 }, banda: 0.05, mascara: [0.42, 0.66], min: 0.1, puntos: 30 },
      angosto: { n: 46, conv: { x: 1.04, y: 0.88 }, banda: 0.04, yMin: 0.6, puntos: 18 }
    },
    cabecera: {
      ancho: { n: 44, conv: { x: 1.02, y: 0.55 }, banda: 0.05, mascara: [0.5, 0.75], min: 0.06, puntos: 16 },
      angosto: { n: 32, conv: { x: 1.04, y: 0.9 }, banda: 0.04, yMin: 0.66, puntos: 10 }
    }
  };

  function rgb(v) {
    v = (v || '').trim();
    if (v.charAt(0) === '#') { var n = parseInt(v.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    var m = v.match(/\d+/g); return m ? m.slice(0, 3).map(Number) : [11, 100, 112];
  }
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function suave(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  var campos = [].map.call(lienzos, function (cv, i) {
    return { cv: cv, ctx: cv.getContext('2d'), tipo: CFG[cv.dataset.campo] ? cv.dataset.campo : 'hero', semilla: 4 + i * 7 };
  });

  function preparar(F) {
    var r = F.cv.getBoundingClientRect(), angosto = r.width < 700, d = Math.min(window.devicePixelRatio || 1, angosto ? 1.5 : 2);
    F.w = r.width; F.h = r.height; F.angosto = angosto;
    F.cv.width = Math.round(F.w * d); F.cv.height = Math.round(F.h * d);
    F.ctx.setTransform(d, 0, 0, d, 0, 0);
    F.cfg = CFG[F.tipo][angosto ? 'angosto' : 'ancho'];
    var R = rng(F.semilla), c = F.cfg; F.R = R; F.L = []; F.P = [];
    for (var i = 0; i < c.n; i++) {
      var y0 = c.yMin != null ? c.yMin + R() * (1.15 - c.yMin) : -0.1 + R() * 1.2;
      F.L.push({ y0: y0, ye: c.conv.y + (R() - 0.5) * c.banda, f: 1.2 + R() * 2.4, amp: 0.04 + R() * 0.11, ph: R() * 6.28, sp: 0.15 + R() * 0.35, a: 0.07 + R() * 0.16, w: 0.6 + R() * 1.1 });
    }
    for (var j = 0; j < c.puntos; j++) F.P.push({ l: Math.floor(R() * c.n), u: R(), v: 0.035 + R() * 0.05, r: 1.6 + R() * 2.2, hi: R() < 0.4 });
    var cs = getComputedStyle(F.cv); F.col = rgb(cs.getPropertyValue('--campo')); F.dest = rgb(cs.getPropertyValue('--campo-destaque'));
    // Los degradés de cada línea no cambian entre cuadros: se arman una sola vez.
    var a = F.col, cfg = c, m = cfg.mascara;
    F.L.forEach(function (l) {
      var g = F.ctx.createLinearGradient(0, 0, F.w, 0);
      if (m) {
        g.addColorStop(0, 'rgba(' + a + ',' + (l.a * cfg.min) + ')'); g.addColorStop(m[0], 'rgba(' + a + ',' + (l.a * cfg.min) + ')');
        g.addColorStop(m[1], 'rgba(' + a + ',' + l.a + ')'); g.addColorStop(1, 'rgba(' + a + ',' + Math.min(1, l.a * 1.8) + ')');
      } else {
        g.addColorStop(0, 'rgba(' + a + ',' + (l.a * 0.5) + ')'); g.addColorStop(0.6, 'rgba(' + a + ',' + l.a + ')'); g.addColorStop(1, 'rgba(' + a + ',' + Math.min(1, l.a * 1.8) + ')');
      }
      l.g = g;
    });
    var cx = cfg.conv.x * F.w, cy = cfg.conv.y * F.h; F.halo = F.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(F.w, F.h) * 0.22);
    F.halo.addColorStop(0, 'rgba(' + a + ',.10)'); F.halo.addColorStop(1, 'rgba(' + a + ',0)');
  }
  function yEn(F, l, u, t) { var c = Math.pow(suave(0.08, 1, u), 1.25); return (l.y0 + (l.ye - l.y0) * c + Math.sin(u * l.f * 6.283 + l.ph + t * l.sp) * l.amp * (1 - c)) * F.h; }
  function xEn(F, u) { return (-0.04 + u * (F.cfg.conv.x + 0.04)) * F.w; }
  function masc(F, x) { var m = F.cfg.mascara; return m ? F.cfg.min + (1 - F.cfg.min) * suave(m[0], m[1], x / F.w) : 1; }

  function dibujar(F, t) {
    if (!F.w) return;
    var c = F.ctx, w = F.w, h = F.h, a = F.col, pasos = F.angosto ? 36 : 56;
    c.clearRect(0, 0, w, h); c.lineCap = 'round';
    F.L.forEach(function (l) {
      c.strokeStyle = l.g; c.lineWidth = l.w; c.beginPath();
      for (var k = 0; k <= pasos; k++) { var u = k / pasos, x = xEn(F, u), y = yEn(F, l, u, t); if (k) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
    });
    c.fillStyle = F.halo; c.fillRect(0, 0, w, h);
    F.P.forEach(function (p) {
      var l = F.L[p.l], x = xEn(F, p.u), y = yEn(F, l, p.u, t), al = Math.sin(Math.min(p.u, 1) * Math.PI) * masc(F, x);
      var col = (p.hi && p.u > 0.6) ? F.dest : a;
      // En celular, el brillo se simula con un círculo translúcido (el desenfoque de sombra es caro).
      if (F.angosto) { c.fillStyle = 'rgba(' + col + ',' + (al * 0.22) + ')'; c.beginPath(); c.arc(x, y, p.r * 2.6, 0, 6.283); c.fill(); }
      else { c.save(); c.shadowColor = 'rgba(' + col + ',' + al + ')'; c.shadowBlur = 10; }
      c.fillStyle = 'rgba(' + col + ',' + Math.min(1, al * 1.1) + ')';
      c.beginPath(); c.arc(x, y, p.r, 0, 6.283); c.fill();
      if (!F.angosto) c.restore();
    });
  }
  function avanzar(F, dt) { F.P.forEach(function (p) { p.u += p.v * dt; if (p.u > 1.02) { p.u = 0; p.l = Math.floor(F.R() * F.L.length); } }); }

  var visibles = new Set(), t0 = null, corriendo = false;
  function cuadro(ts) {
    if (!visibles.size) { corriendo = false; return; }
    if (t0 == null) t0 = ts; var t = (ts - t0) / 1000;
    visibles.forEach(function (F) { avanzar(F, 1 / 60); dibujar(F, t); });
    requestAnimationFrame(cuadro);
  }
  function arrancar() { if (!corriendo && !reduce) { corriendo = true; requestAnimationFrame(cuadro); } }

  function empezar() {
  campos.forEach(function (F) { preparar(F); dibujar(F, 0); F.cv.classList.add('listo'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var F = campos.filter(function (x) { return x.cv === e.target; })[0]; if (e.isIntersecting) visibles.add(F); else visibles.delete(F); });
      arrancar();
    });
    campos.forEach(function (F) { io.observe(F.cv); });
  } else { campos.forEach(function (F) { visibles.add(F); }); arrancar(); }
  }
  // Se dibuja después de la carga, en un momento libre del navegador.
  function cuandoCargue() { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(empezar, { timeout: 1500 }); }
  if (document.readyState === 'complete') cuandoCargue(); else window.addEventListener('load', cuandoCargue);

  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { campos.forEach(function (F) { preparar(F); dibujar(F, 0); }); }, 150); });
})();
