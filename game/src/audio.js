// All sound in Palm Heat is synthesized with WebAudio — no audio files.
// A tiny synth: oscillators for tones, filtered noise bursts for impacts,
// and two always-on voices (engine hum, police siren) whose parameters the
// game nudges every frame.

let ctx = null;
let master = null;
let engineOsc = null, engineGain = null;
let sirenOsc = null, sirenGain = null, sirenLfo = null;
let muted = false;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);

  // Engine voice: a sawtooth through a lowpass, gain follows throttle.
  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 55;
  const engineFilter = ctx.createBiquadFilter();
  engineFilter.type = 'lowpass';
  engineFilter.frequency.value = 420;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  engineOsc.connect(engineFilter).connect(engineGain).connect(master);
  engineOsc.start();

  // Siren voice: square wave whose pitch is wobbled by an LFO (two-tone feel).
  sirenOsc = ctx.createOscillator();
  sirenOsc.type = 'triangle';
  sirenOsc.frequency.value = 760;
  sirenLfo = ctx.createOscillator();
  sirenLfo.type = 'square';
  sirenLfo.frequency.value = 0.7;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 190;
  sirenLfo.connect(lfoGain).connect(sirenOsc.frequency);
  sirenGain = ctx.createGain();
  sirenGain.gain.value = 0;
  sirenOsc.connect(sirenGain).connect(master);
  sirenOsc.start();
  sirenLfo.start();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}
export function isMuted() { return muted; }

// rpm 0..1 while driving, -1 when not in a car.
export function setEngine(rpm) {
  if (!ctx || !engineGain) return;
  const t = ctx.currentTime;
  if (rpm < 0) {
    engineGain.gain.setTargetAtTime(0, t, 0.08);
  } else {
    engineOsc.frequency.setTargetAtTime(50 + rpm * 165, t, 0.05);
    engineGain.gain.setTargetAtTime(0.05 + rpm * 0.075, t, 0.05);
  }
}

// level 0..1 by nearest police car; 0 silences the siren.
export function setSiren(level) {
  if (!ctx || !sirenGain) return;
  sirenGain.gain.setTargetAtTime(level * 0.045, ctx.currentTime, 0.15);
}

function noiseBuffer() {
  const len = ctx.sampleRate * 0.5;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
let sharedNoise = null;

function burst(dur, freq, gain, type = 'lowpass') {
  if (!ctx) return;
  if (!sharedNoise) sharedNoise = noiseBuffer();
  const src = ctx.createBufferSource();
  src.buffer = sharedNoise;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start();
  src.stop(t + dur + 0.02);
}

function tone(freq, dur, gain, type = 'sine', slideTo = null, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.03);
}

export const sfx = {
  gunshot() { burst(0.16, 2600, 0.5, 'highpass'); burst(0.1, 300, 0.4); },
  punch() { burst(0.09, 240, 0.5); tone(90, 0.09, 0.25, 'sine', 45); },
  hitCar() { burst(0.14, 700, 0.35); tone(140, 0.12, 0.2, 'square', 70); },
  crash() { burst(0.3, 500, 0.5); tone(70, 0.28, 0.3, 'sawtooth', 38); },
  cash() { tone(880, 0.09, 0.16, 'square'); tone(1318, 0.14, 0.16, 'square', null, 0.07); },
  pickup() { tone(520, 0.08, 0.18, 'sine', 780); },
  door() { tone(180, 0.07, 0.2, 'square', 120); burst(0.05, 900, 0.12); },
  complete() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 0.16, 'triangle', null, i * 0.09));
  },
  fail() { tone(320, 0.2, 0.18, 'sawtooth', 160); tone(210, 0.3, 0.16, 'sawtooth', 110, 0.14); },
  busted() { [392, 330, 262].forEach((f, i) => tone(f, 0.18, 0.16, 'square', null, i * 0.13)); },
  click() { tone(660, 0.05, 0.1, 'square'); },
  horn() { tone(370, 0.16, 0.14, 'square'); tone(466, 0.16, 0.1, 'square'); },
};
