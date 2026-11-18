// Hands and hardware: Rico's fists, a bought-and-paid-for pistol, bullets,
// impact particles and floating cash/combat text.

import { clamp } from './util.js';
import { buildingAt } from './city.js';
import { damagePed, scarePeds } from './pedestrians.js';
import { addHeat } from './police.js';
import { sfx } from './audio.js';

export function spawnParticles(G, x, y, n, color, speed = 130, life = 0.5, size = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = speed * (0.3 + Math.random() * 0.9);
    G.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: life * (0.5 + Math.random() * 0.8), maxLife: life,
      color, size: size * (0.6 + Math.random() * 0.9),
    });
  }
}

export function floater(G, x, y, text, color = '#ffffff') {
  G.floaters.push({ x, y, text, color, life: 1.4 });
}

export function updateFx(G, dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) { G.particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.exp(-2.4 * dt); p.vy *= Math.exp(-2.4 * dt);
  }
  for (let i = G.floaters.length - 1; i >= 0; i--) {
    const f = G.floaters[i];
    f.life -= dt; f.y -= 34 * dt;
    if (f.life <= 0) G.floaters.splice(i, 1);
  }
}

export function drawFx(ctx, G) {
  for (const p of G.particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const f of G.floaters) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// Attempt an attack toward the aim angle. Returns true if something happened.
export function tryAttack(G, aimAngle) {
  const P = G.player;
  if (P.atkCd > 0 || P.car) return false;

  if (P.weapon === 'pistol' && P.ammo > 0) {
    P.atkCd = 0.24;
    P.ammo--;
    const spread = (Math.random() - 0.5) * 0.045;
    const a = aimAngle + spread;
    G.bullets.push({
      x: P.x + Math.cos(aimAngle) * 16, y: P.y + Math.sin(aimAngle) * 16,
      vx: Math.cos(a) * 980, vy: Math.sin(a) * 980, life: 0.55,
    });
    G.muzzle = { x: P.x + Math.cos(aimAngle) * 20, y: P.y + Math.sin(aimAngle) * 20, life: 0.05 };
    G.shake = Math.max(G.shake, 2.2);
    sfx.gunshot();
    addHeat(G, 7, P.x, P.y);
    scarePeds(G, P.x, P.y, 240);
    if (P.ammo === 0) G.toast('Out of ammo — Solana Sports & Arms sells more', '#ffb3a0');
    return true;
  }

  // Fists (also the fallback when the pistol is empty).
  P.atkCd = 0.3;
  const fx = P.x + Math.cos(aimAngle) * 30, fy = P.y + Math.sin(aimAngle) * 30;
  sfx.punch();
  for (const ped of G.peds) {
    if (ped.state === 'dead') continue;
    if (Math.hypot(ped.x - fx, ped.y - fy) < 26) {
      damagePed(G, ped, 36, Math.cos(aimAngle) * 190, Math.sin(aimAngle) * 190);
      spawnParticles(G, ped.x, ped.y, 5, '#e8d06a', 90, 0.35, 3);
      addHeat(G, 10, P.x, P.y);
      scarePeds(G, P.x, P.y, 170);
      return true;
    }
  }
  for (const car of [...G.cars, ...G.cops]) {
    if (Math.hypot(car.x - fx, car.y - fy) < 34) {
      car.health -= 3;
      spawnParticles(G, fx, fy, 4, '#cfd8dc', 80, 0.3, 2.5);
      sfx.hitCar();
      addHeat(G, 4, P.x, P.y);
      return true;
    }
  }
  return true; // a swing and a miss still swings
}

export function updateBullets(G, dt) {
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    let dead = b.life <= 0;
    if (!dead && buildingAt(G.city, b.x, b.y)) {
      spawnParticles(G, b.x, b.y, 4, '#d8c491', 70, 0.3, 2.5);
      dead = true;
    }
    if (!dead) {
      for (const ped of G.peds) {
        if (ped.state === 'dead') continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 11) {
          damagePed(G, ped, 62, b.vx * 0.24, b.vy * 0.24);
          spawnParticles(G, ped.x, ped.y, 7, '#c0392b', 110, 0.4, 3);
          if (ped.state === 'dead') addHeat(G, 34, G.player.x, G.player.y);
          else addHeat(G, 16, G.player.x, G.player.y);
          scarePeds(G, b.x, b.y, 220);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const car of [...G.cars, ...G.cops]) {
        if (Math.hypot(car.x - b.x, car.y - b.y) < 22) {
          car.health -= 7;
          if (car.cop) addHeat(G, 14, G.player.x, G.player.y);
          spawnParticles(G, b.x, b.y, 5, '#ffd34d', 120, 0.3, 2.5);
          sfx.hitCar();
          dead = true;
          break;
        }
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

export function drawBullets(ctx, G) {
  ctx.fillStyle = '#ffe9a0';
  for (const b of G.bullets) ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
  if (G.muzzle && G.muzzle.life > 0) {
    ctx.fillStyle = 'rgba(255,190,60,0.9)';
    ctx.beginPath(); ctx.arc(G.muzzle.x, G.muzzle.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,190,0.9)';
    ctx.beginPath(); ctx.arc(G.muzzle.x, G.muzzle.y, 4.5, 0, Math.PI * 2); ctx.fill();
  }
}
