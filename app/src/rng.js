// Small deterministic random helpers. Everything visual in the poster uses these,
// so one seed always produces exactly the same pixels.

export function mulberry32(seed) {
  let a = (seed | 0) >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, list) {
  if (!list || list.length === 0) return null;
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function chance(rng, probability = 0.5) {
  return rng() < probability;
}

export function intRange(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}
