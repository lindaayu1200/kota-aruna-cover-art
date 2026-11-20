// The poster engine: a deterministic, 6x4-unit-grid, multi-panel cover.
// No external images, fonts or network requests: only canvas drawing plus
// the photos handed in through state.photos.

import { mulberry32 } from './rng.js';
import * as art from './art.js';

export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  landscape: [1920, 1080],
};

export const DEFAULT_STATE = {
  size: 'landscape',
  seed: 20261120,
  title: 'KOTA ARUNA',
  subtitle: 'A CITY UNDER GLASS',
  tagline: 'THE SUNSET IS FREE. THE REST COSTS DOUBLE.',
  crew: [
    'MARISOL "MIRA" VEGA',
    'DAMAR SUSILO',
    'BENNY OJO',
    'KAPTEN RUKUN',
    'NINAH PRATIWI',
  ],
  photos: [null, null, null, null, null],
  focus: 0,
  useOne: false,
};

const DISPLAY = 'Impact, Haettenschweiler, "Arial Narrow Bold", "DejaVu Sans", sans-serif';
const MONO = '"DejaVu Sans Mono", monospace';
const SERIF = 'Georgia, "DejaVu Serif", serif';

const SCENES = ['skyline', 'palms', 'cranes', 'highway', 'pier'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function measureTracked(ctx, text, tracking) {
  let width = 0;
  for (const ch of String(text)) width += ctx.measureText(ch).width + tracking;
  return Math.max(0, width - tracking);
}

function tracked(ctx, text, x, y, tracking, align = 'left') {
  const width = measureTracked(ctx, text, tracking);
  let cursor = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  for (const ch of String(text)) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + tracking;
  }
  return width;
}

function fitSize(ctx, text, maxWidth, maxSize, font, weight = 900, tracking = 0) {
  let size = maxSize;
  ctx.font = `${weight} ${size}px ${font}`;
  const width = measureTracked(ctx, text, tracking);
  if (width > maxWidth && width > 0) {
    size = Math.max(6, (size * maxWidth) / width);
    ctx.font = `${weight} ${size}px ${font}`;
  }
  return size;
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s+\S*$/, '')}…`;
    return kept;
  }
  return lines;
}

function imageSize(img) {
  return {
    width: img.width || img.naturalWidth || 1,
    height: img.height || img.naturalHeight || 1,
  };
}

export function resolvePhotos(state) {
  const own = Array.from({ length: 5 }, (_, i) => {
    const slot = state.photos && state.photos[i];
    if (!slot || !slot.img) return null;
    return {
      img: slot.img,
      zoom: clamp(Number(slot.zoom) || 1, 1, 4),
      panX: clamp(Number(slot.panX) || 0, -1, 1),
      panY: clamp(Number(slot.panY) || 0, -1, 1),
    };
  });
  if (!state.useOne) return own;
  const first = own.find(Boolean);
  if (!first) return own;
  return own.map((slot) => ({
    img: first.img,
    zoom: slot ? slot.zoom : first.zoom,
    panX: slot ? slot.panX : first.panX,
    panY: slot ? slot.panY : first.panY,
  }));
}

export function panelRects(W, H) {
  const ux = W / 6;
  const uy = H / 4;
  const weights = [0.94, 1.02, 1.1, 1.02, 0.94];
  const margin = ux * 0.28;
  const gap = ux * 0.09;
  const available = W - margin * 2 - gap * 4;
  const total = weights.reduce((sum, value) => sum + value, 0);
  const y = uy * 1.93;
  const h = uy * 1.1;
  let x = margin;
  return weights.map((weight) => {
    const width = (available * weight) / total;
    const rect = { x, y, w: width, h };
    x += width + gap;
    return rect;
  });
}

function drawCoverPhoto(ctx, img, x, y, w, h, zoom, panX, panY) {
  const src = imageSize(img);
  const scale = (Math.max(w / src.width, h / src.height) * zoom);
  const dw = src.width * scale;
  const dh = src.height * scale;
  ctx.drawImage(
    img,
    x + (w - dw) / 2 + panX * w * 0.32,
    y + (h - dh) / 2 + panY * h * 0.32,
    dw,
    dh,
  );
}

function drawScene(ctx, kind, x, y, w, h, rng, palette) {
  if (kind === 'palms') art.palms(ctx, x, y, w, h, rng, palette);
  else if (kind === 'cranes') art.cranes(ctx, x, y, w, h, rng, palette);
  else if (kind === 'highway') art.highway(ctx, x, y, w, h, rng, palette);
  else if (kind === 'pier') art.pier(ctx, x, y, w, h, rng, palette);
  else art.skyline(ctx, x, y, w, h, rng, palette);
  if (kind === 'skyline') {
    art.skyGradient(ctx, x, y, w, h * 0.75, rng, palette);
    art.bandedSun(ctx, x + w * 0.42, y + h * 0.08, w * 0.5, h * 0.5, rng, palette);
    art.skyline(ctx, x, y + h * 0.38, w, h * 0.62, rng, palette);
    art.water(ctx, x, y + h * 0.84, w, h * 0.16, rng, palette);
  }
  art.vignette(ctx, x, y, w, h, rng, palette);
}

function drawPanel(ctx, rect, index, photo, crewName, seed, ux) {
  const { x, y, w, h } = rect;
  const P = art.PALETTE;
  const outline = Math.max(5, ux * 0.03);
  const cream = Math.max(3, ux * 0.022);
  const rng = mulberry32((seed | 0) + index * 7919 + 31);

  ctx.save();
  ctx.shadowColor = 'rgba(20,16,33,0.48)';
  ctx.shadowBlur = Math.max(10, ux * 0.09);
  ctx.shadowOffsetY = Math.max(4, ux * 0.035);
  ctx.fillStyle = P.ink;
  ctx.fillRect(x - outline, y - outline, w + outline * 2, h + outline * 2);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (photo) {
    drawCoverPhoto(ctx, photo.img, x, y, w, h, photo.zoom, photo.panX, photo.panY);
  } else {
    drawScene(ctx, SCENES[index % SCENES.length], x, y, w, h, rng, P);
  }
  art.halftone(ctx, x, y, w, h, rng, P);

  const plateH = h * 0.22;
  ctx.fillStyle = 'rgba(20,16,33,0.88)';
  ctx.fillRect(x, y + h - plateH, w, plateH);
  ctx.fillStyle = P.magenta;
  ctx.fillRect(x, y + h - plateH, w, Math.max(2, h * 0.012));

  const padding = Math.max(6, w * 0.055);
  const fs = fitSize(ctx, crewName, w - padding * 2, h * 0.105, DISPLAY, 900, 0.4);
  ctx.font = `900 ${fs}px ${DISPLAY}`;
  ctx.fillStyle = P.cream;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const lines = wrapLines(ctx, crewName, w - padding * 2, 2);
  lines.forEach((line, i) => {
    const baseline = y + h - plateH + plateH * ((i + 1) / (lines.length + 1));
    tracked(ctx, line, x + padding, baseline, 0.4, 'left');
  });

  ctx.font = `${Math.max(8, w * 0.055)}px ${MONO}`;
  ctx.fillStyle = P.cyan;
  ctx.textBaseline = 'top';
  ctx.fillText(String(index + 1).padStart(2, '0'), x + padding, y + padding);
  ctx.restore();

  ctx.strokeStyle = P.cream;
  ctx.lineWidth = cream;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = P.ink;
  ctx.lineWidth = outline;
  ctx.strokeRect(x - outline, y - outline, w + outline * 2, h + outline * 2);
}

function drawTitle(ctx, text, box, ux, uy) {
  const P = art.PALETTE;
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).slice(0, 4);
  const lines = words.length ? words : ['KOTA'];
  const maxFont = box.h / (lines.length * 0.98 + 0.2);
  ctx.font = `900 100px ${DISPLAY}`;
  const widestRatio = Math.max(...lines.map((line) => ctx.measureText(line).width / 100));
  const fontSize = Math.max(18, Math.min(maxFont, box.w / widestRatio));
  ctx.font = `900 ${fontSize}px ${DISPLAY}`;
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const stretch = clamp((box.w * 0.96) / Math.max(1, widest), 1, 1.28);
  const stroke = Math.max(5, ux * 0.033);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  lines.forEach((line, i) => {
    const baseline = box.y + fontSize * 0.82 + i * fontSize * 0.98;
    ctx.save();
    ctx.translate(box.x, baseline);
    ctx.scale(stretch, 1);
    ctx.font = `900 ${fontSize}px ${DISPLAY}`;
    ctx.fillStyle = P.magenta;
    ctx.fillText(line, ux * 0.055, uy * 0.048);
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = stroke;
    ctx.strokeText(line, 0, 0);
    ctx.fillStyle = P.cream;
    ctx.fillText(line, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

function drawSubtitle(ctx, text, x, y, w, h, ux) {
  const P = art.PALETTE;
  ctx.fillStyle = P.ink;
  ctx.fillRect(x - ux * 0.02, y - h * 0.08, w + ux * 0.04, h * 1.16);
  ctx.fillStyle = P.magenta;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = P.cream;
  ctx.fillRect(x, y, w, Math.max(2, h * 0.07));
  ctx.fillRect(x, y + h * 0.93, w, Math.max(2, h * 0.07));

  const label = String(text || '').toUpperCase();
  const tracking = Math.max(1, h * 0.075);
  const pad = Math.max(8, h * 0.28);
  const size = fitSize(ctx, label, w - pad * 2 - h * 1.5, h * 0.68, DISPLAY, 900, tracking);
  ctx.font = `900 ${size}px ${DISPLAY}`;
  ctx.fillStyle = P.cream;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  tracked(ctx, label, x + pad, y + h * 0.52, tracking, 'left');

  ctx.fillStyle = P.cyan;
  ctx.fillRect(x + w - h * 1.12, y + h * 0.22, h * 0.68, h * 0.56);
  ctx.fillStyle = P.ink;
  ctx.font = `700 ${Math.max(8, h * 0.34)}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText('01', x + w - h * 0.78, y + h * 0.56);
}

function drawBand(ctx, state, x, y, w, h, seed, ux, uy) {
  const P = art.PALETTE;
  const rng = mulberry32((seed | 0) + 5501);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  art.skyGradient(ctx, x, y, w, h, rng, P);
  art.bandedSun(ctx, x + w * 0.63, y - h * 0.12, h * 1.25, h * 1.25, rng, P);
  art.halftone(ctx, x, y, w, h, rng, P);
  art.water(ctx, x, y + h * 0.68, w, h * 0.36, rng, P);
  art.skyline(ctx, x, y + h * 0.26, w, h * 0.62, rng, P);
  art.cranes(ctx, x + w * 0.02, y + h * 0.18, w * 0.34, h * 0.64, rng, P);
  art.palms(ctx, x + w * 0.78, y + h * 0.06, w * 0.22, h * 0.78, rng, P);

  const credit = ['KOTA ARUNA', 'A make.fun original', '2026'];
  const fs = Math.max(9, Math.min(ux * 0.078, h * 0.115));
  ctx.font = `${fs}px ${MONO}`;
  const widest = Math.max(...credit.map((line) => ctx.measureText(line).width));
  const boxW = widest + fs * 0.9;
  const boxH = fs * credit.length * 1.32 + fs * 0.5;
  const bx = x + w - boxW - ux * 0.12;
  const by = y + h - boxH - h * 0.1;
  ctx.fillStyle = 'rgba(20,16,33,0.76)';
  ctx.fillRect(bx - fs * 0.45, by - fs * 0.3, boxW, boxH);
  ctx.fillStyle = P.magenta;
  ctx.fillRect(bx - fs * 0.45, by - fs * 0.3, Math.max(2, fs * 0.16), boxH);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  credit.forEach((line, i) => {
    ctx.font = `${i === 0 ? 700 : 400} ${fs}px ${MONO}`;
    ctx.fillStyle = i === 2 ? P.cyan : P.cream;
    ctx.fillText(line, bx + widest, by + i * fs * 1.32);
  });
  ctx.restore();

  ctx.strokeStyle = P.cream;
  ctx.lineWidth = Math.max(2, ux * 0.016);
  ctx.beginPath();
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x + w, y + 1);
  ctx.stroke();
}

function drawTagline(ctx, text, x, y, w, h, ux) {
  const P = art.PALETTE;
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, P.ink);
  g.addColorStop(0.5, '#4a123f');
  g.addColorStop(1, P.ink);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = P.magenta;
  ctx.fillRect(x, y, w, Math.max(2, h * 0.09));

  const label = String(text || '').toUpperCase();
  const tracking = Math.max(1, h * 0.1);
  const size = fitSize(ctx, label, w - ux * 0.9, h * 0.62, DISPLAY, 900, tracking);
  ctx.font = `900 ${size}px ${DISPLAY}`;
  ctx.fillStyle = P.cream;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  tracked(ctx, label, x + w / 2, y + h * 0.54, tracking, 'center');

  ctx.fillStyle = P.sunset;
  const mark = h * 0.36;
  ctx.fillRect(x + ux * 0.18, y + (h - mark) / 2, mark, mark);
  ctx.fillRect(x + w - ux * 0.18 - mark, y + (h - mark) / 2, mark, mark);
}

export function renderCover(ctx, W, H, state) {
  const P = art.PALETTE;
  const ux = W / 6;
  const uy = H / 4;
  const seed = (state.seed ?? DEFAULT_STATE.seed) | 0;
  const rng = mulberry32(seed + 97);
  const photos = resolvePhotos(state);

  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // Warm field: sky and sun occupy the whole sheet before any ink is laid down.
  art.skyGradient(ctx, 0, 0, W, H, rng, P);
  art.bandedSun(ctx, W * 0.64, H * 0.015, W * 0.28, H * 0.33, rng, P);
  art.halftone(ctx, 0, 0, W, H * 0.58, rng, P);
  ctx.save();
  ctx.globalAlpha = 0.2;
  art.skyline(ctx, 0, H * 0.52, W, H * 0.2, rng, P);
  ctx.restore();

  // Small editorial kicker above the title.
  ctx.font = `${Math.max(8, uy * 0.042)}px ${MONO}`;
  ctx.fillStyle = P.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  tracked(ctx, 'HARBOUR CITY / NEON DUSK / VOL. 01', ux * 0.32, uy * 0.055, uy * 0.009, 'left');
  ctx.textBaseline = 'alphabetic';

  drawTitle(
    ctx,
    state.title || DEFAULT_STATE.title,
    { x: ux * 0.3, y: uy * 0.12, w: ux * 5.2, h: uy * 1.34 },
    ux,
    uy,
  );
  drawSubtitle(ctx, state.subtitle || DEFAULT_STATE.subtitle, ux * 0.3, uy * 1.55, ux * 5.4, uy * 0.3, ux);

  const rects = panelRects(W, H);
  rects.forEach((rect, i) => {
    drawPanel(ctx, rect, i, photos[i], (state.crew && state.crew[i]) || DEFAULT_STATE.crew[i], seed, ux);
  });

  const band = { x: ux * 0.28, y: uy * 3.15, w: ux * 5.44, h: uy * 0.7 };
  drawBand(ctx, state, band.x, band.y, band.w, band.h, seed, ux, uy);
  drawTagline(ctx, state.tagline || DEFAULT_STATE.tagline, band.x, band.y + band.h + uy * 0.02, band.w, uy * 0.11, ux);

  // A tiny serif imprint keeps the typography mixed but never dominant.
  ctx.font = `italic ${Math.max(9, uy * 0.045)}px ${SERIF}`;
  ctx.fillStyle = P.ink;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('the harbour never sleeps', ux * 3.75, uy * 0.055);

  art.grain(ctx, 0, 0, W, H, rng, P);
  art.vignette(ctx, 0, 0, W, H, rng, P);
  ctx.restore();
}
