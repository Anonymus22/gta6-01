// Small shared helpers: math, deterministic RNG, angle tools.
// Everything in Palm Heat uses these so the whole city is reproducible from a seed.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function dist2(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return dx * dx + dy * dy;
}

// Shortest signed difference between two angles, in (-PI, PI].
export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function angleLerp(a, b, t) {
  return a + angleDiff(a, b) * clamp(t, 0, 1);
}

// mulberry32: tiny deterministic PRNG, good enough for city generation.
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function randRange(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}
