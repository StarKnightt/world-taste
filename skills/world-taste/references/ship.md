# Ship

A world that only exists on localhost doesn't exist. Shipping is part of the build, and the recording is often the only thing people ever see.

## Build these in from the start

- `?hud=0` hides every piece of UI, debug text and helper. Recordings and checks use it.
- `?cam=<name>` starts on a named camera (the hook handles this).
- A **hero spawn**: the player starts where the hero shot is, facing the best view, at the best time of day. The first frame someone sees is the most important frame of the build.
- A **time-of-day switch** if the world has a cycle (a key or a button), so you can record each look.
- Touch controls, if people will open it on a phone.

## Recording

- 1920×1080, 60 fps. Record the browser at 100% zoom, full screen, no cursor.
- Open on the hero shot within the first second. No loading screen, no title card, no menu.
- Move slowly. Fast camera moves turn grass and trees into noise after compression.
- Show one thing changing (time of day, weather on request, a creature passing, a boat leaving) to prove it's live, not a render.
- Keep the camera at ground level for most of the clip.
- Keep the ambient audio on.
- Under a minute for a feed, unless the build is a playable game worth showing for longer.

A scripted camera path recorded with Playwright's `recordVideo`, or a screen recorder (OBS) on a real GPU, both work. Software-rendered headless recordings stutter, so record on real hardware.

## README

The top of the README is the hero image or a short GIF, then one line on what it is. Then:

1. How to run it (`pnpm i && pnpm dev`) and a play link if it's hosted
2. Controls
3. What's in it (systems, in plain words)
4. Credits: every model, texture, sound and reference with source and license (copy from `refs/CREDITS.md` and your asset list)
5. How it was built (models used, the skill), if the user wants that shown

## Licenses

- CC0 (Poly Haven, ambientCG, Kenney, Quaternius): free to use, credit anyway.
- Mixamo: free under Adobe's terms, fine inside a game, don't redistribute the raw files.
- Generated models: check the generator's plan terms for commercial use.
- Game screenshots and copyrighted photos: reference only, never shipped in the repo or the build.

## Final proof

Before you say it's done, show:
- The final contact sheet with no must-fix items
- The hero shot next to its closest reference
- The slow-motion strip if anything moves
- The recording, or the command to make it
- What still differs from the references, and why it was left
