// Story and work in Marisol: a five-mission chain about Rico Vega, his aunt
// Rosa, and the Corallo family — plus taxi fares and diner deliveries for
// cash between missions.

import { dist } from './util.js';
import { makePed } from './pedestrians.js';
import { floater } from './combat.js';
import { addHeat, starsFor } from './police.js';
import { sfx } from './audio.js';

export const STORY = [
  {
    title: 'Homecoming',
    giver: 'Rosa Delgado',
    reward: 300,
    start: 'diner',
    intro: [
      ['Rosa', 'Rico! Look at you. Five years and the city still smells like trouble.'],
      ['Rico', 'Tia Rosa. I came back to work, not to hide.'],
      ['Rosa', 'Then work. Marco is waiting out back — drive him to the Old Port warehouse. Quietly.'],
    ],
    steps: [
      { type: 'pickup', at: 'diner', who: 'Marco', text: 'Pick up Marco at the diner' },
      { type: 'drive', at: 'warehouse', text: 'Drive Marco to the Old Port warehouse' },
      { type: 'talk', lines: [
        ['Marco', 'You drive like your father. That is a compliment and a warning.'],
        ['Marco', 'The Corallos run this port now. Remember that. Pay is at the diner.'],
      ] },
    ],
  },
  {
    title: 'Package Deal',
    giver: 'Marco Serrano',
    reward: 550,
    start: 'warehouse',
    intro: [
      ['Marco', 'A crate came in off the ferry. No manifest, no questions.'],
      ['Marco', 'Collect it from the port, take it up to Cielo Heights. If the police look twice, lose them.'],
    ],
    steps: [
      { type: 'goto', at: 'port', text: 'Collect the crate at the Old Port', heat: 42 },
      { type: 'drive', at: 'heights', text: 'Deliver the crate to Cielo Heights', time: 170 },
      { type: 'escape', text: 'Lose the police' },
      { type: 'talk', lines: [
        ['Marco', 'Clean work. Take this pistol — Marisol is not a fists-only town any more.'],
        ['Marco', 'Solana Sports & Arms sells the ammunition. Tell them Marco sent you.'],
      ] },
    ],
    grantPistol: true,
  },
  {
    title: 'Settle a Debt',
    giver: 'Rosa Delgado',
    reward: 700,
    start: 'diner',
    intro: [
      ['Rosa', 'Benny Salas owes the diner three months of "protection" money he borrowed.'],
      ['Rosa', 'He is in the Mercado park, spending it. Bring back what is ours. Scare him, do not bury him.'],
    ],
    steps: [
      { type: 'goto', at: 'mercado', who: 'Benny', text: 'Find Benny Salas in the Mercado park' },
      { type: 'talk', lines: [
        ['Benny', 'R-Rico Vega? Rosa sent you? Listen, I almost have it—'],
        ['Rico', 'Almost is not a currency, Benny.'],
        ['Benny', 'Okay! Okay! The money is at my cousin\'s place. Meet me there — please!'],
      ], flee: true },
      { type: 'goto', at: 'cousin', text: 'Catch up with Benny', time: 110 },
      { type: 'talk', lines: [
        ['Benny', 'Here. Every cent. Tell Rosa the diner eats free at my place forever.'],
        ['Rico', 'She will hold you to that. So will I.'],
      ] },
    ],
  },
  {
    title: 'Night Run',
    giver: 'Marco Serrano',
    reward: 1100,
    start: 'warehouse',
    intro: [
      ['Marco', 'A buyer in Las Brisas wants the second crate tonight, and the port is crawling.'],
      ['Marco', 'The moment you lift it, every badge in Marisol will smell it. Drive fast, arrive clean.'],
    ],
    steps: [
      { type: 'goto', at: 'port', text: 'Lift the second crate', heat: 58 },
      { type: 'drive', at: 'safehouse', text: 'Get the crate to Casa Segura', time: 150 },
      { type: 'escape', text: 'Lose the police before you knock' },
      { type: 'talk', lines: [
        ['Marco', 'Casa Segura indeed. Vince Corallo will hear about this run, Rico.'],
        ['Marco', 'Let him. You are becoming expensive to threaten.'],
      ] },
    ],
  },
  {
    title: 'Harbor Lights',
    giver: 'Rosa Delgado',
    reward: 2000,
    start: 'diner',
    intro: [
      ['Rosa', 'Enough running errands. Tonight I show you what your father hid at the harbor.'],
      ['Rosa', 'Drive me to the old lighthouse point. Whatever happens — we finish this together.'],
    ],
    steps: [
      { type: 'pickup', at: 'diner', who: 'Rosa', text: 'Pick up Rosa at the diner' },
      { type: 'drive', at: 'harbor', text: 'Drive Rosa to the harbor point', heat: 75 },
      { type: 'escape', text: 'Lose the Corallo heat — and the police' },
      { type: 'drive', at: 'safehouse', text: 'Take Rosa to Casa Segura' },
      { type: 'talk', lines: [
        ['Rosa', 'Under the harbor light your father buried the deed to half the Old Port.'],
        ['Rosa', 'It is yours now, Rico. Marisol is yours — if you can hold it.'],
        ['Rico', 'Then let them come and try to take it.'],
      ] },
    ],
  },
];

// Named world points the story uses, resolved against the generated city.
export function storyPoint(G, key) {
  const L = G.city.landmarks;
  const roads = G.city.roads;
  switch (key) {
    case 'diner': return L.diner;
    case 'warehouse': return L.warehouse;
    case 'safehouse': return L.safehouse;
    case 'port': return { x: L.warehouse.x + 190, y: L.warehouse.y + 120, name: 'Old Port' };
    case 'heights': return { x: roads[1] + 90, y: roads[1] - 80, name: 'Cielo Heights' };
    case 'mercado': return { x: roads[1] - 60, y: roads[4] + 60, name: 'Mercado Park' };
    case 'cousin': return { x: roads[4] + 120, y: roads[5] - 60, name: "Benny's cousin's place" };
    case 'harbor': return { x: G.city.beachX + 30, y: roads[5], name: 'Harbor Point' };
    default: return L.diner;
  }
}

function spawnNamed(G, name, x, y, shirt) {
  const p = makePed(G.rng, x, y);
  p.name = name; p.shirt = shirt || p.shirt; p.missionPed = true;
  p.tx = x; p.ty = y;
  G.peds.push(p);
  return p;
}

function removeNamed(G, name) {
  const i = G.peds.findIndex((p) => p.name === name && p.missionPed);
  if (i >= 0) G.peds.splice(i, 1);
}

export function missionAvailable(G) {
  return !G.mission.active && !G.storyDone && !G.job && G.missionIndex < STORY.length;
}

export function startMission(G) {
  const m = STORY[G.missionIndex];
  const at = storyPoint(G, m.start);
  G.mission = { active: true, stepIdx: -1, stepT: 0, passenger: null };
  G.dialogue = { lines: m.intro, onDone: () => advanceStep(G) };
  G.toast(`Mission: ${m.title}`, '#ffd34d');
  sfx.pickup();
  void at;
}

function advanceStep(G) {
  const m = STORY[G.missionIndex];
  // Leaving a talk step can trigger story beats (Benny bolts mid-conversation).
  const prev = m.steps[G.mission.stepIdx];
  if (prev && prev.type === 'talk' && prev.flee) {
    const at = storyPoint(G, 'cousin');
    const benny = G.peds.find((p) => p.name === 'Benny');
    if (benny) {
      benny.x = at.x - 320; benny.y = at.y + 60;
      benny.tx = at.x; benny.ty = at.y;
      benny.state = 'flee'; benny.stateT = 6;
    }
    G.toast('Benny is running!', '#ffb3a0');
  }
  G.mission.stepIdx++;
  const step = m.steps[G.mission.stepIdx];
  if (!step) { completeMission(G); return; }
  G.mission.stepT = step.time || 0;
  if (step.type === 'talk') {
    G.dialogue = { lines: step.lines, onDone: () => advanceStep(G) };
    return;
  }
  if (step.who) {
    const at = storyPoint(G, step.at);
    spawnNamed(G, step.who, at.x + 18, at.y + 10, step.who === 'Rosa' ? '#b8542e' : '#3fb6b2');
  }
  if (step.heat) addHeat(G, step.heat, G.player.x, G.player.y);
}

function completeStep(G) {
  const m = STORY[G.missionIndex];
  const step = m.steps[G.mission.stepIdx];
  if (step.type === 'pickup') {
    G.mission.passenger = step.who;
    removeNamed(G, step.who);
    sfx.door();
    G.toast(`${step.who} is in the car`, '#aef2b0');
  }
  if (step.type === 'drive' && G.mission.passenger) {
    spawnNamed(G, G.mission.passenger, G.player.x + 26, G.player.y + 8);
    G.mission.passenger = null;
    sfx.door();
  }
  if (step.flee) { /* handled by talk onDone chain below */ }
  if (step.type === 'talk' && step.flee) {
    const at = storyPoint(G, 'cousin');
    const benny = G.peds.find((p) => p.name === 'Benny');
    if (benny) { benny.x = at.x - 300; benny.y = at.y + 40; benny.tx = at.x; benny.ty = at.y; }
  }
  advanceStep(G);
}

function completeMission(G) {
  const m = STORY[G.missionIndex];
  G.mission.active = false;
  G.player.money += m.reward;
  floater(G, G.player.x, G.player.y - 24, `+$${m.reward}`, '#7dff8a');
  sfx.complete();
  G.toast(`Mission complete: ${m.title} (+$${m.reward})`, '#7dff8a');
  if (m.grantPistol && !G.player.hasPistol) {
    G.player.hasPistol = true;
    G.player.weapon = 'pistol';
    G.player.ammo += 30;
    G.toast('Pistol acquired — click to shoot, 1/2 or Q to swap', '#ffd34d');
  }
  G.missionIndex++;
  if (G.missionIndex >= STORY.length) {
    G.storyDone = true;
    G.toast('Story complete: Marisol is yours. Free roam!', '#ffd34d');
  }
  if (G.saveGame) G.saveGame();
}

export function failMission(G, reason) {
  if (!G.mission.active) return;
  G.mission.active = false;
  G.dialogue = null;
  if (G.mission.passenger) G.mission.passenger = null;
  removeNamed(G, 'Marco'); removeNamed(G, 'Rosa'); removeNamed(G, 'Benny');
  sfx.fail();
  G.toast(`Mission failed: ${reason} — return to the marker to retry`, '#ff9a8a');
}

// --- Side work --------------------------------------------------------------

const PASSENGERS = ['Lucia', 'Diego', 'Priya', 'Tomas', 'Aisha', 'Marco Jr.', 'Elena', 'Sam'];

export function startTaxi(G) {
  const roads = G.city.roads;
  const px = roads[1 + Math.floor(G.rng() * 5)] + (G.rng() < 0.5 ? -78 : 78);
  const py = roads[1 + Math.floor(G.rng() * 5)];
  const name = PASSENGERS[Math.floor(G.rng() * PASSENGERS.length)];
  spawnNamed(G, name, px, py, '#f7c948');
  G.job = { kind: 'taxi', phase: 'pickup', x: px, y: py, who: name, t: 0 };
  G.toast(`Taxi fare: pick up ${name}`, '#ffe27a');
  sfx.pickup();
}

export function startDelivery(G) {
  const dests = ['warehouse', 'safehouse', 'heights', 'harbor', 'mercado'];
  const dest = storyPoint(G, dests[Math.floor(G.rng() * dests.length)]);
  const d = dist(G.player.x, G.player.y, dest.x, dest.y);
  G.job = { kind: 'delivery', phase: 'deliver', x: dest.x, y: dest.y, t: Math.max(50, d / 8.5), name: dest.name };
  G.toast(`Delivery: ${dest.name} — the food is getting cold!`, '#ffe27a');
  sfx.pickup();
}

function finishJob(G, pay, label) {
  G.player.money += pay;
  floater(G, G.player.x, G.player.y - 24, `+$${pay}`, '#7dff8a');
  sfx.cash();
  G.toast(`${label} (+$${pay})`, '#7dff8a');
  G.job = null;
  if (G.saveGame) G.saveGame();
}

export function updateJobs(G, dt) {
  const job = G.job;
  if (!job) return;
  if (job.kind === 'taxi') job.t += dt; // taxi clock runs up (tips reward speed)
  const P = G.player;
  if (job.kind === 'taxi') {
    if (job.phase === 'pickup') {
      if (P.car && Math.hypot(P.car.x - job.x, P.car.y - job.y) < 52 && Math.hypot(P.car.vx, P.car.vy) < 40) {
        removeNamed(G, job.who);
        const dests = ['heights', 'harbor', 'mercado', 'warehouse', 'safehouse'];
        const dest = storyPoint(G, dests[Math.floor(G.rng() * dests.length)]);
        job.phase = 'dropoff'; job.x = dest.x; job.y = dest.y; job.name = dest.name;
        job.fare = Math.round(35 + dist(P.x, P.y, dest.x, dest.y) / 11);
        G.toast(`Drive ${job.who} to ${dest.name}`, '#ffe27a');
        sfx.door();
      }
    } else if (job.phase === 'dropoff') {
      if (P.car && Math.hypot(P.car.x - job.x, P.car.y - job.y) < 56 && Math.hypot(P.car.vx, P.car.vy) < 40) {
        const tip = job.t < 75 ? Math.round(job.fare * 0.4) : 0;
        spawnNamed(G, job.who, P.car.x + 24, P.car.y + 10);
        G.taxiDone++;
        finishJob(G, job.fare + tip, tip ? `Fare + tip` : 'Fare paid');
      }
    }
  } else if (job.kind === 'delivery') {
    job.t -= dt; // delivery clock runs down to zero
    if (job.t <= 0) {
      G.toast('Delivery failed — too slow', '#ff9a8a');
      sfx.fail();
      G.job = null;
      return;
    }
    if (P.car && Math.hypot(P.car.x - job.x, P.car.y - job.y) < 56) {
      G.deliveryDone++;
      finishJob(G, Math.round(70 + job.t * 1.6), 'Delivery paid');
    }
  }
}

// --- Per-frame mission logic --------------------------------------------------

export function updateMissions(G, dt) {
  updateJobs(G, dt);
  if (!G.mission.active || G.dialogue) return;
  const m = STORY[G.missionIndex];
  const step = m.steps[G.mission.stepIdx];
  if (!step) return;
  if (step.time) {
    G.mission.stepT -= dt;
    if (G.mission.stepT <= 0) { failMission(G, 'out of time'); return; }
  }
  const P = G.player;
  if (step.type === 'goto' || step.type === 'pickup') {
    const at = storyPoint(G, step.at);
    const px = P.car ? P.car.x : P.x, py = P.car ? P.car.y : P.y;
    if (Math.hypot(px - at.x, py - at.y) < (step.type === 'pickup' ? 60 : 48)) completeStep(G);
  } else if (step.type === 'drive') {
    const at = storyPoint(G, step.at);
    if (P.car && Math.hypot(P.car.x - at.x, P.car.y - at.y) < 62) completeStep(G);
  } else if (step.type === 'escape') {
    if (starsFor(G.heat) === 0) completeStep(G);
  }
}

export function advanceDialogue(G) {
  const d = G.dialogue;
  if (!d) return false;
  d.i = (d.i || 0) + 1;
  sfx.click();
  if (d.i >= d.lines.length) {
    G.dialogue = null;
    if (d.onDone) d.onDone();
  }
  return true;
}

// What the HUD shows as the current objective, and where its marker points.
export function getObjective(G) {
  if (G.dialogue) return { text: 'Talking… (E to continue)', x: null, y: null };
  if (G.mission.active) {
    const m = STORY[G.missionIndex];
    const step = m.steps[G.mission.stepIdx];
    if (!step) return null;
    let text = step.text || m.title;
    if (step.time) text += ` — ${Math.max(0, Math.ceil(G.mission.stepT))}s`;
    if (step.type === 'escape') return { text, x: null, y: null };
    const at = storyPoint(G, step.at);
    return { text, x: at.x, y: at.y };
  }
  if (G.job) {
    const j = G.job;
    if (j.kind === 'taxi') {
      return { text: j.phase === 'pickup' ? `Taxi: pick up ${j.who}` : `Taxi: drop ${j.who} at ${j.name}`, x: j.x, y: j.y };
    }
    return { text: `Delivery to ${j.name} — ${Math.max(0, Math.ceil(j.t))}s`, x: j.x, y: j.y };
  }
  if (missionAvailable(G)) {
    const m = STORY[G.missionIndex];
    const at = storyPoint(G, m.start);
    return { text: `Story: ${m.title} — meet ${m.giver} (E)`, x: at.x, y: at.y };
  }
  if (G.storyDone) return { text: 'Marisol is yours. Taxi fares and deliveries still pay.', x: null, y: null };
  return null;
}
