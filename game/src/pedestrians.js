// The people of Marisol: they stroll the sidewalks, mind their business,
// run screaming from trouble, and occasionally get back up after a fall.

import { clamp, pick, randRange } from './util.js';
import { ROAD_HALF, collideCircle } from './city.js';

const SHIRTS = ['#e74c3c', '#f39c12', '#2ecc71', '#9b59b6', '#fd79a8', '#00b8d4', '#e67e22', '#ecf0f1', '#1abc9c'];
const PANTS = ['#2c3e50', '#7f8c8d', '#5d4037', '#34495e', '#8e6e53'];

export function makePed(rng, x, y) {
  return {
    x, y, vx: 0, vy: 0, angle: rng() * Math.PI * 2,
    speed: randRange(rng, 55, 85), hp: 100,
    state: 'walk', stateT: 0, tx: x, ty: y,
    shirt: pick(rng, SHIRTS), pants: pick(rng, PANTS),
    skin: pick(rng, ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac']),
    walkPhase: rng() * 6, name: null,
  };
}

export function spawnPeds(G, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    // Stand on a sidewalk: beside a random road, offset just past the kerb.
    const horizontal = rng() < 0.5;
    const road = pick(rng, G.city.roads);
    const along = randRange(rng, 80, 3320);
    const side = rng() < 0.5 ? -1 : 1;
    const p = horizontal
      ? makePed(rng, along, road + side * (ROAD_HALF + 12))
      : makePed(rng, road + side * (ROAD_HALF + 12), along);
    p.tx = p.x; p.ty = p.y;
    peds.push(p);
  }
  return peds;
}

function pickStrollTarget(G, ped, rng) {
  // Wander to another sidewalk point within a few hundred pixels.
  const horizontal = rng() < 0.5;
  const road = pick(rng, G.city.roads);
  const side = rng() < 0.5 ? -1 : 1;
  if (horizontal) {
    ped.tx = clamp(ped.x + randRange(rng, -420, 420), 40, 3360);
    ped.ty = road + side * (ROAD_HALF + 12);
  } else {
    ped.tx = road + side * (ROAD_HALF + 12);
    ped.ty = clamp(ped.y + randRange(rng, -420, 420), 40, 3360);
  }
}

export function scarePeds(G, x, y, radius) {
  for (const p of G.peds) {
    if (p.state === 'down' || p.state === 'dead') continue;
    const dx = p.x - x, dy = p.y - y;
    if (dx * dx + dy * dy < radius * radius) {
      p.state = 'flee';
      p.stateT = randRange(G.rng, 1.2, 2.4);
      p.tx = p.x + dx * 3;
      p.ty = p.y + dy * 3;
    }
  }
}

export function damagePed(G, ped, dmg, kx, ky) {
  if (ped.state === 'dead') return;
  ped.hp -= dmg;
  ped.vx += kx; ped.vy += ky;
  if (ped.hp <= 0) {
    ped.state = 'dead'; ped.stateT = 0;
  } else if (ped.hp < 62) {
    ped.state = 'down'; ped.stateT = 5;
  } else {
    ped.state = 'flee'; ped.stateT = 1.6;
    ped.tx = ped.x - kx * 4; ped.ty = ped.y - ky * 4;
  }
}

export function updatePed(G, ped, dt) {
  if (ped.state === 'dead') return;
  ped.stateT -= dt;
  // Knockback slide.
  if (Math.abs(ped.vx) > 1 || Math.abs(ped.vy) > 1) {
    ped.x += ped.vx * dt; ped.y += ped.vy * dt;
    ped.vx *= Math.exp(-6 * dt); ped.vy *= Math.exp(-6 * dt);
    collideCircle(G.city, ped, 8);
  }
  if (ped.state === 'down') {
    if (ped.stateT <= 0) { ped.state = 'flee'; ped.stateT = 1.2; ped.hp = Math.max(ped.hp, 40); }
    return;
  }
  const dx = ped.tx - ped.x, dy = ped.ty - ped.y;
  const d = Math.hypot(dx, dy);
  if (ped.state === 'flee' && ped.stateT <= 0) ped.state = 'walk';
  if (d < 12) {
    if (ped.state === 'walk') pickStrollTarget(G, ped, G.rng);
    else { ped.tx = ped.x + randRange(G.rng, -160, 160); ped.ty = ped.y + randRange(G.rng, -160, 160); }
    return;
  }
  const sp = ped.state === 'flee' ? 235 : ped.speed;
  const vx = (dx / d) * sp, vy = (dy / d) * sp;
  ped.angle = Math.atan2(vy, vx);
  ped.x += vx * dt; ped.y += vy * dt;
  ped.walkPhase += dt * (ped.state === 'flee' ? 13 : 7);
  collideCircle(G.city, ped, 8);
}

export function drawPed(ctx, ped) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.fillStyle = 'rgba(50,35,15,0.25)';
  ctx.beginPath(); ctx.ellipse(2, 3, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  if (ped.state === 'down' || ped.state === 'dead') {
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.shirt;
    ctx.fillRect(-11, -4, 22, 8);
    ctx.fillStyle = ped.skin;
    ctx.beginPath(); ctx.arc(13, 0, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  ctx.rotate(ped.angle);
  const swing = Math.sin(ped.walkPhase) * 4;
  ctx.fillStyle = ped.pants;
  ctx.fillRect(-4 + swing * 0.4, -5, 7, 4);
  ctx.fillRect(-4 - swing * 0.4, 1, 7, 4);
  ctx.fillStyle = ped.shirt;
  ctx.beginPath(); ctx.arc(0, 0, 6.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath(); ctx.arc(2.5, 0, 4.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (ped.name) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ped.name, ped.x, ped.y - 16);
  }
}
