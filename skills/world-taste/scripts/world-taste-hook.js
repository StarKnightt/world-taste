// world-taste hook: lets world-check take the same shots every run.
// Copy this file into your project and call installWorldTaste() once the scene is ready.
//
//   import { installWorldTaste } from './world-taste-hook.js';
//   installWorldTaste({
//     camera,                          // your THREE.PerspectiveCamera
//     controls,                        // optional: OrbitControls or anything with .target and .update()
//     cameras: {
//       hero:   { position: [0, 2, 12],  target: [0, 1.5, 0] },   // the shot people will remember
//       wide:   { position: [30, 6, 30], target: [0, 2, 0] },
//       ground: { position: [2, 1.6, 4], target: [0, 1.2, -6] },  // eye level, detail near camera
//       away:   { position: [-8, 2, -14], target: [0, 1.5, 0] },  // looking away from the sun
//       motion: { position: [5, 2, 6],   target: [0, 1, 0] },     // frames whatever moves
//     },
//     setTimeScale: (s) => { world.timeScale = s; },  // optional: enables the slow motion strip
//     beforeShot: () => { player.enabled = false; },  // optional: freeze input, hide HUD
//   });
//
// Your game loop must read the time scale, e.g. `const dt = clock.getDelta() * world.timeScale`.

export function installWorldTaste({ camera, controls, cameras, setTimeScale, beforeShot, ready } = {}) {
  if (!camera || !cameras) throw new Error('installWorldTaste needs { camera, cameras }');
  const names = Object.keys(cameras);
  window.__worldTaste = {
    ready: ready ?? new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    cameras: names,
    setCamera(name) {
      const c = cameras[name];
      if (!c) return;
      if (beforeShot) beforeShot(name);
      camera.position.set(...c.position);
      if (controls && controls.target) {
        controls.target.set(...c.target);
        controls.update();
      } else {
        camera.lookAt(...c.target);
      }
      if (c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
    },
    setTimeScale: setTimeScale || undefined,
  };
  // ?cam=hero starts the page on a named camera (handy for recordings and screenshots)
  const start = new URLSearchParams(location.search).get('cam');
  if (start && cameras[start]) window.__worldTaste.setCamera(start);
}
