---
name: world-taste
description: Art direction, real references and a browser check for Three.js and WebGPU worlds, so 3D builds look like real places instead of AI slop. Use whenever building, improving or reviewing a 3D scene, browser game world, environment, terrain, landscape, city, level or anything rendered with three.js, react-three-fiber or WebGPU.
---

# world-taste

You are building a 3D world that a stranger will see for two seconds in a feed. In those two seconds it has to read as a real place with a real time of day, not a tech demo. Everything in this skill serves that.

This skill comes from 20+ shipped browser worlds (coasts, valleys, festivals, islands, cities, rivers, a horse ride, a boat ride) and every mistake made along the way. Follow the process in order. Do not skip steps because the scene "looks fine". It looks fine to you because you wrote it.

## 0. Declare before you build

Before any code, write one block at the top of your plan and show it to the user:

```
WORLD:      <the place, in one line>
TIME:       <time of day and weather>
HERO SHOT:  <the single frame people will screenshot>
DIRECTION:  <one direction from references/art-directions.md>
CAMERA:     <ground level | eye level | low drone>  (default: ground level)
DIALS:      REALISM <1-10> · DENSITY <1-10> · LIFE <1-10>
```

The dials, with defaults if the user gives none:

| Dial | 1 | 10 | Default |
|---|---|---|---|
| REALISM | Flat toon, outlines, painted sky | Photographic materials and light | 6 |
| DENSITY | Sparse, open, minimal props | Lush, layered, packed with detail | 7 |
| LIFE | Static diorama | Wind, water, birds, people, everything moves | 6 |

The user can change a dial in plain words ("realism 3", "make it denser"). Re-read the dials before every system.

If the brief is vague ("make a cool 3D world"), pick the strongest direction for it yourself, state it in the block, and go. Do not ask more than one question.

## 1. Pick one art direction

Open `references/art-directions.md`. Offer the user three directions that fit the brief, recommend one, and use it unless they choose another. Each direction fixes the sun angle, sun color, sky, fog, palette and the one signature detail that sells it.

Rules:
- One direction per world. Never blend two ("golden hour coast at night with neon") unless the user asks for a time-of-day cycle, and then each time of day is its own direction.
- Daylight first. Night-only worlds read as dark rectangles in a feed. If the world has night, it also has a day.
- The direction's numbers are the starting point, not a suggestion. Change them only after a check shows a reason.

## 2. Get real references

You cannot judge your own render against your own imagination. Collect 4 to 6 real reference images that match the direction:

- Real photographs of this kind of place at this time of day (Unsplash, Pexels, Wikimedia Commons).
- Screenshots from games that nailed this look, for comparison only, never shipped.
- The user's own images first, if they gave any. Those beat everything.

Save them in `refs/` at the project root, and write `refs/CREDITS.md`:

```
| File | Source | Author | License | Used for |
|---|---|---|---|---|
| coast-01.jpg | https://unsplash.com/photos/... | Name | Unsplash License | sun glint, rock color |
```

If you cannot download images in this environment, ask the user to drop 4 to 6 into `refs/` and continue building while you wait. Do not run the visual check without references.

Before building, write 5 to 10 observations from the references in plain words. These become your targets:
- "Shadows are blue-purple, not grey."
- "Far hills fade to the sky color, not to white."
- "Grass is yellow-green at the tips, dark at the roots."
- "There are three distinct greens: grass, pine, moss."

## 3. Build in order, one system at a time

Order: **terrain → sky and light → water → ground cover and grass → trees and rocks → props → characters and animals → audio → polish.**

Finish each system before starting the next, then run the check (step 4). A finished system has no known flaws in the check, not "good enough for now".

Recipes for every system, with tested code, are in `references/systems.md`. Use them as the base and adapt to the direction. Before writing a system from scratch:

1. Check whether the project or the user's earlier projects already solved it. Reuse proven terrain, water, sky and render code instead of rewriting it.
2. Check the installed skills for this stack (three.js, WebGPU, Blender, game skills) and read the ones that match. They exist so you don't guess APIs.
3. For anything the user will look at closely (water, grass, clouds, a hero object), spend two minutes researching how good projects do it before writing code.

### Non-negotiables while building

- **Ground level.** Put the camera where a person stands or rides. Distance kills detail: from high up, everything turns into blurry paint and nothing reads. Only go high if the brief demands it, and then add near detail into the frame.
- **One sun.** Every shadow, highlight, god ray and fog tint agrees with one sun position. If the sun is low in the west, shadows point east in every shot.
- **Near, middle, far.** Every hero frame has something close to the camera (grass, a rail, a rock), a subject in the middle, and a horizon that fades into atmosphere.
- **Scale contrast.** Big things next to small things. A world where everything is one size looks like a model kit.
- **No pure black, no pure white.** Shadows carry sky color. Highlights carry sun color.
- **Full resolution.** Render at device pixel ratio (capped at 2), never below 1. Sharp anti-aliasing (MSAA, SMAA or FXAA). No downscaled render targets for the main pass.
- **Only three post effects:** tone mapping, light bloom on real light sources, fog. No painterly filters, film grain, chromatic aberration, motion blur, vignette crush or dithered LOD fades unless the user asks.
- **Clean weather by default.** Rain, snow and storms only on request.
- **Synthesized audio** with Web Audio (wind, water, footsteps, birds) unless the user supplies files. A silent world feels dead in a screen recording.
- **No floating UI text** in the scene. Any HUD hides with `?hud=0`.

## 4. Check in a real browser

This is the step that separates this skill from a list of tips. After each system:

1. Add the hook once per project. Copy `scripts/world-taste-hook.js` into the project and register 4 to 6 fixed cameras: `hero`, a wide shot, an eye-level shot with detail near the camera, a shot looking away from the sun, and `motion` if anything moves. If the game has a time scale, pass `setTimeScale` so the check can record a slow-motion strip. Details: `references/check.md`.
2. Start the dev server, then run:

   ```
   node <skill-dir>/scripts/world-check.mjs --url http://localhost:5173 --refs refs --out .world-check
   ```

   (Needs Playwright in the project: `pnpm add -D playwright && pnpm exec playwright install chromium`. On a machine with a GPU add `--headed` for real frame rates.)
3. Read `.world-check/report.md`, then open `.world-check/contact-sheet.png` and look at it. Shots on top, references below, slow-motion strip at the bottom.
4. Fix every **Must fix** item. Then compare each shot with the closest reference and go through the slop list below. Write down each difference you can name ("our shadows are grey, theirs are blue", "our far hills are too sharp").
5. Fix the biggest difference first. Run the check again.

**Two fix rounds per system, then move on.** If a system still fails after two rounds, change approach (different technique, different asset, stronger model) instead of a third round of tweaks. Endless polish loops burn the budget and rarely converge.

The numbers catch broken renders. Your eyes catch slop. You need both. Never call a system done from reading code.

## 5. The slop list

Check every screenshot against this. Any hit means the system is not done.

**Light**
- Flat, even light with no clear sun direction
- Shadows that are grey or black instead of tinted by the sky
- God rays that fall straight down at sunset (they must follow the sun angle)
- Bloom so strong that whites blow out, or bloom on things that are not light sources
- An ambient light turned up to "fix" darkness, washing everything out

**Color**
- One uniform green across grass, trees and bushes
- Saturation pushed up everywhere instead of in one or two places
- Far mountains as sharp and saturated as near ones (no aerial perspective)
- Ground color that doesn't match what grows on it (bright grass on brown ground)

**Surfaces**
- The same texture visibly repeating across the ground
- Plastic water: no depth color, no reflection, no shoreline
- Black tree trunks or dark outlines around leaves (alpha and lighting bugs)
- Everything with the same roughness, so nothing looks wet, dry or dusty

**Placement**
- Objects floating above the terrain or sunk into it
- Trees and rocks in a grid or evenly spaced
- Everything at the same scale, nothing big next to something small
- An empty foreground: nothing within a few meters of the camera
- Grass or flowers growing underwater, or a grass patch ending in a hard edge or circle

**Motion** (full rules in `references/motion.md`)
- Feet sliding while planted
- Riders stuck on top of animals like stickers
- Grass and trees frozen, or all swaying in perfect sync
- Movement that falls apart at 0.25x speed

**Frame**
- Camera too high or too far, so the world reads as a blur
- HUD, debug text, FPS counters or helper gizmos in the shot
- Low resolution or jagged edges from a downscaled render

## 6. Motion and characters

Environments are where AI 3D builds shine. Motion is where they break. Keep combat, climbing and hand contact minimal unless the user asks for them, and treat any animal or character as its own system with its own check. Read `references/motion.md` before building anything that walks, runs, rides, swims or flies.

The core test: play every movement at 0.25x. If it falls apart in slow motion, it isn't done.

## 7. Scope rules

- Lock the concept before building. One pivot at most.
- Build what was asked. No extra features, menus or modes nobody requested.
- Ship when it stops the scroll, not when it matches a AAA game.
- Run sub-agents one at a time on heavy scenes. Don't max out the user's CPU or GPU during checks.
- If you stall twice on the same problem, stop, say what is blocking, and switch approach or model.

## 8. Ship

Read `references/ship.md`. In short:
- `?hud=0` recording mode and a `?cam=hero` start, built in from the start, not bolted on at the end.
- A 1920×1080, 60 fps recording that opens on the hero shot within the first second.
- README with the hero image or GIF at the top, how to run it, controls, and credits for every asset and reference.
- Asset licenses checked. Credits for every model, texture and sound you didn't make.

## Done means proof

Never say a world is done without:
- The final `.world-check/contact-sheet.png` with no Must fix items.
- The hero shot next to its closest reference.
- The slow-motion strip, if anything moves.
- A list of what still differs from the references and why it was left.

## Credits

The builder-and-critic loop behind the browser check is Matt Shumer's gauntlet loop. The brief → direction → verify structure was inspired by Leon Lin's Taste Skill for frontend design; world-taste applies the same idea to 3D worlds and adds a working visual check. Built and battle-tested by Prasenjit Nayak ([@prasenx](https://x.com/prasenx)).
