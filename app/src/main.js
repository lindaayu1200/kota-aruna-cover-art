// UI wiring for the Kota Aruna cover studio. All image work is local:
// files are decoded with createImageBitmap and never uploaded anywhere.

import { SIZES, DEFAULT_STATE, renderCover, panelRects } from './cover.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const demo = params.get('demo');

const state = {
  ...DEFAULT_STATE,
  crew: [...DEFAULT_STATE.crew],
  photos: Array.from({ length: 5 }, () => ({ img: null, zoom: 1, panX: 0, panY: 0 })),
};
if (params.get('size') && SIZES[params.get('size')]) state.size = params.get('size');

const canvas = $('cover');
let pixelRatio = demo === 'cover' ? 1 : Math.min(2, window.devicePixelRatio || 1);
if (demo === 'cover') {
  document.body.appendChild(canvas);
  document.body.classList.add('cover-only');
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setStatus(message) {
  const line = $('status');
  if (line) line.textContent = message;
}

function draw() {
  const [W, H] = SIZES[state.size];
  const backingW = Math.round(W * pixelRatio);
  const backingH = Math.round(H * pixelRatio);
  if (canvas.width !== backingW || canvas.height !== backingH) {
    canvas.width = backingW;
    canvas.height = backingH;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  renderCover(ctx, W, H, state);
}

function focusSlot(index) {
  state.focus = index;
  document.querySelectorAll('.slot').forEach((node, i) => {
    node.classList.toggle('focus', i === index);
  });
  setStatus(`Panel ${index + 1} focused — drag on the preview to pan it.`);
}

function syncControls() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('taglineInput').value = state.tagline;
  $('seedInput').value = String(state.seed);
  $('useOne').checked = Boolean(state.useOne);
  state.crew.forEach((name, i) => {
    const input = $(`crew${i}`);
    if (input) input.value = name;
  });
  state.photos.forEach((slot, i) => {
    const zoom = $(`zoom${i}`);
    const out = $(`zoomOut${i}`);
    if (zoom) zoom.value = String(slot.zoom);
    if (out) out.textContent = `${Number(slot.zoom).toFixed(2)}×`;
    const badge = $(`photoState${i}`);
    if (badge) badge.textContent = slot.img ? 'PHOTO LOADED' : 'PROCEDURAL';
  });
  document.querySelectorAll('[data-size]').forEach((button) => {
    button.classList.toggle('active', button.dataset.size === state.size);
  });
  document.querySelectorAll('.slot').forEach((node, i) => {
    node.classList.toggle('focus', i === state.focus);
  });
}

async function loadSample(path, index) {
  const image = new Image();
  image.src = path;
  await image.decode();
  const bitmap = await createImageBitmap(image);
  state.photos[index].img = bitmap;
}

function wireControls() {
  document.querySelectorAll('[data-size]').forEach((button) => {
    button.addEventListener('click', () => {
      state.size = button.dataset.size;
      syncControls();
      draw();
      setStatus(`Canvas set to ${SIZES[state.size][0]} × ${SIZES[state.size][1]}.`);
    });
  });

  $('newSeed').addEventListener('click', () => {
    state.seed = (Math.random() * 0xffffffff) >>> 0;
    $('seedInput').value = String(state.seed);
    draw();
    setStatus(`New seed ${state.seed}.`);
  });
  $('seedInput').addEventListener('change', (event) => {
    const value = Number.parseInt(event.target.value, 10);
    state.seed = Number.isFinite(value) ? value >>> 0 : DEFAULT_STATE.seed;
    event.target.value = String(state.seed);
    draw();
    setStatus(`Seed ${state.seed}.`);
  });

  [['titleInput', 'title'], ['subtitleInput', 'subtitle'], ['taglineInput', 'tagline']].forEach(([id, key]) => {
    $(id).addEventListener('input', (event) => {
      state[key] = event.target.value;
      draw();
    });
  });
  state.crew.forEach((_, i) => {
    $(`crew${i}`).addEventListener('input', (event) => {
      state.crew[i] = event.target.value;
      draw();
    });
  });

  $('useOne').addEventListener('change', (event) => {
    state.useOne = event.target.checked;
    draw();
    setStatus(state.useOne ? 'One photo fills every panel.' : 'Each panel uses its own photo.');
  });

  state.photos.forEach((slot, i) => {
    const input = $(`photo${i}`);
    input.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const bitmap = await createImageBitmap(file);
        slot.img = bitmap;
        focusSlot(i);
        draw();
        syncControls();
        setStatus(`Panel ${i + 1}: loaded ${file.name}.`);
      } catch (error) {
        setStatus(`Panel ${i + 1}: could not read that image.`);
      }
    });
    const zoom = $(`zoom${i}`);
    zoom.addEventListener('input', (event) => {
      slot.zoom = Number(event.target.value);
      $(`zoomOut${i}`).textContent = `${slot.zoom.toFixed(2)}×`;
      focusSlot(i);
      draw();
    });
    $(`slot${i}`).addEventListener('pointerdown', () => focusSlot(i));
  });

  $('exportBtn').addEventListener('click', () => {
    const [W, H] = SIZES[state.size];
    const output = document.createElement('canvas');
    output.width = W;
    output.height = H;
    renderCover(output.getContext('2d'), W, H, state);
    output.toBlob((blob) => {
      if (!blob) {
        setStatus('Export failed — try again.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kota-aruna-${W}x${H}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setStatus(`Exported kota-aruna-${W}x${H}.png`);
    }, 'image/png');
  });
}

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const [W, H] = SIZES[state.size];
  const rect = canvas.getBoundingClientRect();
  const cx = ((event.clientX - rect.left) / rect.width) * W;
  const cy = ((event.clientY - rect.top) / rect.height) * H;
  const hit = panelRects(W, H).findIndex(
    (r) => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h,
  );
  if (hit < 0) return;
  focusSlot(hit);
  drag = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
});

canvas.addEventListener('pointermove', (event) => {
  if (!drag || drag.pointer !== event.pointerId) return;
  const rect = canvas.getBoundingClientRect();
  const slot = state.photos[state.focus];
  slot.panX = clamp(slot.panX + ((event.clientX - drag.x) / rect.width) * 3, -1, 1);
  slot.panY = clamp(slot.panY + ((event.clientY - drag.y) / rect.height) * 3, -1, 1);
  drag.x = event.clientX;
  drag.y = event.clientY;
  draw();
});

function endDrag(event) {
  if (drag && drag.pointer === event.pointerId) drag = null;
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

async function init() {
  wireControls();
  syncControls();
  if (demo === 'editor') {
    try {
      await Promise.all([
        loadSample('samples/boulevard.jpg', 0),
        loadSample('samples/pier.jpg', 2),
      ]);
    } catch (error) {
      setStatus('Demo samples could not be loaded.');
    }
    syncControls();
  }
  draw();
  if (!demo) setStatus('Ready — add photos, edit the type, then export a PNG.');
}

init();
