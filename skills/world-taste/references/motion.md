# Motion: characters, animals and riders

Environments are where AI-built 3D worlds look best. Motion is where they break. A beautiful valley with a horse that skates across the grass gets roasted in the replies. Treat every moving creature as its own system, with its own references and its own check.

## Before you build

1. **Ask whether motion is needed.** If the world sells without a character (a calm ride, a walk, a view), keep the character small, far, or in a vehicle. Combat, climbing, grabbing and hand contact are the hardest things to get right. Keep them out unless the user asks for them.
2. **Get motion references.** Pull 8 to 12 frames from real footage of the exact movement (a horse at canter, a person walking uphill, a bird landing). Put them in `refs/motion/` with credits. Match timing and poses to these frames, not to memory.
3. **Pick the source:**
   - Humans: Mixamo animations on a rigged model (check Adobe's terms), or retargeted clips from your character tool.
   - Animals: a rigged model with hand-keyed or procedural cycles checked against footage. Generated meshes need a proper rig first.
   - Vehicles, boats, balloons: physics or springs, not keyframes.

## Rules

**The slow motion test.** Play every movement at 0.25x speed (world-check does this with `setTimeScale`). If it falls apart in slow motion (feet popping, limbs passing through the body, jitter), it isn't done. This is the core test.

**Feet stay planted.** A foot on the ground does not slide. Movement speed must match how fast the feet cycle: `speed = stride length × cycles per second`. When the character speeds up, scale the animation's playback rate with it.

**Weight and contact.** The body dips when weight lands and rises when it pushes off. Riders, carried items and attached props move with the joint they're attached to.

**Riders sit from the hips.** Parent the rider to the animal's spine or saddle bone, not to the root. The rider's hips follow the back's bob and the torso counter-moves slightly. A rider stuck rigidly on top like a sticker is the most visible failure.

**Turning.** Lean into turns (bodies and vehicles). Heads turn before bodies. Animals bend along the spine.

**Idle is never frozen.** Breathing, weight shifts, ear flicks, tail swings. A frozen idle reads as a statue.

**Secondary motion.** Hair, manes, tails, cloth and straps lag behind the body and settle after it stops. A simple spring per chain is enough.

**Ground alignment.** Feet sit on the terrain. On slopes, align the body to the ground normal (partially, about 50%) and use foot IK or at least per-foot raycasts for big creatures.

## Hard parts go to the strongest model

If the agent stalls twice on the same rig, skinning or IK problem, stop. Say what is blocking, then switch to the strongest model available or a different approach (a better rigged source model, a simpler cycle, a different camera angle). Do not loop a third time on the same idea.

## Keep the camera kind

Frame motion where it reads best: three-quarter view from the side, slightly low, at the creature's height. If the motion is still weak after two rounds, keep the hero shot on the environment and let the character pass through it, rather than putting a close-up on the weakest part of the build.

## Motion checklist

- [ ] Reference frames from real footage in `refs/motion/`
- [ ] 0.25x slow motion strip shows clean contacts and no popping
- [ ] No foot sliding at any speed
- [ ] Rider or prop moves with the right joint
- [ ] Idle has life
- [ ] Hair, tail and cloth lag and settle
- [ ] Turns lean, heads lead
