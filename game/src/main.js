// PALM HEAT — an original top-down open-world crime game.
// Rico Vega comes home to Marisol, a sun-soaked coastal city, and takes
// driving work from his aunt Rosa while the Corallo family squeezes the
// Old Port. Five story missions, taxi fares, deliveries, police heat,
// fists and a pistol — all in vanilla JS + Canvas, no libraries.

import { createCity, drawCity, collideCircle, isWater, districtAt, WORLD } from './city.js';
import { makeRng, clamp, dist } from './util.js';
import { keys, pressed, mouse, attachInput, endFrameInput, wasPressed } from './input.js';
import { spawnTraffic, spawnParked, makeCar, updatePlayerCar, updateTrafficCar, collideCars, drawCar, carSpeed } from './vehicles.js';
import { spawnPeds, updatePed, drawPed, scarePeds, damagePed } from './pedestrians.js';
import { updatePolice, addHeat, starsFor } from './police.js';
import { tryAttack, updateBullets, drawBullets, updateFx, drawFx, spawnParticles, floater } from './combat.js';
import {
  STORY, startMission, failMission, missionAvailable, updateMissions,
  advanceDialogue, startTaxi, startDelivery, storyPoint,
} from './missions.js';
import { drawHUD, drawWorldMarkers } from './hud.js';
import { initAudio, setEngine, setSiren, setMuted, isMuted, sfx } from './audio.js';
import { hasSave, readSave, writeSave, clearSave } from './save.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VW = canvas.width, VH = canvas.height;

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot');
const SEED = parseInt(params.get('seed') || '7', 10) || 7;

const G = {
  state: 'menu',
  time: 0,
  seed: SEED,
  rng: makeRng(SEED * 31 + 5),
  city: null,
  player: null,
  cars: [], cops: [], peds: [], bullets: [], particles: [], floaters: [], toasts: [],
  heat: 0, wanted: 0, seenByPolice: false, lastCrimeT: -99, lastCrimePos: null,
  copSpawnT: 0, bustT: 0,
  mission: { active: false, stepIdx: 0, stepT: 0, passenger: null },
  missionIndex: 0, storyDone: false,
  job: null, dialogue: null,
  camera: { x: 1700, y: 1700 },
  shake: 0, muzzle: null,
  taxiDone: 0, deliveryDone: 0,
  pickups: [],
  toast(text, color = '#ffffff') {
    G.toasts.push({ text, color, life: 3 });
    if (G.toasts.length > 4) G.toasts.shift();
  },
  saveGame() {
    writeSave({
      money: G.player.money, missionIndex: G.missionIndex, storyDone: G.storyDone,
      hasPistol: G.player.hasPistol, ammo: G.player.ammo,
      x: G.player.x, y: G.player.y, taxiDone: G.taxiDone, deliveryDone: G.deliveryDone,
    });
  },
  onCarCrash(car, speed) {
    if (car === G.player.car) {
      G.shake = Math.max(G.shake, Math.min(9, speed * 0.02));
      sfx.crash();
      damagePlayer((speed - 200) * 0.02);
      spawnParticles(G, car.x, car.y, 8, '#ffd34d', 150, 0.4, 3);
    }
  },
  onCarsCollide(a, b, rel) {
    const near = dist(a.x, a.y, G.player.x, G.player.y) < 500;
    if (near) sfx.crash();
    if (a === G.player.car || b === G.player.car) {
      G.shake = Math.max(G.shake, 5);
      damagePlayer(rel * 0.012);
      const other = a === G.player.car ? b : a;
      if (other.cop) addHeat(G, 20, G.player.x, G.player.y);
      else addHeat(G, 8, G.player.x, G.player.y);
    }
  },
};
window.__game = G;

function newPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, vx: 0, vy: 0,
    health: 100, armor: 0, money: 120,
    weapon: 'fists', hasPistol: false, ammo: 0,
    car: null, atkCd: 0, lastHurtT: -99, walkPhase: 0,
    shirt: '#0fb5ae', pants: '#22303c', skin: '#c68642',
  };
}

function buildWorld(seed, save) {
  G.city = createCity(seed);
  G.rng = makeRng(seed * 31 + 5);
  G.cars = [...spawnTraffic(G.city, G.rng, 15), ...spawnParked(G.city, G.rng, 16)];
  G.cops = [];
  G.peds = spawnPeds(G, G.rng, 44);
  G.bullets = []; G.particles = []; G.floaters = []; G.toasts = [];
  G.heat = 0; G.wanted = 0; G.bustT = 0;
  G.mission = { active: false, stepIdx: 0, stepT: 0, passenger: null };
  G.job = null; G.dialogue = null;
  const diner = G.city.landmarks.diner;
  G.player = newPlayer(diner.x, diner.y + 30);
  G.pickups = [
    { type: 'health', x: G.city.landmarks.hospital.x, y: G.city.landmarks.hospital.y, taken: 0 },
    { type: 'armor', x: G.city.landmarks.police.x, y: G.city.landmarks.police.y, taken: 0 },
    { type: 'armor', x: G.city.landmarks.safehouse.x, y: G.city.landmarks.safehouse.y, taken: 0 },
    { type: 'health', x: diner.x + 60, y: diner.y, taken: 0 },
  ];
  if (save) {
    G.player.money = save.money;
    G.player.hasPistol = !!save.hasPistol;
    G.player.ammo = save.ammo || 0;
    G.player.weapon = save.hasPistol ? 'pistol' : 'fists';
    G.player.x = save.x; G.player.y = save.y;
    G.missionIndex = save.missionIndex || 0;
    G.storyDone = !!save.storyDone;
    G.taxiDone = save.taxiDone || 0;
    G.deliveryDone = save.deliveryDone || 0;
  }
  G.camera.x = G.player.x; G.camera.y = G.player.y;
}

function damagePlayer(amount) {
  const P = G.player;
  if (amount <= 0 || G.state !== 'play') return;
  const absorbed = Math.min(P.armor, amount * 0.6);
  P.armor -= absorbed;
  P.health -= (amount - absorbed);
  P.lastHurtT = G.time;
  if (P.health <= 0) {
    P.health = 0;
    wasted();
  }
}

function busted() {
  if (G.state !== 'play') return;
  G.state = 'busted';
  failMission(G, 'arrested');
  G.job = null;
  const fee = Math.min(G.player.money, 150 + G.wanted * 40);
  G.player.money -= fee;
  sfx.busted();
  showEnd('BUSTED', `Marisol PD held Rico overnight. Bail and fines: $${fee}.`, 'Leave the station');
}

function wasted() {
  if (G.state !== 'play') return;
  G.state = 'wasted';
  failMission(G, 'Rico woke up in hospital');
  G.job = null;
  const fee = Math.min(G.player.money, Math.max(50, Math.round(G.player.money * 0.1)));
  G.player.money -= fee;
  showEnd('WASTED', `Rico woke up at St. Solana Hospital. Medical bill: $${fee}.`, 'Leave the hospital');
}

function respawn() {
  const P = G.player;
  const at = G.state === 'busted' ? G.city.landmarks.police : G.city.landmarks.hospital;
  P.health = 100; P.armor = 0; P.car = null;
  P.x = at.x; P.y = at.y + 16;
  G.heat = 0; G.wanted = 0; G.bustT = 0;
  for (const c of G.cops) { c.x = -9999; }
  G.cops = [];
  hideEnd();
  G.state = 'play';
  G.saveGame();
}

// --- DOM wiring ---------------------------------------------------------------

const $ = (id) => document.getElementById(id);
function showEnd(title, text, button) {
  $('endTitle').textContent = title;
  $('endText').textContent = text;
  $('endBtn').textContent = button;
  $('endScreen').style.display = 'flex';
}
function hideEnd() { $('endScreen').style.display = 'none'; }

function startGame(save) {
  initAudio();
  buildWorld(SEED, save);
  $('menu').style.display = 'none';
  hideEnd();
  $('pause').style.display = 'none';
  G.state = 'play';
  G.toast(save ? 'Welcome back to Marisol' : 'Welcome to Marisol — meet Rosa at the diner (E)', '#ffd34d');
}

$('newBtn').addEventListener('click', () => { clearSave(); startGame(null); });
$('continueBtn').addEventListener('click', () => startGame(readSave()));
$('endBtn').addEventListener('click', respawn);
$('resumeBtn').addEventListener('click', () => { $('pause').style.display = 'none'; G.state = 'play'; });
$('saveBtn').addEventListener('click', () => { G.saveGame(); G.toast('Game saved', '#aef2b0'); });
$('soundBtn').addEventListener('click', () => { setMuted(!isMuted()); $('soundBtn').textContent = isMuted() ? 'Sound: OFF' : 'Sound: ON'; });
$('quitBtn').addEventListener('click', () => { $('pause').style.display = 'none'; $('menu').style.display = 'flex'; G.state = 'menu'; refreshMenu(); });
function refreshMenu() { $('continueBtn').style.display = hasSave() ? 'block' : 'none'; }
refreshMenu();

// --- Interaction ---------------------------------------------------------------

function nearestCar(x, y, maxD) {
  let best = null, bd = maxD;
  for (const c of [...G.cars, ...G.cops]) {
    if (c.cop || c.dead) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function interact() {
  const P = G.player;
  if (G.dialogue) { advanceDialogue(G); return; }
  if (P.car) {
    // Exit the car.
    const car = P.car;
    P.car = null;
    P.x = car.x + Math.cos(car.angle + Math.PI / 2) * 26;
    P.y = car.y + Math.sin(car.angle + Math.PI / 2) * 26;
    collideCircle(G.city, P, 10);
    sfx.door();
    return;
  }
  // Mission start?
  if (missionAvailable(G)) {
    const m = STORY[G.missionIndex];
    const at = storyPoint(G, m.start);
    if (dist(P.x, P.y, at.x, at.y) < 64) { startMission(G); return; }
  }
  // Enter a car (stealing a driven one is a crime).
  const car = nearestCar(P.x, P.y, 50);
  if (car) {
    if (car.driver) {
      car.driver = false;
      const driver = G.peds.length ? null : null;
      void driver;
      const fleeing = {
        x: car.x + 20, y: car.y + 6, vx: 0, vy: 0, angle: 0, speed: 70, hp: 100,
        state: 'flee', stateT: 2, tx: car.x + 200, ty: car.y + 120,
        shirt: '#888', pants: '#333', skin: '#e0ac69', walkPhase: 0, name: null,
      };
      G.peds.push(fleeing);
      addHeat(G, 18, P.x, P.y);
      scarePeds(G, P.x, P.y, 130);
      G.toast('Vehicle stolen!', '#ffb3a0');
      sfx.horn();
    }
    car.parked = false;
    P.car = car;
    sfx.door();
    return;
  }
  // Gun shop.
  const gs = G.city.landmarks.gunshop;
  if (dist(P.x, P.y, gs.x, gs.y) < 64) {
    if (!P.hasPistol && P.money >= 300) {
      P.money -= 300; P.hasPistol = true; P.weapon = 'pistol'; P.ammo += 24;
      G.toast('Pistol bought — $300. Click to shoot.', '#aef2b0'); sfx.cash();
    } else if (P.hasPistol && P.money >= 60 && P.ammo < 96) {
      P.money -= 60; P.ammo += 24;
      G.toast('Ammo +24 — $60', '#aef2b0'); sfx.cash();
    } else if (!P.hasPistol) G.toast('Pistol: $300 — not enough cash', '#ffb3a0');
    else G.toast('Ammo: $60 for 24 rounds', '#ffffff');
    G.saveGame();
    return;
  }
  // Taxi stand.
  const tx = G.city.landmarks.taxi;
  if (!G.job && !G.mission.active && dist(P.x, P.y, tx.x, tx.y) < 64) { startTaxi(G); return; }
  // Diner deliveries (when Rosa has no story work for Rico).
  const dn = G.city.landmarks.diner;
  if (!G.job && !G.mission.active && dist(P.x, P.y, dn.x, dn.y) < 64) { startDelivery(G); return; }
}

// --- Per-frame update -------------------------------------------------------------

function updatePlayer(dt) {
  const P = G.player;
  P.atkCd = Math.max(0, P.atkCd - dt);
  if (P.car) {
    const sf = updatePlayerCar(G, P.car, {
      up: keys['w'] || keys['arrowup'], down: keys['s'] || keys['arrowdown'],
      left: keys['a'] || keys['arrowleft'], right: keys['d'] || keys['arrowright'],
      handbrake: !!keys[' '],
    }, dt);
    P.x = P.car.x; P.y = P.car.y;
    setEngine(Math.abs(sf) / P.car.model.top);
    if (P.car.health <= 0 && !P.car.dead) {
      P.car.dead = true;
      G.toast('The car is wrecked!', '#ffb3a0');
      P.car = null;
      sfx.crash();
    }
  } else {
    setEngine(-1);
    let mx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    let my = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    const sprint = keys['shift'] ? 1.6 : 1;
    const len = Math.hypot(mx, my) || 1;
    const sp = 175 * sprint;
    const wx = G.camera.x - VW / 2 + mouse.x, wy = G.camera.y - VH / 2 + mouse.y;
    P.angle = Math.atan2(wy - P.y, wx - P.x);
    if (mx || my) {
      const nx = P.x + (mx / len) * sp * dt, ny = P.y + (my / len) * sp * dt;
      if (!isWater(G.city, nx, ny)) { P.x = nx; P.y = ny; }
      P.walkPhase += dt * (sprint > 1 ? 12 : 8);
    }
    collideCircle(G.city, P, 10);
    // Pickups.
    for (const pk of G.pickups) {
      if (pk.taken > 0) { pk.taken -= dt; continue; }
      if (dist(P.x, P.y, pk.x, pk.y) < 24) {
        if (pk.type === 'health' && P.health < 100) { P.health = Math.min(100, P.health + 50); pk.taken = 60; sfx.pickup(); G.toast('+50 health', '#aef2b0'); }
        if (pk.type === 'armor' && P.armor < 100) { P.armor = Math.min(100, P.armor + 50); pk.taken = 60; sfx.pickup(); G.toast('+50 armour', '#aef2b0'); }
      }
    }
    // Attack.
    if ((mouse.down || keys['f']) && !G.dialogue) tryAttack(G, P.angle);
  }
  // District announcements: entering a new part of Marisol gets a toast.
  const dName = districtAt(G.city, P.x, P.y);
  if (G.lastDistrict && dName !== G.lastDistrict) G.toast(dName, '#ffe9a0');
  G.lastDistrict = dName;
  // Health regen after a quiet spell.
  if (G.time - P.lastHurtT > 7 && P.health > 0) P.health = Math.min(100, P.health + 3.5 * dt);
}

function updateWorld(dt) {
  for (const c of G.cars) {
    if (c.parked || c === G.player.car || c.dead) continue;
    updateTrafficCar(G, c, dt, G.rng);
    // Impatient drivers lean on the horn when traffic stalls around Rico.
    c.honkT -= dt;
    if (c.honkT <= 0 && carSpeed(c) < 14 && dist(c.x, c.y, G.player.x, G.player.y) < 230 && G.rng() < 0.25) {
      sfx.horn();
      c.honkT = 5;
    }
  }
  for (const p of G.peds) updatePed(G, p, dt);
  updatePolice(G, dt);
  collideCars(G, [...G.cars, ...G.cops]);
  // Cars vs pedestrians.
  for (const car of [...G.cars, ...G.cops]) {
    const sp = carSpeed(car);
    if (sp < 65 || car.dead) continue;
    for (const ped of G.peds) {
      if (ped.state === 'down' || ped.state === 'dead') continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 17) {
        const wasPlayer = car === G.player.car;
        damagePed(G, ped, sp * 0.16, car.vx * 0.5, car.vy * 0.5);
        spawnParticles(G, ped.x, ped.y, 8, '#c0392b', 120, 0.45, 3);
        sfx.punch();
        if (wasPlayer) {
          addHeat(G, ped.state === 'dead' ? 40 : 26, G.player.x, G.player.y);
          G.shake = Math.max(G.shake, 4);
        }
        scarePeds(G, car.x, car.y, 170);
      }
    }
  }
  // Bust check.
  const P = G.player;
  if (G.wanted > 0) {
    let pinning = false;
    for (const c of G.cops) {
      const d = Math.hypot(c.x - P.x, c.y - P.y);
      if (!P.car && d < 36) pinning = true;
      if (P.car && d < 44 && carSpeed(P.car) < 26) pinning = true;
    }
    if (pinning) {
      G.bustT += dt;
      if (G.bustT > (P.car ? 3 : 2.1)) { busted(); return; }
    } else G.bustT = Math.max(0, G.bustT - dt * 1.5);
  } else G.bustT = 0;

  updateBullets(G, dt);
  updateFx(G, dt);
  if (G.muzzle) { G.muzzle.life -= dt; if (G.muzzle.life <= 0) G.muzzle = null; }
  updateMissions(G, dt);
  // Siren loudness by nearest officer.
  let nearest = Infinity;
  for (const c of G.cops) nearest = Math.min(nearest, Math.hypot(c.x - P.x, c.y - P.y));
  setSiren(G.wanted > 0 ? clamp(1 - nearest / 620, 0, 1) : 0);
}

// --- Rendering ---------------------------------------------------------------

const playerProxy = { x: 0, y: 0, angle: 0, walkPhase: 0, state: 'walk', shirt: '#0fb5ae', pants: '#22303c', skin: '#c68642', name: null };

function render() {
  const P = G.player;
  const camX = clamp(G.camera.x, VW / 2, WORLD - VW / 2);
  const camY = clamp(G.camera.y, VH / 2, WORLD - VH / 2);
  const shX = (Math.random() - 0.5) * G.shake, shY = (Math.random() - 0.5) * G.shake;
  ctx.save();
  ctx.translate(-Math.round(camX - VW / 2 + shX), -Math.round(camY - VH / 2 + shY));
  const vx = camX - VW / 2 - 30, vy = camY - VH / 2 - 30;
  drawCity(ctx, G.city, vx, vy, VW + 60, VH + 60);
  drawWorldMarkers(ctx, G);
  // Pickups.
  for (const pk of G.pickups) {
    if (pk.taken > 0) continue;
    ctx.fillStyle = pk.type === 'health' ? '#e0483e' : '#5aa2ff';
    ctx.beginPath(); ctx.arc(pk.x, pk.y, 9 + Math.sin(G.time * 4) * 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(pk.type === 'health' ? '+' : 'A', pk.x, pk.y + 4);
  }
  for (const ped of G.peds) drawPed(ctx, ped);
  for (const car of G.cars) drawCar(ctx, car, G.time);
  for (const cop of G.cops) drawCar(ctx, cop, G.time);
  if (!P.car) {
    playerProxy.x = P.x; playerProxy.y = P.y; playerProxy.angle = P.angle; playerProxy.walkPhase = P.walkPhase;
    drawPed(ctx, playerProxy);
    // Pistol in hand.
    if (P.weapon === 'pistol') {
      ctx.save();
      ctx.translate(P.x, P.y); ctx.rotate(P.angle);
      ctx.fillStyle = '#1c1c1e'; ctx.fillRect(8, -2, 11, 4);
      ctx.restore();
    }
  }
  drawBullets(ctx, G);
  drawFx(ctx, G);
  ctx.restore();

  if (G.state === 'play' || G.state === 'pause') drawHUD(ctx, G, VW, VH);
  // Bust progress ring.
  if (G.bustT > 0.25 && G.state === 'play') {
    ctx.strokeStyle = '#ff5147';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(VW / 2, VH / 2 - 60, 22, -Math.PI / 2, -Math.PI / 2 + (G.bustT / 2.1) * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff5147';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED?', VW / 2, VH / 2 - 92);
  }
  // Crosshair.
  if (G.state === 'play' && !G.player.car) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(mouse.x - 11, mouse.y); ctx.lineTo(mouse.x - 4, mouse.y);
    ctx.moveTo(mouse.x + 4, mouse.y); ctx.lineTo(mouse.x + 11, mouse.y);
    ctx.stroke();
  }
}

// --- Main loop ---------------------------------------------------------------

let last = performance.now();
let shotFrames = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (G.state === 'play') {
    G.time += dt;
    if (wasPressed('e')) interact();
    if (wasPressed('q', '1', '2')) {
      if (G.player.hasPistol && !G.player.car) {
        G.player.weapon = G.player.weapon === 'pistol' ? 'fists' : 'pistol';
        sfx.click();
      }
    }
    if (wasPressed('escape', 'p')) {
      G.state = 'pause';
      $('pause').style.display = 'flex';
    }
    if (wasPressed('m')) { setMuted(!isMuted()); G.toast(isMuted() ? 'Sound off' : 'Sound on', '#fff'); }
    updatePlayer(dt);
    if (G.state === 'play') updateWorld(dt);
    // Camera follows smoothly.
    const tx = G.player.car ? G.player.car.x : G.player.x;
    const ty = G.player.car ? G.player.car.y : G.player.y;
    G.camera.x += (tx - G.camera.x) * Math.min(1, dt * 5);
    G.camera.y += (ty - G.camera.y) * Math.min(1, dt * 5);
    G.shake *= Math.exp(-7 * dt);
    for (let i = G.toasts.length - 1; i >= 0; i--) {
      G.toasts[i].life -= dt;
      if (G.toasts[i].life <= 0) G.toasts.splice(i, 1);
    }
  } else if (G.state === 'menu') {
    G.time += dt;
    G.camera.x = 1700 + Math.sin(G.time * 0.05) * 500;
    G.camera.y = 1700 + Math.cos(G.time * 0.04) * 500;
  }
  if (G.city) render();
  endFrameInput();
  if (SHOT) {
    shotFrames++;
    if (shotFrames > 50) window.__shotReady = true;
  }
}

// --- Shot poses (deterministic scenes for screenshots) -------------------------

function setupShot(kind) {
  buildWorld(SEED, null);
  const roads = G.city.roads;
  const P = G.player;
  if (kind === 'cover') {
    P.x = roads[3] - 84; P.y = roads[3] + 84;
    P.angle = 0.6;
    // A little street life around Rico.
    for (let i = 0; i < 5 && i < G.peds.length; i++) {
      G.peds[i].x = P.x + 40 + i * 26; G.peds[i].y = P.y - 30 + i * 14;
      G.peds[i].tx = G.peds[i].x; G.peds[i].ty = G.peds[i].y;
    }
  } else if (kind === 'drive' || kind === 'chase') {
    const car = makeCar(G.rng, roads[2] + 200, roads[3] + 30, 0);
    car.color = '#f2b234';
    G.cars.push(car);
    P.car = car; P.x = car.x; P.y = car.y;
    car.vx = 250;
    if (kind === 'chase') {
      G.heat = 68;
      for (let i = 0; i < 3; i++) {
        const cop = makeCar(G.rng, car.x - 130 - i * 70, car.y + (i - 1) * 34, 0,
          { name: 'Interceptor', colors: ['#f4f6f8'], top: 545, accel: 360 });
        cop.cop = true; cop.driver = true; cop.color = '#f4f6f8';
        cop.vx = 240;
        G.cops.push(cop);
      }
    }
  } else if (kind === 'mission') {
    const diner = G.city.landmarks.diner;
    P.x = diner.x; P.y = diner.y + 34;
    G.missionIndex = 0;
    startMission(G);
  }
  G.camera.x = P.x; G.camera.y = P.y;
  G.state = 'play';
  $('menu').style.display = 'none';
}

// Boot.
attachInput(canvas);
canvas.addEventListener('mousedown', () => initAudio());
if (SHOT) setupShot(SHOT);
else buildWorld(SEED, null);
requestAnimationFrame(frame);
