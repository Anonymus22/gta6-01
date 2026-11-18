// PALM HEAT — handover program for the gta6-01 bounty (Node 22, stdlib only).
//
// The entry itself is the game/ folder beside this file: a complete top-down
// open-world crime game (PALM HEAT, set in the fictional city of Marisol)
// written in vanilla JavaScript ES modules with a canvas renderer — no
// libraries, no build step, no network. This program's whole job is to hand
// it in: copy game/ and screenshots/ into the output directory and write the
// dossier the judges score, using the vendored buildDossier so the bytes
// match what the scorer computes from the same tree.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fresh output tree: the game exactly as it sits in this repository.
mkdirSync(outputDir, { recursive: true });
cpSync(join(root, 'game'), join(outputDir, 'game'), { recursive: true });

// Screenshots are evidence the game really plays; copy whatever renders sit
// in screenshots/ (the scorer caps the count and size — see the caps below).
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(root, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier is canonical JSON built from the output tree. The caps mirror
// the bounty gate: the authored-text budget shapes the dossier bytes, while
// the remaining caps simply refuse trees the scorer would refuse anyway —
// too many screenshots or one too heavy, too many files under game/, too
// many bytes in total, or a single path longer than the limit.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`PALM HEAT handed in — dossier of ${Buffer.byteLength(dossier)} bytes written to ${outputDir}`);
