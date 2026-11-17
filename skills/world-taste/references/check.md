# The browser check

`scripts/world-check.mjs` opens your world in a real browser, takes the same shots every run, measures them, and lays them next to your references in one image. You (the agent) then look at that image and fix what looks fake.

## Setup (once per project)

1. Install Playwright in the project:
   ```
   pnpm add -D playwright
   pnpm exec playwright install chromium
   ```
   (npm and yarn work too. If Google Chrome is installed, the script falls back to it.)

2. Copy `scripts/world-taste-hook.js` into the project and register fixed cameras once the scene is built:
   ```js
   import { installWorldTaste } from './world-taste-hook.js';

   installWorldTaste({
     camera,
     controls,                       // optional, e.g. OrbitControls
     cameras: {
       hero:   { position: [0, 2, 12],   target: [0, 1.5, 0] },
       wide:   { position: [40, 8, 40],  target: [0, 2, 0] },
       ground: { position: [2, 1.6, 4],  target: [0, 1.2, -6] },
       away:   { position: [-8, 2, -14], target: [0, 1.5, 0] },
       motion: { position: [5, 2, 6],    target: [0, 1, 0] },
     },
     setTimeScale: (s) => { world.timeScale = s; },
     beforeShot: () => { player.enabled = false; },
   });
   ```
   - Put camera heights relative to the terrain: `heightAt(x, z) + 1.7`. Fixed absolute heights end up under hills.
   - `hero` is the frame people will remember. `ground` must have detail within a few meters. `away` looks away from the sun (the side most builds forget to light). `motion` frames whatever moves.
   - Pass `setTimeScale` only if your loop multiplies delta time by it. That enables the slow-motion strip.
   - The hook also makes `?cam=hero` start the page on that camera.
   - The script appends `?hud=0`. Hide all UI when that's set.

3. Put 4 to 6 reference images in `refs/` (and credits in `refs/CREDITS.md`).

## Run

Start the dev server, then:

```
node <skill-dir>/scripts/world-check.mjs --url http://localhost:5173
```

Options:

| Flag | Default | What it does |
|---|---|---|
| `--url` | required | Page to check |
| `--refs` | `refs` | Folder of reference images |
| `--out` | `.world-check` | Output folder (wiped each run) |
| `--size` | `1280x720` | Viewport |
| `--wait` | `4000` | Wait in ms before shots when there's no hook |
| `--headed` | off | Open a visible browser. Use on a machine with a GPU to get real FPS |
| `--strict` | off | Exit 1 on warnings too, not only on must-fix items |

Add `.world-check/` to `.gitignore`.

## What you get

- `.world-check/contact-sheet.png`: flags at the top, your shots, the references, and the 0.25x slow-motion strip.
- `.world-check/report.md`: must-fix items, things to look at, and next steps.
- `.world-check/report.json`: every metric, for tracking changes between runs.
- `.world-check/shots/`: the raw screenshots.

Exit code 1 means there are must-fix items. Exit code 2 means the script couldn't run (no URL, no Playwright).

## What it catches automatically

**Must fix**
- Page didn't load, no canvas, uncaught errors
- Blank or near-solid frames (broken render)
- A flat bottom third of the frame: camera under the terrain, no ground, or untextured ground near the camera

**Look at these**
- Console errors and failed requests (missing textures and models)
- Canvas rendering below display resolution
- Low FPS on a real GPU (software renderers are detected and ignored)
- Low contrast (flat lighting), blown-out whites, crushed blacks
- One uniform green across foliage
- Oversaturation
- Brightness, contrast and saturation far from your references
- Slow-motion frames that don't change (time scale not wired, or nothing moves)

## What it can't catch

Slop. The numbers only find broken renders. Wrong shadow color, fake water, plastic materials, bad scale, stiff animation: you find those by looking at the contact sheet next to the references and going through the slop list in SKILL.md. Write down every difference you can name, fix the biggest, run again. Two rounds per system, then move on or change approach.

## Headless notes

In CI or a cloud container with no GPU, Chromium falls back to a software renderer (SwiftShader). Images are still accurate, but frame rates are meaningless, and heavy scenes can take a minute per run. The report says when this happens.
