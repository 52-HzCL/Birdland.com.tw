/* BLSketch — tiny hand-drawn canvas renderer for the AsiaSource configurator.
   Vendored, dependency-free, Canvas 2D only (the owner's call: no SVG).
   The double-stroke + jitter approach is distilled from rough.js (MIT,
   github.com/rough-stuff/rough) but hand-rolled so we ship ~4KB instead of
   9KB gzip and stay stdlib-of-the-web.

   Determinism: every shape takes a seed, so a redraw (hover/selection) traces
   exactly the same wobble — no shimmer — and screenshots are reproducible.
   Hit testing: parts are closed polygons kept as Path2D in the same
   normalized 0..100 space; isPointInPath answers hover/click (the cheapest
   correct option for 5-8 fixed regions). */
(function () {
  'use strict';

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* One wobbly pass over a polyline: split every edge into ~seg-length pieces,
     push each intermediate point sideways a little. */
  function wobble(pts, closed, rough, rnd) {
    var out = [];
    var n = pts.length;
    var last = closed ? n : n - 1;
    for (var i = 0; i < last; i++) {
      var a = pts[i], b = pts[(i + 1) % n];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var steps = Math.max(1, Math.round(len / 7));
      var nx = -dy / len, ny = dx / len; // unit normal
      for (var s = 0; s < steps; s++) {
        var t = s / steps;
        var off = (s === 0 && i === 0 && !closed) ? 0 : (rnd() - 0.5) * 2 * rough;
        out.push([a[0] + dx * t + nx * off, a[1] + dy * t + ny * off]);
      }
    }
    out.push(closed ? out[0].slice() : pts[n - 1].slice());
    return out;
  }

  function trace(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i], q = pts[i - 1];
      // quadratic through midpoints keeps the wobble from looking polygonal
      ctx.quadraticCurveTo(q[0], q[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  }

  /* The hand-drawn signature: two passes with different wobble, the second
     lighter — a pen going over the line twice. */
  function sketchStroke(ctx, pts, o) {
    var rnd1 = mulberry32(o.seed), rnd2 = mulberry32(o.seed + 7919);
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = o.ink;
    ctx.lineWidth = o.width;
    ctx.globalAlpha = 1;
    trace(ctx, wobble(pts, !!o.closed, o.rough, rnd1)); ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = o.width * 0.8;
    trace(ctx, wobble(pts, !!o.closed, o.rough * 1.6, rnd2)); ctx.stroke();
    ctx.restore();
  }

  /* Hachure fill: parallel jittered lines clipped to the polygon. */
  function hachure(ctx, poly, o) {
    var rnd = mulberry32(o.seed + 104729);
    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    poly.forEach(function (p) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
    });
    var path = new Path2D();
    path.moveTo(poly[0][0], poly[0][1]);
    for (var i = 1; i < poly.length; i++) path.lineTo(poly[i][0], poly[i][1]);
    path.closePath();
    ctx.save();
    ctx.clip(path);
    ctx.strokeStyle = o.color;
    ctx.lineWidth = o.width;
    ctx.globalAlpha = o.alpha;
    ctx.lineCap = 'round';
    var ang = (o.angle === undefined ? -41 : o.angle) * Math.PI / 180;
    var ca = Math.cos(ang), sa = Math.sin(ang);
    var diag = Math.hypot(maxX - minX, maxY - minY);
    var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    for (var d = -diag / 2; d < diag / 2; d += o.gap) {
      var jx = (rnd() - 0.5) * o.gap * 0.5, jy = (rnd() - 0.5) * o.gap * 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + d * -sa - (diag / 2) * ca + jx, cy + d * ca - (diag / 2) * sa + jy);
      ctx.lineTo(cx + d * -sa + (diag / 2) * ca + jx, cy + d * ca + (diag / 2) * sa + jy);
      ctx.stroke();
    }
    ctx.restore();
  }

  function ellipsePts(cx, cy, rx, ry, n) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = (i / n) * Math.PI * 2;
      pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
    }
    return pts;
  }

  /* Engineering-style leader line: dot anchor, angled run, horizontal tail.
     Deliberately NOT wobbled — annotation stays legible against the sketch. */
  function leader(ctx, x, y, tx, ty, text, o) {
    ctx.save();
    ctx.strokeStyle = o.ink; ctx.fillStyle = o.ink;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    var tailDir = tx >= x ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.lineTo(tx + 8 * tailDir, ty); ctx.stroke();
    ctx.font = o.font;
    ctx.textAlign = tailDir > 0 ? 'left' : 'right';
    ctx.textBaseline = 'middle';
    // Clamp the text inside the visible canvas: a right-aligned label near the
    // left edge (or left-aligned near the right) otherwise loses its first
    // glyphs off-canvas — this shipped once with "Handle" reading "landle".
    var tx2 = tx + 10 * tailDir, w = ctx.measureText(text).width;
    if (o.minX !== undefined && tailDir < 0 && tx2 - w < o.minX) tx2 = o.minX + w;
    if (o.maxX !== undefined && tailDir > 0 && tx2 + w > o.maxX) tx2 = o.maxX - w;
    ctx.fillText(text, tx2, ty);
    ctx.restore();
  }

  /* Draw one product. spec = {parts:[{id,poly|ellipse,label:[ax,ay,tx,ty]}]},
     state = {hover, selected:{partId:true}, labels:{partId:text}}.
     Everything is authored in 0..100 space; scale maps it to the canvas. */
  function drawProduct(ctx, spec, state, opts) {
    var o = Object.assign({
      ink: '#2b2b26', accent: '#2f5d3a', muted: '#8a8578',
      rough: 0.9, width: 1.6, seed: 1, pad: 8, font: '600 4.2px Arial'
    }, opts || {});
    var W = ctx.canvas.width, H = ctx.canvas.height;
    var scale = Math.min(W, H) / (100 + o.pad * 2);
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.translate((W - 100 * scale) / 2, (H - 100 * scale) / 2);
    ctx.scale(scale, scale);
    (spec.parts || []).forEach(function (part, i) {
      var poly = part.ellipse
        ? ellipsePts(part.ellipse[0], part.ellipse[1], part.ellipse[2], part.ellipse[3], 24)
        : part.poly;
      var seed = o.seed + i * 31;
      var sel = state && state.selected && state.selected[part.id];
      var hov = state && state.hover === part.id;
      if (sel) hachure(ctx, poly, { seed: seed, color: o.accent, width: 0.9, gap: 3.2, alpha: 0.55 });
      else hachure(ctx, poly, { seed: seed, color: o.muted, width: 0.6, gap: 6.5, alpha: 0.28 });
      sketchStroke(ctx, poly, {
        seed: seed, ink: sel || hov ? o.accent : o.ink,
        rough: o.rough, width: hov || sel ? o.width * 1.25 : o.width, closed: true
      });
    });
    // leaders drawn after all bodies so text sits on top
    (spec.parts || []).forEach(function (part) {
      if (!part.label) return;
      var txt = (state && state.labels && state.labels[part.id]) || part.name || part.id;
      leader(ctx, part.label[0], part.label[1], part.label[2], part.label[3], txt,
        { ink: o.ink, font: o.font,
          minX: -(W - 100 * scale) / 2 / scale + 1,
          maxX: 100 + (W - 100 * scale) / 2 / scale - 1 });
    });
    ctx.restore();
    return scale;
  }

  /* Build Path2D hit regions in canvas pixel space for the last draw. */
  function hitPaths(spec, canvas, pad) {
    var W = canvas.width, H = canvas.height;
    var p = pad === undefined ? 8 : pad;
    var scale = Math.min(W, H) / (100 + p * 2);
    var ox = (W - 100 * scale) / 2, oy = (H - 100 * scale) / 2;
    return (spec.parts || []).map(function (part) {
      var poly = part.ellipse
        ? ellipsePts(part.ellipse[0], part.ellipse[1], part.ellipse[2], part.ellipse[3], 24)
        : part.poly;
      var path = new Path2D();
      poly.forEach(function (pt, i) {
        var x = ox + pt[0] * scale, y = oy + pt[1] * scale;
        if (i === 0) path.moveTo(x, y); else path.lineTo(x, y);
      });
      path.closePath();
      return { id: part.id, path: path };
    });
  }

  window.BLSketch = { drawProduct: drawProduct, hitPaths: hitPaths };
})();
