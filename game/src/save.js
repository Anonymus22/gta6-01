// localStorage persistence for Palm Heat: money, story progress, loadout
// and where Rico was standing. Deliberately tiny and forgiving — a corrupt
// or missing save just means "no save".

const KEY = 'palm-heat-save-v1';

export function hasSave() {
  try { return !!window.localStorage.getItem(KEY); } catch { return false; }
}

export function writeSave(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({
      money: Math.round(data.money),
      missionIndex: data.missionIndex,
      storyDone: !!data.storyDone,
      hasPistol: !!data.hasPistol,
      ammo: data.ammo,
      x: Math.round(data.x),
      y: Math.round(data.y),
      taxiDone: data.taxiDone || 0,
      deliveryDone: data.deliveryDone || 0,
    }));
  } catch { /* storage unavailable: play session-only */ }
}

export function readSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.money !== 'number' || typeof d.x !== 'number') return null;
    return d;
  } catch { return null; }
}

export function clearSave() {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}
