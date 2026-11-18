// Palm Heat's HUD: health and armour, cash, wanted stars, weapon readout,
// objective line, dialogue box, toasts — and a live minimap with roads,
// police blips and the objective marker.

import { clamp } from './util.js';
import { getObjective } from './missions.js';
import { districtAt } from './city.js';

function bar(ctx, x, y, w, h, frac, fill, bg) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.max(0, w * clamp(frac, 0, 1)), h);
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export function drawWorldMarkers(ctx, G) {
  const obj = getObjective(G);
  const pulse = 1 + Math.sin(G.time * 5) * 0.18;
  const marker = (x, y, color, label) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.28;
    ctx.fillRect(-5, -120, 10, 120);
    ctx.globalAlpha = 1;
    ctx.scale(pulse, pulse);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 30);
  };
  if (obj && obj.x !== null && obj.x !== undefined) {
    marker(obj.x, obj.y, G.job ? '#37c8d9' : '#ffd34d', G.job ? 'JOB' : 'GO');
  }
  // Taxi stand and gun shop get small permanent signs.
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a6d1f';
  ctx.fillText('TAXI — E for a fare', G.city.landmarks.taxi.x, G.city.landmarks.taxi.y - 14);
}

export function drawHUD(ctx, G, W, H) {
  const P = G.player;
  ctx.save();

  // Health / armour, top-left.
  ctx.fillStyle = 'rgba(12,16,20,0.55)';
  ctx.fillRect(14, 14, 232, 58);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('HEALTH', 22, 32);
  bar(ctx, 76, 22, 158, 12, P.health / 100, P.health > 30 ? '#e0483e' : '#ff2d20', 'rgba(255,255,255,0.18)');
  ctx.fillText('ARMOUR', 22, 56);
  bar(ctx, 76, 46, 158, 12, P.armor / 100, '#5aa2ff', 'rgba(255,255,255,0.18)');
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(districtAt(G.city, P.x, P.y), 22, 88);

  // Money and wanted stars, top-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('$' + Math.floor(P.money).toLocaleString('en-US'), W - 18, 40);
  ctx.font = '22px system-ui, sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? '#ffd34d' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', W - 22 - (4 - i) * 24, 70);
  }
  if (G.wanted > 0 && !G.seenByPolice) {
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('EVADING…', W - 18, 90);
  }

  // Objective, top-centre chip.
  const obj = getObjective(G);
  if (obj && obj.text) {
    ctx.font = 'bold 14px system-ui, sans-serif';
    const w = Math.min(ctx.measureText(obj.text).width + 28, W - 560);
    ctx.fillStyle = 'rgba(12,16,20,0.6)';
    ctx.fillRect((W - w) / 2, 14, w, 30);
    ctx.fillStyle = '#ffe9a0';
    ctx.textAlign = 'center';
    ctx.fillText(obj.text, W / 2, 34, w - 16);
  }

  // Weapon readout, bottom-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(12,16,20,0.55)';
  ctx.fillRect(W - 196, H - 62, 182, 48);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(P.car ? 'DRIVING' : (P.weapon === 'pistol' ? 'PISTOL' : 'FISTS'), W - 24, H - 34);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(P.weapon === 'pistol' && !P.car ? `Ammo ${P.ammo}` : (P.hasPistol ? 'Q / 1 / 2 to swap' : ''), W - 24, H - 18);

  drawMinimap(ctx, G, 14, H - 204, 190);

  // Dialogue box, bottom-centre.
  const d = G.dialogue;
  if (d) {
    const [who, text] = d.lines[d.i || 0];
    ctx.fillStyle = 'rgba(10,12,16,0.82)';
    ctx.fillRect(W / 2 - 320, H - 128, 640, 76);
    ctx.strokeStyle = '#ffd34d';
    ctx.strokeRect(W / 2 - 320 + 0.5, H - 128 + 0.5, 639, 75);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(who, W / 2 - 304, H - 104);
    ctx.fillStyle = '#fff';
    ctx.font = '14px system-ui, sans-serif';
    wrapText(ctx, text, W / 2 - 304, H - 82, 608, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('E ▸', W / 2 + 304, H - 62);
  }

  // Toasts under the objective chip.
  ctx.textAlign = 'center';
  let ty = 62;
  for (const t of G.toasts) {
    ctx.globalAlpha = clamp(t.life, 0, 1);
    ctx.fillStyle = t.color;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(t.text, W / 2, ty);
    ty += 20;
  }
  ctx.globalAlpha = 1;

  // Low-health pulse.
  if (P.health < 30 && G.state === 'play') {
    ctx.fillStyle = `rgba(200,30,20,${0.10 + 0.07 * Math.sin(G.time * 6)})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w; yy += lh;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawMinimap(ctx, G, x, y, s) {
  const scale = s / 3400;
  ctx.save();
  ctx.fillStyle = 'rgba(16,24,20,0.78)';
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
  ctx.beginPath();
  ctx.rect(x, y, s, s);
  ctx.clip();
  // Sea.
  ctx.fillStyle = '#2d7d99';
  ctx.fillRect(x + G.city.waterX * scale, y, (3400 - G.city.waterX) * scale, s);
  // Roads.
  ctx.strokeStyle = 'rgba(230,225,200,0.55)';
  ctx.lineWidth = 2;
  for (const r of G.city.roads) {
    ctx.beginPath(); ctx.moveTo(x + r * scale, y); ctx.lineTo(x + r * scale, y + s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + r * scale); ctx.lineTo(x + s, y + r * scale); ctx.stroke();
  }
  // Objective.
  const obj = getObjective(G);
  if (obj && obj.x !== null && obj.x !== undefined) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.arc(x + obj.x * scale, y + obj.y * scale, 4 + Math.sin(G.time * 5) * 1.2, 0, Math.PI * 2); ctx.fill();
  }
  // Police blips flash red/blue.
  const flash = Math.floor(G.time * 4) % 2 === 0;
  ctx.fillStyle = flash ? '#ff5147' : '#5aa2ff';
  for (const c of G.cops) {
    ctx.beginPath(); ctx.arc(x + c.x * scale, y + c.y * scale, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Player arrow.
  const px = x + G.player.x * scale, py = y + G.player.y * scale;
  const ang = G.player.car ? G.player.car.angle : G.player.angle;
  ctx.translate(px, py);
  ctx.rotate(ang + Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(4.4, 5); ctx.lineTo(0, 2.4); ctx.lineTo(-4.4, 5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('MARISOL', x + 6, y + 14);
}
