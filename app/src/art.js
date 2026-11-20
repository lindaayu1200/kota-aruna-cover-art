// Procedural art primitives for the Kota Aruna poster.
// Every exported painter has the signature (ctx, x, y, w, h, rng, palette)
// and keeps all of its marks inside the supplied rectangle.

import { range, chance, pick } from './rng.js';

export const PALETTE = {
  ink: '#141021',
  panel: '#1d1733',
  cream: '#f6ecd9',
  sunset: '#ff7a45',
  magenta: '#ff2f8e',
  cyan: '#33e1e0',
  amber: '#ffd166',
  rose: '#ff5f77',
  plum: '#7b1d55',
};

function inside(ctx, x, y, w, h, paint) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  paint();
  ctx.restore();
}

function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function skyGradient(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    const g = ctx.createLinearGradient(x + w * 0.08, y, x - w * 0.05, y + h);
    g.addColorStop(0, palette.magenta);
    g.addColorStop(0.3, palette.rose);
    g.addColorStop(0.62, palette.sunset);
    g.addColorStop(1, palette.amber);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    const glow = ctx.createRadialGradient(
      x + w * 0.68, y + h * 0.34, 0,
      x + w * 0.68, y + h * 0.34, Math.max(w, h) * 0.62,
    );
    glow.addColorStop(0, rgba(palette.amber, 0.34));
    glow.addColorStop(1, rgba(palette.amber, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, w, h);

    for (let i = 0; i < 8; i += 1) {
      const by = y + range(rng, 0.04, 0.96) * h;
      ctx.fillStyle = i % 2
        ? rgba(palette.cream, range(rng, 0.025, 0.06))
        : rgba(palette.ink, range(rng, 0.025, 0.06));
      ctx.fillRect(x, by, w, range(rng, 0.006, 0.025) * h);
    }
  });
}

export function bandedSun(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    g.addColorStop(0, '#fff3cf');
    g.addColorStop(0.38, palette.amber);
    g.addColorStop(0.78, palette.sunset);
    g.addColorStop(1, palette.magenta);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    let yy = cy - r * 0.08;
    let gap = Math.max(1.2, r * 0.035);
    while (yy < cy + r) {
      const thickness = gap * range(rng, 0.75, 1.5);
      ctx.fillStyle = rgba(palette.ink, 0.88);
      ctx.fillRect(cx - r, yy, r * 2, thickness);
      yy += thickness + gap * range(rng, 1.4, 3.2);
      gap *= 1.16;
    }
    ctx.restore();

    ctx.strokeStyle = rgba(palette.cream, 0.92);
    ctx.lineWidth = Math.max(1.5, r * 0.028);
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.995, 0, Math.PI * 2);
    ctx.stroke();
  });
}

export function skyline(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    const haze = ctx.createLinearGradient(0, y, 0, y + h);
    haze.addColorStop(0, rgba(palette.amber, 0.22));
    haze.addColorStop(1, rgba(palette.ink, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(x, y, w, h);

    const base = y + h;
    let bx = x - range(rng, 0, w * 0.05);
    while (bx < x + w) {
      const bw = range(rng, w * 0.035, w * 0.105);
      const bh = range(rng, h * 0.2, h * 0.94);
      const by = base - bh;
      ctx.fillStyle = palette.ink;
      ctx.fillRect(bx, by, bw, bh);

      if (chance(rng, 0.42)) {
        const mast = bw * range(rng, 0.08, 0.2);
        ctx.fillRect(bx + bw / 2 - mast / 2, by - h * range(rng, 0.05, 0.2), mast, h * 0.2);
      }
      if (chance(rng, 0.3)) {
        ctx.fillRect(bx - bw * 0.1, by + bh * 0.4, bw * 1.2, bh * 0.035);
      }

      const cell = Math.max(5, h * 0.075);
      const cols = Math.max(1, Math.floor((bw - cell * 0.5) / cell));
      const rows = Math.max(1, Math.floor((bh - cell * 0.5) / cell));
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          if (!chance(rng, 0.38)) continue;
          ctx.fillStyle = rgba(
            pick(rng, [palette.cream, palette.amber, palette.cyan]),
            range(rng, 0.35, 0.92),
          );
          ctx.fillRect(
            bx + cell * 0.35 + c * cell,
            by + cell * 0.45 + r * cell,
            Math.max(1.5, cell * 0.32),
            Math.max(2, cell * 0.48),
          );
        }
      }
      bx += bw + range(rng, 0, w * 0.014);
    }
  });
}

export function palms(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    skyGradient(ctx, x, y, w, h, rng, palette);
    bandedSun(ctx, x + w * 0.42, y + h * 0.06, w * 0.46, h * 0.46, rng, palette);
    const ground = y + h * 0.84;
    ctx.fillStyle = palette.ink;
    ctx.fillRect(x, ground, w, h - (ground - y));

    const count = 2 + Math.floor(rng() * 3);
    for (let p = 0; p < count; p += 1) {
      const foot = x + range(rng, w * 0.08, w * 0.92);
      const top = y + range(rng, h * 0.24, h * 0.48);
      const sway = range(rng, -w * 0.13, w * 0.13);
      const crownX = foot + sway;
      ctx.strokeStyle = palette.ink;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, w * 0.024);
      ctx.beginPath();
      ctx.moveTo(foot, ground);
      ctx.quadraticCurveTo(foot + sway * 0.25, (ground + top) / 2, crownX, top);
      ctx.stroke();

      for (let f = 0; f < 7; f += 1) {
        const a = Math.PI + (f / 6) * Math.PI;
        const len = w * range(rng, 0.12, 0.23);
        const ex = crownX + Math.cos(a) * len;
        const ey = top + Math.sin(a) * len * 0.52;
        const midX = crownX + Math.cos(a) * len * 0.5;
        const midY = top - len * 0.24 + Math.sin(a) * len * 0.14;
        ctx.lineWidth = Math.max(1.4, w * 0.012);
        ctx.beginPath();
        ctx.moveTo(crownX, top);
        ctx.quadraticCurveTo(midX, midY, ex, ey);
        ctx.stroke();
      }
    }
    halftone(ctx, x, y + h * 0.1, w, h * 0.55, rng, palette);
  });
}

export function water(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, palette.plum);
    g.addColorStop(0.26, palette.magenta);
    g.addColorStop(0.62, palette.rose);
    g.addColorStop(1, palette.ink);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);

    const count = Math.max(12, Math.floor(h / 7));
    for (let i = 0; i < count; i += 1) {
      const len = range(rng, w * 0.03, w * 0.42);
      const sx = x + rng() * (w - len);
      const sy = y + rng() * h;
      const warm = chance(rng, 0.62);
      ctx.fillStyle = rgba(
        warm ? palette.amber : palette.cream,
        range(rng, 0.08, warm ? 0.5 : 0.32),
      );
      ctx.fillRect(sx, sy, len, range(rng, 1, Math.max(2, h * 0.012)));
    }
  });
}

export function highway(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    skyGradient(ctx, x, y, w, h, rng, palette);
    bandedSun(ctx, x + w * 0.56, y + h * 0.05, w * 0.38, h * 0.36, rng, palette);
    skyline(ctx, x, y + h * 0.4, w, h * 0.22, rng, palette);

    const startX = x - w * 0.16;
    const startY = y + h * 1.02;
    const cpX = x + w * 0.34;
    const cpY = y + h * 0.52;
    const endX = x + w * 0.62;
    const endY = y + h * 0.48;

    ctx.lineCap = 'round';
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = w * 0.42;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.stroke();

    ctx.strokeStyle = rgba(palette.cream, 0.75);
    ctx.lineWidth = Math.max(1.5, w * 0.012);
    ctx.setLineDash([w * 0.055, w * 0.05]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(cpX, cpY, endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 9; i += 1) {
      const t = rng();
      const px = (1 - t) ** 2 * startX + 2 * (1 - t) * t * cpX + t * t * endX;
      const py = (1 - t) ** 2 * startY + 2 * (1 - t) * t * cpY + t * t * endY;
      ctx.fillStyle = chance(rng, 0.5) ? palette.amber : palette.magenta;
      ctx.fillRect(px + range(rng, -w * 0.12, w * 0.12), py + range(rng, -h * 0.02, h * 0.04), w * 0.018, Math.max(2, h * 0.01));
    }
    halftone(ctx, x, y, w, h * 0.45, rng, palette);
  });
}

export function cranes(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    skyGradient(ctx, x, y, w, h, rng, palette);
    bandedSun(ctx, x + w * 0.62, y + h * 0.04, w * 0.34, h * 0.34, rng, palette);
    skyline(ctx, x, y + h * 0.62, w, h * 0.38, rng, palette);

    const count = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < count; i += 1) {
      const tx = x + range(rng, w * 0.16, w * 0.86);
      const top = y + range(rng, h * 0.16, h * 0.36);
      const bottom = y + h * 0.78;
      const arm = range(rng, w * 0.2, w * 0.4);
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = Math.max(2, w * 0.018);
      ctx.beginPath();
      ctx.moveTo(tx, bottom);
      ctx.lineTo(tx, top);
      ctx.moveTo(tx - arm, top + h * 0.02);
      ctx.lineTo(tx + arm, top + h * 0.02);
      ctx.moveTo(tx - arm * 0.72, top - h * 0.05);
      ctx.lineTo(tx, top + h * 0.02);
      ctx.stroke();

      ctx.lineWidth = Math.max(1, w * 0.008);
      for (let l = 0; l < 7; l += 1) {
        const ly = top + ((bottom - top) * l) / 7;
        ctx.beginPath();
        ctx.moveTo(tx - w * 0.032, ly);
        ctx.lineTo(tx + w * 0.032, ly + (bottom - top) / 7);
        ctx.stroke();
      }
      const hookX = tx + arm * range(rng, 0.5, 0.92);
      ctx.beginPath();
      ctx.moveTo(hookX, top + h * 0.02);
      ctx.lineTo(hookX, top + h * range(rng, 0.18, 0.42));
      ctx.stroke();
    }
    halftone(ctx, x, y, w, h * 0.6, rng, palette);
  });
}

export function pier(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    skyGradient(ctx, x, y, w, h, rng, palette);
    bandedSun(ctx, x + w * 0.58, y + h * 0.06, w * 0.4, h * 0.4, rng, palette);
    skyline(ctx, x, y + h * 0.38, w, h * 0.22, rng, palette);
    water(ctx, x, y + h * 0.54, w, h * 0.46, rng, palette);

    const deck = y + h * 0.62;
    ctx.fillStyle = palette.ink;
    ctx.fillRect(x - w * 0.05, deck, w * 1.1, h * 0.035);
    for (let i = 0; i < 6; i += 1) {
      const px = x + w * (0.03 + i * 0.17);
      ctx.fillRect(px, deck + h * 0.035, Math.max(2, w * 0.018), h * 0.2);
    }
    ctx.lineWidth = Math.max(1.5, w * 0.012);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.02, deck - h * 0.04);
    ctx.lineTo(x + w * 1.02, deck - h * 0.04);
    ctx.stroke();

    const hutX = x + w * 0.12;
    ctx.fillStyle = palette.panel;
    ctx.fillRect(hutX, deck - h * 0.16, w * 0.2, h * 0.12);
    ctx.fillStyle = rgba(palette.amber, 0.6);
    ctx.fillRect(hutX + w * 0.04, deck - h * 0.12, w * 0.05, h * 0.05);
    palms(ctx, x + w * 0.68, y + h * 0.2, w * 0.3, h * 0.45, rng, palette);
  });
}

export function halftone(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    const step = Math.max(16, Math.min(w, h) * 0.075);
    for (let py = y + step / 2; py < y + h; py += step) {
      const t = (py - y) / Math.max(1, h);
      for (let px = x + step / 2; px < x + w; px += step) {
        const radius = step * range(rng, 0.07, 0.2) * (0.7 + t * 0.75);
        ctx.fillStyle = rgba(palette.ink, 0.045 + t * 0.12);
        ctx.beginPath();
        ctx.arc(px + range(rng, -1, 1), py + range(rng, -1, 1), radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

export function grain(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    const count = Math.min(220, Math.max(60, Math.floor((w * h) / 6000)));
    for (let i = 0; i < count; i += 1) {
      const size = range(rng, 0.7, 2.1);
      ctx.fillStyle = chance(rng, 0.5)
        ? rgba(palette.cream, 0.06)
        : rgba(palette.ink, 0.055);
      ctx.fillRect(x + rng() * w, y + rng() * h, size, size);
    }
  });
}

export function vignette(ctx, x, y, w, h, rng, palette) {
  inside(ctx, x, y, w, h, () => {
    const g = ctx.createRadialGradient(
      x + w / 2, y + h * 0.45, Math.min(w, h) * 0.28,
      x + w / 2, y + h * 0.45, Math.max(w, h) * 0.75,
    );
    g.addColorStop(0, rgba(palette.ink, 0));
    g.addColorStop(0.7, rgba(palette.ink, 0.06));
    g.addColorStop(1, rgba(palette.ink, 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  });
}
