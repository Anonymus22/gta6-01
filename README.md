# PALM HEAT — a Marisol story

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Anonymus22/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Anonymus22/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original top-down 2D open-world crime game in vanilla JavaScript + Canvas.
No libraries, no build step, no network requests — open `game/index.html` and play.

## The story

Rico Vega comes home to **Marisol**, a sun-soaked coastal city of pastel
blocks, palm parks and one long beach. His aunt **Rosa Delgado** is drowning
in "protection" debt to the Corallo family, fixer **Marco "Pipes" Serrano**
has work that pays, and debt-dodger **Benny Salas** has money that isn't his.
Across **five story missions** — Homecoming, Package Deal, Settle a Debt,
Night Run, and Harbor Lights — Rico drives, hustles and fights his way from
errand boy to the deed buried under the harbor light.

## What's in the world

- **A living city**: a procedural road grid with lane-following traffic that
  stops for obstacles, parked cars, strolling pedestrians who flee danger,
  named districts (Downtown, Cielo Heights, the Mercado, the Old Port,
  Las Brisas, Las Palmas Beach) and landmarks — St. Solana Hospital,
  Marisol PD, Rosa's Diner, the Old Port Warehouse, Casa Segura and the
  Solana Sports & Arms gun shop.
- **Driving**: velocity-based handling with real drift and a handbrake,
  chase camera, enter/exit *any* car with E — stealing a driven car pulls
  its driver out and brings the heat.
- **Crime & police**: theft, collisions, assaults and gunfire raise a
  1–5 star wanted level from a heat system. Interceptors spawn, chase and
  ram; break line of sight and the heat bleeds away. Get pinned and you're
  **BUSTED**; hit zero health and you're **WASTED** — both cost money and
  drop you at the station or the hospital.
- **Combat**: fists, and a purchasable pistol with mouse aim, muzzle flash,
  hit reactions and knockback.
- **Work**: the 5-mission story chain with dialogue, objective markers,
  timers, passengers and escapes — plus repeatable **taxi fares** and
  timed **diner deliveries** for cash.
- **HUD & minimap**: health/armour, cash, wanted stars, weapon and ammo,
  current objective, dialogue box, and a live minimap with roads, flashing
  police blips and the objective marker.
- **Sound**: fully synthesized WebAudio — engine hum, two-tone sirens,
  gunshots, punches, crashes, cash and mission jingles. No audio files.
- **Save/continue**: money, story progress, loadout and position persist in
  localStorage.

## Controls

| Input | Action |
| --- | --- |
| W A S D / arrows | Move / drive |
| Shift | Sprint |
| E | Enter/exit car · talk · start jobs · buy |
| Mouse | Aim |
| Left click / F | Punch / shoot |
| Space | Handbrake |
| Q / 1 / 2 | Swap weapon |
| P / Esc | Pause |
| M | Mute |

## Running it

Serve the folder statically (for example `node serve.ts` from this repo) and
open `game/` — or just open `game/index.html` from a local server. Everything
runs offline in a desktop browser.

Everything in Marisol is fictional and original: the city, its people, its
cars (Solana Sedan, Brisa Coupe, Mercado Hatch, Palma Taxi, the PD
Interceptor) and its story were written for this game.
