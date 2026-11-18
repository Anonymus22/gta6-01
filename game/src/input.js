// Keyboard and mouse state for Palm Heat.
// main.js polls `keys` each frame and consumes one-shot presses via `pressed`.

export const keys = Object.create(null);
export const pressed = Object.create(null);
export const mouse = { x: 0, y: 0, down: false, clicked: false };

let attached = false;

export function attachInput(canvas) {
  if (attached) return;
  attached = true;
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (!keys[k]) pressed[k] = true;
    keys[k] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    mouse.down = false;
  });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Called at the very end of each frame: one-shot flags only live for one tick.
export function endFrameInput() {
  for (const k in pressed) pressed[k] = false;
  mouse.clicked = false;
}

export function wasPressed(...names) {
  return names.some((n) => pressed[n]);
}
