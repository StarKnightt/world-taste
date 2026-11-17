# System recipes

Tested starting code for each system, written for three.js (r170+, WebGL). Every snippet here was rendered and checked with world-check before it went into this file. Adapt the numbers to your art direction; keep the structure.

Imports assume an import map or bundler that resolves `three` and `three/addons/`.

Build order: terrain → sky and light → water → grass → trees and rocks → props → characters → audio.

---

## Render setup

Full resolution, one tone mapper, soft shadows. Do this first so every later check is judged under the final pipeline.

```js
import * as THREE from 'three';
// Render setup: full resolution, sharp, one tone mapper, nothing painterly.
export function makeRenderer(container = document.body) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // never below 1
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8; // lower this before you touch bloom if whites clip
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  addEventListener('resize', () => renderer.setSize(innerWidth, innerHeight));
  return renderer;
}
```

Rules:
- Pixel ratio capped at 2, never below 1. Do not render the main pass to a smaller target to save frames; cut grass count or shadow size instead.
- Lower `toneMappingExposure` before touching bloom when whites clip. If the sun disc itself is in frame, some clipping around it is fine.
- Add bloom (`UnrealBloomPass` with threshold around 0.9, strength 0.3 to 0.6) only for real light sources: lanterns, neon, the sun. Never as a "glow" on everything.
- With post-processing, add an anti-aliasing pass (SMAA or FXAA) last, because the composer bypasses MSAA.

## Sky and sun

One sun drives the sky, the directional light, the shadow direction, the fog tint and the grass and water highlights. Build them from the same two numbers.

```js
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
// One sun drives everything: sky, directional light, fog, shadows.
// elevation and azimuth in degrees. Low elevation = golden hour.
export function makeSkyAndSun(scene, renderer, { elevation = 8, azimuth = 200, sunColor = 0xffc58a, fogColor = 0xd9b38c, fogDensity = 0.012 } = {}) {
  const sky = new Sky();
  sky.scale.setScalar(10000);
  const u = sky.material.uniforms;
  u.turbidity.value = 6; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
  scene.add(sky);

  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth));
  u.sunPosition.value.copy(sunDir);

  const sun = new THREE.DirectionalLight(sunColor, 3.2);
  sun.position.copy(sunDir).multiplyScalar(120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const s = sun.shadow.camera; s.left = s.bottom = -70; s.right = s.top = 70; s.near = 1; s.far = 400;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  // Fill light comes from the sky, not from nowhere. Never use a bright AmbientLight.
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x4a3b2a, 0.55));

  // Environment lighting from the sky itself, so materials pick up its color.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(sky.clone());
  scene.environment = pmrem.fromScene(envScene).texture;
  scene.environmentIntensity = 0.35;

  scene.fog = new THREE.FogExp2(fogColor, fogDensity);
  return { sky, sun, sunDir };
}
```

Rules:
- Take `elevation`, `azimuth`, `sunColor`, `fogColor` from the chosen art direction.
- Keep the shadow camera tight around where the player is (move it with the player in big worlds). A huge shadow box gives blurry, blocky shadows.
- Fill light is a `HemisphereLight` (sky color above, ground bounce below). A bright `AmbientLight` flattens everything and is the most common cause of "flat, even lighting".
- Clouds: a few large soft shapes beat many small ones. For a toon look, layered planes with soft alpha; for realism, the sky shader plus 2 to 3 cloud layers at different heights.

## Terrain

Big forms first, small noise last. Color by height, slope and patches, so the ground never reads as one flat color.

```js
import * as THREE from 'three';
// Big forms first, small noise last. Color by height and slope, never one flat green.
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 5) { let f = 0, amp = 0.5, fr = 1; for (let i = 0; i < oct; i++) { f += amp * noise(x * fr, y * fr); fr *= 2.03; amp *= 0.5; } return f; }
export const heightAt = (x, z) =>
  (fbm(x * 0.008, z * 0.008, 3) - 0.5) * 38 +   // big hills
  (fbm(x * 0.04, z * 0.04, 3) - 0.5) * 4 +      // mounds
  (fbm(x * 0.3, z * 0.3, 2) - 0.5) * 0.25;      // ground noise

export function makeTerrain(scene, { size = 600, segments = 300, grass = 0x6f8f3a, dry = 0xa89a5c, dirt = 0x6e5a42, rock = 0x8a857c } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const n = geo.attributes.normal, colors = new Float32Array(p.count * 3);
  const G = new THREE.Color(grass), D = new THREE.Color(dry), Di = new THREE.Color(dirt), R = new THREE.Color(rock), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), slope = 1 - n.getY(i);
    c.copy(G).lerp(D, THREE.MathUtils.smoothstep(fbm(x * 0.02, z * 0.02), 0.35, 0.75) * 0.8); // patches of dry grass
    c.lerp(Di, THREE.MathUtils.smoothstep(slope, 0.12, 0.25));                                 // dirt on slopes
    c.lerp(R, THREE.MathUtils.smoothstep(slope, 0.3, 0.45));                                    // rock on steep parts
    c.offsetHSL(0, 0, (fbm(x * 0.5, z * 0.5) - 0.5) * 0.06 + y * 0.0015);                      // fine variation
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
```

Rules:
- Shape the playable area by hand after the noise (flatten paths, carve the riverbed, raise the hero viewpoint). Pure noise looks random, not designed.
- Match the ground color under grass to the grass root color, so gaps between blades don't flash brown.
- Close to the camera, add a detail texture (Poly Haven or ambientCG, CC0) blended by world position to break tiling. Never tile one texture across the whole map.
- Everything placed on the terrain uses `heightAt(x, z)` so nothing floats or sinks.

## Water

No texture files needed: depth color, fresnel reflection, sun glint, warped waves, foam only at the shore.

```js
import * as THREE from 'three';
// Stylized-real water with no texture files: depth color from shore distance,
// fresnel sky reflection, sun glint, moving normals from summed waves, foam only at the shoreline.
// heightAt(x,z) is your terrain height, used to bake a depth map into a vertex attribute.
export function makeWater(scene, heightAt, { size = 600, level = -2, shallow = 0x3f8f86, deep = 0x0a2c3d, sky = 0x9cc3e6, sunDir = new THREE.Vector3(0, 1, 0), sunColor = 0xffd2a0 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, 200, 200);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, depth = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) depth[i] = Math.max(0, level - heightAt(p.getX(i), p.getZ(i)));
  geo.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
  geo.translate(0, level, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uShallow: { value: new THREE.Color(shallow) }, uDeep: { value: new THREE.Color(deep) },
      uSky: { value: new THREE.Color(sky) }, uSunDir: { value: sunDir.clone().normalize() }, uSunColor: { value: new THREE.Color(sunColor) },
    }]),
    vertexShader: /* glsl */`
      attribute float aDepth; varying float vDepth; varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        vDepth = aDepth; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz;
        vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uShallow, uDeep, uSky, uSunDir, uSunColor;
      varying float vDepth; varying vec3 vWorld;
      #include <fog_pars_fragment>
      // warp the phase so wave crests never line up into visible stripes
      vec2 wave(vec2 p, vec2 d, float f, float s) { float ph = dot(p, d) * f + uTime * s + sin(p.y * 0.11 + p.x * 0.07) * 2.5 + sin(p.x * 0.23 - p.y * 0.17) * 1.3; return d * cos(ph) * f; }
      void main() {
        vec2 p = vWorld.xz;
        vec2 g = wave(p, normalize(vec2(1.0, 0.3)), 0.35, 1.2) * 0.12 + wave(p, normalize(vec2(-0.4, 1.0)), 0.9, 1.9) * 0.1
               + wave(p, normalize(vec2(0.7, -0.8)), 2.3, 2.7) * 0.05 + wave(p, normalize(vec2(-1.0, -0.2)), 5.1, 3.9) * 0.02;
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 v = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec3 water = mix(uShallow, uDeep, smoothstep(0.0, 6.0, vDepth));
        vec3 col = mix(water, uSky, clamp(fres, 0.0, 0.6));  // reflection mostly at grazing angles
        vec3 h = normalize(uSunDir + v);
        col += uSunColor * pow(max(dot(n, h), 0.0), 220.0) * 2.5;          // sun glint
        float foam = smoothstep(0.25, 0.0, vDepth) * (0.6 + 0.4 * sin(uTime * 2.0 + p.x * 1.7 + p.y * 1.3));
        col = mix(col, vec3(0.95), foam * 0.7);                              // foam only at the shore
        float alpha = mix(0.3, 0.97, smoothstep(0.0, 3.0, vDepth));        // see sand through shallows
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  scene.add(mesh);
  return { mesh, update: (t) => { mat.uniforms.uTime.value = t; } };
}
```

Rules:
- Shallow water is see-through and lighter; deep water is darker and more opaque. If the whole lake is one color, the depth attribute is wrong.
- Reflection belongs at grazing angles. Looking down, you see into the water.
- Waves must not line up into stripes. Warp the phase (as above) or use more wave directions.
- For a mirror-still lake, use `Reflector` from `three/addons/objects/Reflector.js` with a slight normal distortion. For the ocean with real reflections, use `Water` from `three/addons/objects/Water.js` with a normal map.
- Grass, flowers and props never spawn below the water level.

## Grass

Dense, thin, instanced blades with big slow wind waves, flutter, a root-to-tip gradient and per-blade variation. This is what makes a field look alive in a recording.

```js
import * as THREE from 'three';
// Dense, thin, instanced blades. Big slow wind waves plus small flutter.
// Root-to-tip gradient, per-blade hue jitter, ground color under it should match the root color.
// minY: no blades below this height (set it to your water level + 0.3 so grass never grows underwater).
// keep(x, z): optional filter, return false to skip a spot (paths, roads, under buildings).
export function makeGrass(scene, heightAt, { count = 120000, radius = 45, center = new THREE.Vector3(), root = 0x2f4a1c, tip = 0xb7c46a, height = 0.9, minY = -Infinity, keep = null } = {}) {
  const blade = new THREE.PlaneGeometry(0.06, 1, 1, 4);
  blade.translate(0, 0.5, 0);
  const bp = blade.attributes.position;
  for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); bp.setX(i, bp.getX(i) * (1 - y * 0.9)); } // taper to a point

  const offsets = new Float32Array(count * 4); // x, y, z, rotation
  const shape = new Float32Array(count * 3);   // height scale, lean, hue jitter
  let placed = 0;
  for (let tries = 0; placed < count && tries < count * 4; tries++) {
    const r = radius * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
    const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
    if (heightAt(x, z) < minY || (keep && !keep(x, z))) continue;
    const i = placed++;
    offsets.set([x, heightAt(x, z), z, Math.random() * Math.PI], i * 4);
    shape.set([height * (0.55 + Math.random() * 0.9), (Math.random() - 0.5) * 0.4, Math.random()], i * 3);
  }
  const geo = new THREE.InstancedBufferGeometry().copy(blade);
  geo.instanceCount = placed;
  geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 4));
  geo.setAttribute('aShape', new THREE.InstancedBufferAttribute(shape, 3));

  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uRoot: { value: new THREE.Color(root) }, uTip: { value: new THREE.Color(tip) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color(0xffd2a0) },
    }]),
    vertexShader: /* glsl */`
      attribute vec4 aOffset; attribute vec3 aShape;
      uniform float uTime; varying float vH; varying float vJit; varying vec3 vWorld;
      #include <fog_pars_vertex>
      void main() {
        vec3 p = position; p.y *= aShape.x;
        float c = cos(aOffset.w), s = sin(aOffset.w);
        p.xz = mat2(c, -s, s, c) * p.xz;
        vec3 w = p + aOffset.xyz;
        float h = position.y;                                   // 0 root .. 1 tip
        float gust = sin(w.x * 0.08 + uTime * 1.1) * 0.5 + sin(w.z * 0.05 + uTime * 0.7) * 0.5; // big slow waves
        float flutter = sin(uTime * 6.0 + aOffset.w * 10.0) * 0.06;
        float bend = (gust * 0.35 + flutter + aShape.y) * h * h;
        w.x += bend; w.z += bend * 0.4; w.y -= abs(bend) * 0.25 * h;
        vH = h; vJit = aShape.z; vWorld = w;
        vec4 mvPosition = viewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uRoot; uniform vec3 uTip; uniform vec3 uSunDir; uniform vec3 uSunColor;
      varying float vH; varying float vJit; varying vec3 vWorld;
      #include <fog_pars_fragment>
      void main() {
        vec3 col = mix(uRoot, uTip, smoothstep(0.0, 1.0, vH));
        col *= 0.85 + vJit * 0.3;                               // per-blade variation
        col += uSunColor * pow(vH, 3.0) * 0.18 * max(uSunDir.y, 0.15); // sunlit tips
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { mesh, update: (t) => { mat.uniforms.uTime.value = t; } };
}
```

Rules:
- 80k to 200k blades around the player on a mid-range GPU. Move the patch with the player (or use several patches) instead of covering the whole map.
- Fade density out at the patch edge (or hide it behind terrain and fog). A grass patch that ends in a hard circle is slop.
- Wind waves should be big and slow (you can see a wave travel across the field) with small flutter on top. Every blade swaying in sync looks like a screensaver.
- Pass `minY: waterLevel + 0.3` so grass never grows underwater, and use `keep(x, z)` to clear paths and roads.

## Trees and rocks

- Use real models. Generate trees in Blender (with the Blender MCP or a script) using alpha cards for leaves and needles, or use CC0 packs (Quaternius, Kenney, Poly Haven). Cones and spheres read as a toy.
- Trunks are brown-grey and lit by the sun. Black trunks mean missing normals or no fill light.
- Alpha-card leaves: `alphaTest: 0.5`, `side: THREE.DoubleSide`, and set `shadowSide` too. Dark halos around leaves mean premultiplied alpha or alpha blending; switch to alpha test.
- Vary scale (0.6x to 1.6x), rotation and lean on every instance. Place in clusters with clearings, never on a grid.
- Use `InstancedMesh` for anything repeated more than ~20 times.
- Rocks: sink them 10 to 30% into the ground, never sitting on top of it. Darken where they meet the ground (contact shadow or vertex AO).

## Props and buildings

- Generated 3D models (Tripo, Meshy, Rodin) work for solid props and characters. Poly Haven, Kenney and Quaternius cover most environment props under CC0.
- Every prop gets a reason to be there: a bench faces a view, a lamp lights a path, a boat sits at a dock.
- Wear and dirt where people touch and where water runs. Perfectly clean props look like a store render.
- Keep weapons, tools and riders as separate models attached at a joint, never baked into a character mesh.

## Characters and animals

Read `motion.md` before building anything that moves on its own. Mixamo covers humanoid animation; animals usually need hand-made cycles checked against real footage.

## Audio

Ambience from math: wind with gusts, water lapping, birds. Browsers block audio until the first click or key press, so start it from an input handler.

```js
// Ambient audio from math: wind (filtered noise with slow gusts), water lapping, birds.
// Browsers block audio until the user clicks or presses a key, so call start() from an input handler.
export function makeAmbience() {
  let ctx, master;
  function noiseBuffer(seconds = 2) {
    const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // brown noise
    return b;
  }
  function loopNoise() { const s = ctx.createBufferSource(); s.buffer = noiseBuffer(); s.loop = true; s.start(); return s; }
  function wind(level = 0.35) {
    const src = loopNoise(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.6;
    lfo.frequency.value = 0.08; lfoGain.gain.value = 250; lfo.connect(lfoGain).connect(bp.frequency); lfo.start(); // gusts
    g.gain.value = level; src.connect(bp).connect(g).connect(master);
    return g;
  }
  function water(level = 0.25) {
    const src = loopNoise(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 700;
    lfo.frequency.value = 0.22; lfoGain.gain.value = level * 0.6; lfo.connect(lfoGain).connect(g.gain); lfo.start(); // lapping
    g.gain.value = level; src.connect(lp).connect(g).connect(master);
    return g;
  }
  function chirp() {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f = 2200 + Math.random() * 1800;
    o.type = 'sine'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * (1.2 + Math.random() * 0.5), t + 0.08);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.15);
  }
  function birds() { const next = () => { const n = 1 + Math.floor(Math.random() * 4); for (let i = 0; i < n; i++) setTimeout(chirp, i * 140); setTimeout(next, 2500 + Math.random() * 6000); }; next(); }
  return {
    start({ windLevel = 0.35, waterLevel = 0, withBirds = true } = {}) {
      if (ctx) return;
      ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      wind(windLevel); if (waterLevel) water(waterLevel); if (withBirds) birds();
    },
    setVolume(v) { if (master) master.gain.value = v; },
  };
}
```

Rules:
- Wind follows the grass: when a big gust visibly crosses the field, the wind sound rises with it if you can sync it.
- Footsteps change with the surface (grass, wood, stone, water).
- Keep the mix quiet. Ambience is felt more than heard; a loud loop gets muted in five seconds.

## Time of day

If the world has a day cycle, each time of day is its own art direction. Interpolate sun elevation, sun color, fill colors, fog color and exposure together from a small table of keyframes (dawn, noon, golden hour, blue hour, night). Never animate the sun alone and leave fog and fill at noon values.
