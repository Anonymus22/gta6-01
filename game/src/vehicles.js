// Cars for Palm Heat: velocity-based driving with real drift, lane-following
// traffic, and parked cars waiting to be borrowed.

import { clamp, makeRng, pick, randRange } from './util.js';
import { ROAD_HALF, collideCircle } from './city.js';

export const CAR_MODELS = [
  { name: 'Solana Sedan', colors: ['#c94f42', '#4a7fb5', '#e0e3e6', '#5d8a66', '#8a6fb8'], top: 500, accel: 300 },
  { name: 'Brisa Coupe', colors: ['#f2b234', '#e86a92', '#3fb6b2', '#f07f3c'], top: 560, accel: 350 },
  { name: 'Mercado Hatch', colors: ['#b8b0a4', '#7fb069', '#588157', '#e9c46a'], top: 460, accel: 280 },
  { name: 'Cargo Van', colors: ['#dfe3e6', '#a3b18a', '#6c757d'], top: 430, accel: 240 },
  { name: 'Palma Taxi', colors: ['#f7c948'], top: 490, accel: 300, taxi: true },
];

let nextId = 1;

export function makeCar(rng, x, y, angle, model) {
  const m = model || pick(rng, CAR_MODELS);
  return {
    id: nextId++, x, y, angle, vx: 0, vy: 0,
    model: m, color: m.taxi ? '#f7c948' : pick(rng, m.colors),
    driver: false, cop: false, parked: false,
    health: 100, dead: false, honkT: 0,
    // traffic state
    dirX: 0, dirY: 0, cruise: randRange(rng, 175, 245), lastCross: '',
  };
}

export function carSpeed(c) { return Math.hypot(c.vx, c.vy); }

function laneFor(city, dirX, dirY, cross) {
  // Right-hand traffic: the lane sits to the driver's right of the centre line.
  if (dirX === 1) return cross + 30;
  if (dirX === -1) return cross - 30;
  if (dirY === 1) return cross - 30;
  return cross + 30;
}

// --- Player driving -------------------------------------------------------

export function updatePlayerCar(G, car, ctl, dt) {
  const f = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const p = { x: -f.y, y: f.x };
  let sf = car.vx * f.x + car.vy * f.y;
  let sl = car.vx * p.x + car.vy * p.y;

  if (ctl.up) sf += car.model.accel * dt;
  if (ctl.down) sf -= (sf > 12 ? 430 : 190) * dt;
  sf -= sf * 0.55 * dt;                                   // drag
  if (!ctl.up && !ctl.down) sf -= sf * 0.8 * dt;          // engine braking
  sf = clamp(sf, -175, car.model.top);

  const grip = ctl.handbrake ? 2.0 : 9.0;
  sl *= Math.exp(-grip * dt);
  if (ctl.handbrake) sf -= sf * 0.7 * dt;

  const steer = (ctl.left ? -1 : 0) + (ctl.right ? 1 : 0);
  if (Math.abs(sf) > 4) {
    car.angle += steer * 1.05 * dt * clamp(sf / 130, -1.5, 1.5);
  }
  const nf = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const np = { x: -nf.y, y: nf.x };
  car.vx = nf.x * sf + np.x * sl;
  car.vy = nf.y * sf + np.y * sl;
  car.x += car.vx * dt;
  car.y += car.vy * dt;

  const before = Math.hypot(car.vx, car.vy);
  if (collideCircle(G.city, car, 17)) {
    car.vx *= 0.35; car.vy *= 0.35;
    if (before > 200) G.onCarCrash(car, before);
  }
  return Math.abs(sf);
}

// --- Traffic --------------------------------------------------------------

function nearestRoad(city, v) {
  let best = city.roads[0], bd = Infinity;
  for (const r of city.roads) { const d = Math.abs(v - r); if (d < bd) { bd = d; best = r; } }
  return best;
}

export function placeOnRoad(city, rng, car) {
  const horizontal = rng() < 0.5;
  const cross = pick(rng, city.roads);
  const along = randRange(rng, 120, 3200);
  if (horizontal) {
    car.dirX = rng() < 0.5 ? 1 : -1; car.dirY = 0;
    car.y = laneFor(city, car.dirX, 0, cross);
    car.x = along;
    car.angle = car.dirX === 1 ? 0 : Math.PI;
  } else {
    car.dirY = rng() < 0.5 ? 1 : -1; car.dirX = 0;
    car.x = laneFor(city, 0, car.dirY, cross);
    car.y = along;
    car.angle = car.dirY === 1 ? Math.PI / 2 : -Math.PI / 2;
  }
}

export function spawnTraffic(city, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const c = makeCar(rng, 0, 0, 0);
    placeOnRoad(city, rng, c);
    c.driver = true;
    cars.push(c);
  }
  return cars;
}

export function spawnParked(city, rng, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const c = makeCar(rng, 0, 0, 0);
    const horizontal = rng() < 0.5;
    const road = pick(rng, city.roads);
    const along = randRange(rng, 140, 3260);
    const side = rng() < 0.5 ? -1 : 1;
    if (horizontal) {
      c.x = along; c.y = road + side * (ROAD_HALF - 17);
      c.angle = side < 0 ? 0 : Math.PI;
    } else {
      c.x = road + side * (ROAD_HALF - 17); c.y = along;
      c.angle = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    c.parked = true;
    if (!collideCircle(city, c, 17)) cars.push(c); else { c.x += 30; cars.push(c); }
  }
  return cars;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function updateTrafficCar(G, car, dt, rng) {
  if (car.dead) return;
  // Obstacle scan straight ahead.
  let blocked = false;
  const aheadX = car.x + car.dirX * 54, aheadY = car.y + car.dirY * 54;
  const scan = (e, r) => {
    if (!e || e === car) return;
    const dx = e.x - aheadX, dy = e.y - aheadY;
    if (dx * dx + dy * dy < r * r) blocked = true;
  };
  for (const o of G.cars) scan(o, 34);
  for (const o of G.cops) scan(o, 34);
  for (const p of G.peds) if (p.state !== 'down') scan(p, 26);
  scan(G.player, 30);
  if (G.player.car) scan(G.player.car, 34);

  const target = blocked ? 0 : car.cruise;
  const cur = carSpeed(car);
  const next = cur + clamp(target - cur, -380 * dt, 150 * dt);
  car.vx = car.dirX * next;
  car.vy = car.dirY * next;
  car.x += car.vx * dt;
  car.y += car.vy * dt;

  // Intersection decision: near a crossing we have not used yet?
  const ix = nearestRoad(G.city, car.x), iy = nearestRoad(G.city, car.y);
  if (Math.abs(car.x - ix) < 14 && Math.abs(car.y - iy) < 14) {
    const key = ix + ',' + iy;
    if (car.lastCross !== key) {
      car.lastCross = key;
      if (rng() < 0.45) {
        const options = DIRS.filter(([dx, dy]) => !(dx === -car.dirX && dy === -car.dirY));
        const [ndx, ndy] = options[Math.floor(rng() * options.length)];
        if (ndx !== car.dirX || ndy !== car.dirY) {
          car.dirX = ndx; car.dirY = ndy;
          if (ndx !== 0) { car.y = laneFor(G.city, ndx, 0, iy); car.x = ix; }
          else { car.x = laneFor(G.city, 0, ndy, ix); car.y = iy; }
          car.angle = Math.atan2(ndy, ndx);
        }
      }
    }
  }
  // World edge: turn around.
  if (car.x < 90 || car.x > 3310 || car.y < 90 || car.y > 3310) {
    car.dirX = -car.dirX; car.dirY = -car.dirY;
    car.angle = Math.atan2(car.dirY, car.dirX);
    car.x = clamp(car.x, 90, 3310); car.y = clamp(car.y, 90, 3310);
  }
  collideCircle(G.city, car, 17);
}

// --- Car vs car -----------------------------------------------------------

export function collideCars(G, all) {
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 34 * 34 || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = (34 - d) / 2;
      const nx = dx / d, ny = dy / d;
      a.x -= nx * push; a.y -= ny * push;
      b.x += nx * push; b.y += ny * push;
      const rel = Math.abs((a.vx - b.vx) * nx + (a.vy - b.vy) * ny);
      const avx = a.vx, avy = a.vy;
      a.vx = b.vx * 0.55 + a.vx * 0.2; a.vy = b.vy * 0.55 + a.vy * 0.2;
      b.vx = avx * 0.55 + b.vx * 0.2; b.vy = avy * 0.55 + b.vy * 0.2;
      if (rel > 130) {
        a.health -= rel * 0.03; b.health -= rel * 0.03;
        G.onCarsCollide(a, b, rel);
      }
    }
  }
}

// --- Drawing --------------------------------------------------------------

export function drawCar(ctx, car, t) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(50,35,15,0.28)';
  ctx.fillRect(-20, -8 + 5, 46, 21);
  ctx.fillStyle = car.dead ? '#3a3a3a' : car.color;
  roundRect(ctx, -23, -11, 46, 22, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,40,0.85)';
  roundRect(ctx, -6, -9, 13, 18, 3); ctx.fill();       // cabin glass
  ctx.fillStyle = shadeCar(car);
  roundRect(ctx, -16, -9.5, 9, 19, 3); ctx.fill();    // hood shading
  ctx.fillStyle = '#fff6c9';
  ctx.fillRect(21, -8, 3, 5); ctx.fillRect(21, 3, 3, 5);   // headlights
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-24, -8, 3, 5); ctx.fillRect(-24, 3, 3, 5);
  if (car.model.taxi) {
    ctx.fillStyle = '#222';
    ctx.fillRect(-4, -4, 9, 8);
    ctx.fillStyle = '#f7c948';
    ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0.5, 2.5);
  }
  if (car.cop) {
    ctx.fillStyle = '#f4f6f8';
    roundRect(ctx, -23, -11, 46, 22, 6); ctx.fill();
    ctx.fillStyle = '#1d2733';
    roundRect(ctx, -8, -11, 18, 22, 4); ctx.fill();
    const flash = Math.floor(t * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#5aa2ff';
    ctx.fillRect(-3, -6, 7, 12);
    ctx.fillStyle = flash ? '#5aa2ff' : '#ff3b30';
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (car.health < 45 && !car.dead) {
    ctx.fillStyle = 'rgba(40,40,40,0.5)';
    ctx.beginPath(); ctx.arc(14, -4, 5 + Math.sin(t * 7 + car.id) * 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function shadeCar(car) {
  return car.cop ? '#2c3e50' : 'rgba(0,0,0,0.13)';
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
