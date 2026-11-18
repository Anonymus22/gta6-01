// Marisol PD: a heat-based wanted system. Crimes add heat, heat makes stars,
// stars bring Interceptors. Stay out of sight and the heat bleeds away.

import { clamp, angleDiff } from './util.js';
import { makeCar, placeOnRoad } from './vehicles.js';
import { sfx } from './audio.js';

const STAR_THRESHOLDS = [0, 15, 35, 60, 90, 130];

export function starsFor(heat) {
  let s = 0;
  for (let i = 0; i < STAR_THRESHOLDS.length; i++) if (heat >= STAR_THRESHOLDS[i]) s = i;
  return s;
}

export function addHeat(G, points, x, y) {
  if (G.state !== 'play') return;
  const before = starsFor(G.heat);
  G.heat = Math.min(170, G.heat + points);
  G.lastCrimeT = G.time;
  if (x !== undefined) G.lastCrimePos = { x, y };
  const after = starsFor(G.heat);
  if (after > before) {
    G.toast(`Wanted level ${after}`, '#ffd34d');
    sfx.horn();
  }
}

const COP_MODEL = { name: 'Interceptor', colors: ['#f4f6f8'], top: 545, accel: 360 };

export function spawnCop(G) {
  const c = makeCar(G.rng, 0, 0, 0, COP_MODEL);
  c.cop = true; c.driver = true; c.color = '#f4f6f8';
  // Appear on a road a few blocks away, out of the player's face.
  for (let tries = 0; tries < 12; tries++) {
    placeOnRoad(G.city, G.rng, c);
    const d = Math.hypot(c.x - G.player.x, c.y - G.player.y);
    if (d > 520 && d < 980) break;
  }
  G.cops.push(c);
  return c;
}

export function updatePolice(G, dt) {
  const stars = starsFor(G.heat);
  G.wanted = stars;

  // Heat decay: only while no officer has eyes on Rico.
  G.seenByPolice = false;
  for (const c of G.cops) {
    if (Math.hypot(c.x - G.player.x, c.y - G.player.y) < 560) { G.seenByPolice = true; break; }
  }
  if (!G.seenByPolice && G.time - G.lastCrimeT > 3.5 && G.heat > 0) {
    G.heat = Math.max(0, G.heat - 7.5 * dt);
  }

  const desired = stars === 0 ? 0 : Math.min(6, stars + 1);
  G.copSpawnT -= dt;
  if (G.cops.length < desired && G.copSpawnT <= 0) {
    spawnCop(G);
    G.copSpawnT = 1.6;
  }
  // Officers give up and peel off once the heat is gone and they are far away.
  for (let i = G.cops.length - 1; i >= 0; i--) {
    const c = G.cops[i];
    if (stars === 0 && Math.hypot(c.x - G.player.x, c.y - G.player.y) > 640) {
      G.cops.splice(i, 1);
    }
  }

  for (const c of G.cops) {
    if (c.dead) continue;
    const tx = G.player.car ? G.player.car.x : G.player.x;
    const ty = G.player.car ? G.player.car.y : G.player.y;
    const want = Math.atan2(ty - c.y, tx - c.x);
    const diff = angleDiff(c.angle, want);
    const distP = Math.hypot(tx - c.x, ty - c.y);
    // On foot, officers close in but stop at arrest range instead of running Rico over.
    const stopAt = G.player.car ? 0 : 44;
    const speedTarget = distP < stopAt + 6 ? 0 : (distP > 320 ? 545 : 430);
    c.angle += clamp(diff, -2.7 * dt, 2.7 * dt);
    const cur = Math.hypot(c.vx, c.vy);
    const accel = speedTarget > cur ? 330 : 520;
    const next = cur + clamp(speedTarget - cur, -accel * dt, accel * dt);
    const grip = 7;
    const fx = Math.cos(c.angle), fy = Math.sin(c.angle);
    const sf = c.vx * fx + c.vy * fy;
    const sl = c.vx * -fy + c.vy * fx;
    const nsl = sl * Math.exp(-grip * dt);
    const nsf = Math.max(next, sf - 300 * dt);
    c.vx = fx * nsf + -fy * nsl;
    c.vy = fy * nsf + fx * nsl;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    if (G.city && distP < 300 && Math.random() < dt * 0.2) { /* siren handled by audio levels */ }
  }
}
