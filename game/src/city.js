// Marisol: a sun-soaked coastal city generated from a seed.
// A regular road grid, city blocks with pastel buildings, a few parks,
// named landmarks (hospital, police station, Rosa's Diner, the old port
// warehouse, a safehouse, a gun shop) and a beach running down the east edge.

import { makeRng, pick, randRange } from './util.js';

export const WORLD = 3400;
export const ROAD_HALF = 60;          // half the width of a road
export const SIDEWALK = 18;           // sidewalk band around each block
const ROAD_STEP = 440;
const ROAD_START = 260;

const PASTELS = ['#f2d5a0', '#e8a87c', '#f4e1c1', '#d98c8c', '#a8c3a0', '#f7f3e3',
  '#e6b8a2', '#b5d3e7', '#f0c987', '#c9ada7', '#ffe8b3', '#d5e8d4'];

export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f) | 0;
  const g = Math.min(255, ((n >> 8) & 255) * f) | 0;
  const b = Math.min(255, (n & 255) * f) | 0;
  return `rgb(${r},${g},${b})`;
}

export function createCity(seed) {
  const rng = makeRng(seed * 7919 + 13);
  const roads = [];
  for (let v = ROAD_START; v < WORLD - 200; v += ROAD_STEP) roads.push(v);

  const city = {
    seed, roads, buildings: [], trees: [], parks: [],
    beachX: WORLD - 300, waterX: WORLD - 130,
    landmarks: {},
  };

  const parkBlocks = new Set(['1,1', '4,3', '2,5', '5,1']);
  const landmarkBlocks = {
    '0,0': { id: 'hospital', name: 'St. Solana Hospital', color: '#f5f5f5', accent: '#d64545' },
    '2,2': { id: 'police', name: 'Marisol PD', color: '#b5d3e7', accent: '#2456a6' },
    '0,3': { id: 'diner', name: "Rosa's Diner", color: '#f7c873', accent: '#b8542e' },
    '1,5': { id: 'warehouse', name: 'Old Port Warehouse', color: '#9aa3ad', accent: '#5b6670' },
    '5,0': { id: 'safehouse', name: 'Casa Segura', color: '#a8c3a0', accent: '#4d7c4d' },
    '4,1': { id: 'gunshop', name: 'Solana Sports & Arms', color: '#e6b8a2', accent: '#7a4a2b' },
  };

  for (let cx = 0; cx < roads.length - 1; cx++) {
    for (let cy = 0; cy < roads.length - 1; cy++) {
      const x0 = roads[cx] + ROAD_HALF + SIDEWALK;
      const y0 = roads[cy] + ROAD_HALF + SIDEWALK;
      const x1 = roads[cx + 1] - ROAD_HALF - SIDEWALK;
      const y1 = roads[cy + 1] - ROAD_HALF - SIDEWALK;
      const key = cx + ',' + cy;
      const block = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };

      if (parkBlocks.has(key)) {
        city.parks.push(block);
        const n = 7 + Math.floor(rng() * 5);
        for (let i = 0; i < n; i++) {
          city.trees.push({ x: randRange(rng, x0 + 24, x1 - 24), y: randRange(rng, y0 + 24, y1 - 24), s: randRange(rng, 0.8, 1.3) });
        }
        continue;
      }

      const lm = landmarkBlocks[key];
      if (lm) {
        const b = {
          x: x0 + 30, y: y0 + 34, w: block.w - 60, h: block.h - 68,
          color: lm.color, roof: shade(lm.color, 0.8), landmark: lm.id, name: lm.name, accent: lm.accent,
        };
        city.buildings.push(b);
        city.landmarks[lm.id] = {
          ...lm, x: b.x + b.w / 2, y: b.y + b.h + 26, bx: b.x, by: b.y, bw: b.w, bh: b.h,
        };
        continue;
      }

      // Ordinary block: 2-4 pastel buildings with gaps between them.
      const cols = rng() < 0.5 ? 1 : 2;
      const rowsN = rng() < 0.5 ? 1 : 2;
      const gap = 22;
      const bw = (block.w - gap * (cols + 1)) / cols;
      const bh = (block.h - gap * (rowsN + 1)) / rowsN;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rowsN; j++) {
          if (rng() < 0.12) continue; // the odd empty lot
          const color = pick(rng, PASTELS);
          city.buildings.push({
            x: x0 + gap + i * (bw + gap) + randRange(rng, -5, 5),
            y: y0 + gap + j * (bh + gap) + randRange(rng, -5, 5),
            w: bw + randRange(rng, -8, 8), h: bh + randRange(rng, -8, 8),
            color, roof: shade(color, 0.78),
          });
        }
      }
      if (rng() < 0.6) {
        city.trees.push({ x: x0 + 14, y: y0 + 14, s: randRange(rng, 0.7, 1.05) });
      }
    }
  }

  // Beach palms along the sand.
  for (let y = 120; y < WORLD - 80; y += 130) {
    city.trees.push({ x: city.beachX + 40 + rng() * 90, y: y + rng() * 50, s: randRange(rng, 0.9, 1.4), palm: true });
  }
  // Taxi stand: a marked kerb downtown, on the corner by the central crossing.
  city.landmarks.taxi = { id: 'taxi', name: 'Taxi Stand', x: roads[3] + ROAD_HALF + 26, y: roads[3] - 40 };

  return city;
}

export function districtAt(city, x, y) {
  if (x >= city.waterX) return 'The Atlantic';
  if (x >= city.beachX) return 'Las Palmas Beach';
  if (y > 2500) return 'Old Port';
  if (x < 1150 && y > 1300) return 'Mercado District';
  if (x < 1150 && y < 1150) return 'Cielo Heights';
  if (x > 2300 && y < 1200) return 'Las Brisas';
  return 'Downtown Marisol';
}

export function isWater(city, x, y) { return x >= city.waterX; }
export function isSand(city, x, y) { return x >= city.beachX && x < city.waterX; }

export function onRoad(city, x, y) {
  for (const r of city.roads) {
    if (Math.abs(x - r) <= ROAD_HALF || Math.abs(y - r) <= ROAD_HALF) return true;
  }
  return false;
}

// Push a circle out of every building it overlaps. Returns true if it hit anything.
export function collideCircle(city, e, r) {
  let hit = false;
  if (e.x < r) { e.x = r; hit = true; }
  if (e.y < r) { e.y = r; hit = true; }
  if (e.x > WORLD - r) { e.x = WORLD - r; hit = true; }
  if (e.y > WORLD - r) { e.y = WORLD - r; hit = true; }
  for (const b of city.buildings) {
    if (e.x + r < b.x || e.x - r > b.x + b.w || e.y + r < b.y || e.y - r > b.y + b.h) continue;
    const cx = Math.max(b.x, Math.min(e.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(e.y, b.y + b.h));
    let dx = e.x - cx, dy = e.y - cy;
    let d = Math.sqrt(dx * dx + dy * dy);
    if (d === 0) { dx = 0; dy = -1; d = 1; }
    if (d < r) {
      e.x = cx + (dx / d) * r;
      e.y = cy + (dy / d) * r;
      hit = true;
    }
  }
  return hit;
}

export function buildingAt(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}

function drawTree(ctx, t) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(t.x + 5, t.y + 7, 13 * t.s, 6 * t.s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a6b42';
  ctx.lineWidth = 3 * t.s;
  ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + 2, t.y - 8 * t.s); ctx.stroke();
  ctx.strokeStyle = '#3f8f4f';
  ctx.lineWidth = 2.4 * t.s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t.x * 0.01;
    ctx.beginPath();
    ctx.moveTo(t.x + 2, t.y - 8 * t.s);
    ctx.quadraticCurveTo(
      t.x + 2 + Math.cos(a) * 10 * t.s, t.y - 8 * t.s + Math.sin(a) * 6 * t.s - 3,
      t.x + 2 + Math.cos(a) * 17 * t.s, t.y - 8 * t.s + Math.sin(a) * 9 * t.s + 3);
    ctx.stroke();
  }
}

// Paints the visible slice of Marisol. Warm daylight, long soft shadows.
export function drawCity(ctx, city, vx, vy, vw, vh) {
  // Land base: warm sun-baked ground.
  ctx.fillStyle = '#d8c491';
  ctx.fillRect(vx, vy, vw, vh);
  // Slight green tint over the north-west heights.
  ctx.fillStyle = 'rgba(140,170,90,0.20)';
  ctx.fillRect(vx, vy, Math.max(0, Math.min(vx + vw, 1150) - vx), Math.max(0, Math.min(vy + vh, 1150) - vy));

  // Beach and sea down the east edge.
  if (vx + vw > city.beachX) {
    ctx.fillStyle = '#f0dca6';
    ctx.fillRect(Math.max(vx, city.beachX), vy, city.waterX - city.beachX, vh);
    ctx.fillStyle = '#3d9db8';
    ctx.fillRect(Math.max(vx, city.waterX), vy, WORLD - city.waterX + 400, vh);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    for (let y = Math.floor(vy / 90) * 90; y < vy + vh; y += 90) {
      ctx.beginPath();
      ctx.moveTo(city.waterX + 12, y);
      ctx.bezierCurveTo(city.waterX + 60, y - 14, city.waterX + 120, y + 14, city.waterX + 190, y);
      ctx.stroke();
    }
  }

  // Block slabs (sidewalks) and parks.
  for (let cx = 0; cx < city.roads.length - 1; cx++) {
    for (let cy = 0; cy < city.roads.length - 1; cy++) {
      const x0 = city.roads[cx] + ROAD_HALF, y0 = city.roads[cy] + ROAD_HALF;
      const w = city.roads[cx + 1] - city.roads[cx] - ROAD_HALF * 2;
      const h = city.roads[cy + 1] - city.roads[cy] - ROAD_HALF * 2;
      if (x0 + w < vx || y0 + h < vy || x0 > vx + vw || y0 > vy + vh) continue;
      ctx.fillStyle = '#cfc4a8';
      ctx.fillRect(x0, y0, w, h);
    }
  }
  for (const p of city.parks) {
    if (p.x + p.w < vx || p.y + p.h < vy || p.x > vx + vw || p.y > vy + vh) continue;
    ctx.fillStyle = '#79b264';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#e6d7ac';
    ctx.fillRect(p.x + p.w / 2 - 9, p.y, 18, p.h);
    ctx.fillRect(p.x, p.y + p.h / 2 - 9, p.w, 18);
  }

  // Roads: asphalt strips with dashed centre lines.
  ctx.fillStyle = '#4c4c52';
  for (const r of city.roads) {
    if (r + ROAD_HALF > vx && r - ROAD_HALF < vx + vw) ctx.fillRect(r - ROAD_HALF, vy - 4, ROAD_HALF * 2, vh + 8);
    if (r + ROAD_HALF > vy && r - ROAD_HALF < vy + vh) ctx.fillRect(vx - 4, r - ROAD_HALF, vw + 8, ROAD_HALF * 2);
  }
  ctx.strokeStyle = '#e8d06a';
  ctx.lineWidth = 3;
  ctx.setLineDash([26, 30]);
  for (const r of city.roads) {
    if (r > vx && r < vx + vw) { ctx.beginPath(); ctx.moveTo(r, vy); ctx.lineTo(r, vy + vh); ctx.stroke(); }
    if (r > vy && r < vy + vh) { ctx.beginPath(); ctx.moveTo(vx, r); ctx.lineTo(vx + vw, r); ctx.stroke(); }
  }
  ctx.setLineDash([]);

  // Buildings with a soft south-east shadow, then a lighter roof inset.
  for (const b of city.buildings) {
    if (b.x + b.w < vx || b.y + b.h < vy || b.x > vx + vw || b.y > vy + vh) continue;
    ctx.fillStyle = 'rgba(60,40,20,0.25)';
    ctx.fillRect(b.x + 9, b.y + 11, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 7, b.y + 7, b.w - 14, b.h - 14);
    if (b.accent) {
      ctx.fillStyle = b.accent;
      ctx.fillRect(b.x, b.y + b.h - 14, b.w, 14);
    }
    if (b.landmark === 'hospital') {
      ctx.fillStyle = '#d64545';
      const hx = b.x + b.w / 2, hy = b.y + b.h / 2;
      ctx.fillRect(hx - 5, hy - 16, 10, 32);
      ctx.fillRect(hx - 16, hy - 5, 32, 10);
    }
    if (b.name) {
      ctx.fillStyle = 'rgba(40,30,20,0.85)';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h + 32);
    }
  }

  for (const t of city.trees) {
    if (t.x < vx - 30 || t.y < vy - 30 || t.x > vx + vw + 30 || t.y > vy + vh + 30) continue;
    drawTree(ctx, t);
  }
}

