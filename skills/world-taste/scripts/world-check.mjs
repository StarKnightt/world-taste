#!/usr/bin/env node
// world-check: opens a 3D world in a real browser, screenshots it from fixed
// cameras, measures it, and puts it next to your reference images.
// The agent reads report.md and contact-sheet.png, then fixes what looks fake.
//
// Usage:
//   node world-check.mjs --url http://localhost:5173 [--refs refs] [--out .world-check]
//                        [--size 1280x720] [--wait 4000] [--headed] [--strict]
//
// Needs Playwright:  pnpm add -D playwright && pnpm exec playwright install chromium
// (If Chrome is already installed it is used directly.)
//
// Your game can expose cameras for repeatable shots (see references/check.md):
//   window.__worldTaste = { ready, cameras: ['hero', ...], setCamera(name), setTimeScale(s) }

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// ---------- args ----------
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const URL_ = opt('url');
if (!URL_ || URL_ === true) {
  console.error('world-check: --url is required, e.g. --url http://localhost:5173');
  process.exit(2);
}
const OUT = path.resolve(opt('out', '.world-check'));
const REFS = opt('refs', 'refs');
const [W, H] = String(opt('size', '1280x720')).split('x').map(Number);
const WAIT = Number(opt('wait', 4000));
const HEADED = opt('headed', false) === true;
const STRICT = opt('strict', false) === true;

// ---------- load playwright ----------
// The skill lives in .claude/skills (or similar), so resolve Playwright from the
// project being checked (cwd) first, then from next to this script.
import { createRequire } from 'node:module';
let chromium;
for (const base of [path.join(process.cwd(), 'noop.js'), import.meta.url]) {
  for (const name of ['playwright', 'playwright-core']) {
    try {
      const resolved = createRequire(base).resolve(name);
      const mod = await import(pathToFileURL(resolved).href);
      chromium = mod.chromium || mod.default?.chromium;
      if (chromium) break;
    } catch { /* try next */ }
  }
  if (chromium) break;
}
if (!chromium) {
  console.error('world-check: Playwright not found. In your project run: pnpm add -D playwright && pnpm exec playwright install chromium');
  process.exit(2);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const launchArgs = ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];
async function launch() {
  try {
    return await chromium.launch({ headless: !HEADED, args: launchArgs });
  } catch {
    // fall back to an installed Chrome
    return await chromium.launch({ headless: !HEADED, args: launchArgs, channel: 'chrome' });
  }
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => pageErrors.push(String(e.message || e)));
page.on('response', (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });
page.on('requestfailed', (r) => failedRequests.push(`failed ${r.url()}`));

// ?hud=0 so UI never ends up in the shots
const target = new URL(URL_);
if (!target.searchParams.has('hud')) target.searchParams.set('hud', '0');

let loadError = null;
try {
  await page.goto(target.toString(), { waitUntil: 'load', timeout: 60000 });
} catch (e) {
  loadError = String(e.message || e);
}

// wait for the game to say it's ready, or for --wait ms
const hasHook = await page.evaluate(() => !!window.__worldTaste).catch(() => false);
if (hasHook) {
  await page.evaluate(() => Promise.race([Promise.resolve(window.__worldTaste.ready), new Promise((r) => setTimeout(r, 30000))])).catch(() => {});
  await page.waitForTimeout(800);
} else {
  await page.waitForTimeout(WAIT);
}

// ---------- renderer info ----------
const gpu = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const out = { canvas: !!c, canvasSize: c ? `${c.width}x${c.height}` : null, cssSize: c ? `${c.clientWidth}x${c.clientHeight}` : null, renderer: null, api: null };
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      out.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      out.api = gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl';
    }
  } catch {}
  out.webgpu = !!navigator.gpu;
  return out;
}).catch(() => ({ canvas: false }));
const softwareGL = /swiftshader|llvmpipe|software|basic render/i.test(gpu.renderer || '');

// ---------- fps ----------
const perf = await page.evaluate(() => new Promise((resolve) => {
  const times = [];
  let last = performance.now();
  const start = last;
  function tick(t) {
    times.push(t - last); last = t;
    if (t - start < 3000) requestAnimationFrame(tick);
    else {
      const sorted = times.slice(1).sort((a, b) => a - b);
      const avg = sorted.reduce((a, b) => a + b, 0) / Math.max(1, sorted.length);
      resolve({ fps: Math.round(1000 / avg), p95ms: Math.round(sorted[Math.floor(sorted.length * 0.95)] || 0) });
    }
  }
  requestAnimationFrame(tick);
})).catch(() => ({ fps: 0, p95ms: 0 }));

// ---------- shots ----------
const shots = [];
async function snap(name) {
  const file = path.join(OUT, 'shots', `${name}.png`);
  await page.screenshot({ path: file });
  shots.push({ name, file });
}

let cameras = [];
if (hasHook) cameras = await page.evaluate(() => window.__worldTaste.cameras || []).catch(() => []);
if (cameras.length) {
  for (const cam of cameras) {
    await page.evaluate((c) => window.__worldTaste.setCamera(c), cam).catch(() => {});
    await page.waitForTimeout(700);
    await snap(cam.replace(/[^a-z0-9_-]/gi, '_'));
  }
} else {
  await snap('default');
  // a second shot a few seconds later, to catch things that only appear after load
  await page.waitForTimeout(2500);
  await snap('default-later');
}

// slow motion strip: 8 frames at 0.25x, only if the game supports time scale
const motion = [];
const canSlow = hasHook && (await page.evaluate(() => typeof window.__worldTaste.setTimeScale === 'function').catch(() => false));
if (canSlow) {
  if (cameras.includes('motion')) await page.evaluate(() => window.__worldTaste.setCamera('motion')).catch(() => {});
  await page.evaluate(() => window.__worldTaste.setTimeScale(0.25));
  await page.waitForTimeout(400);
  for (let i = 0; i < 8; i++) {
    const file = path.join(OUT, 'shots', `motion-${i}.png`);
    await page.screenshot({ path: file });
    motion.push(file);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.__worldTaste.setTimeScale(1)).catch(() => {});
}

// ---------- reference images ----------
const refDir = path.resolve(String(REFS));
const refs = fs.existsSync(refDir)
  ? fs.readdirSync(refDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).map((f) => path.join(refDir, f))
  : [];

// ---------- image metrics (computed in the browser, no extra deps) ----------
const toDataUrl = (file) => {
  const ext = path.extname(file).slice(1).toLowerCase().replace('jpg', 'jpeg');
  return `data:image/${ext};base64,${fs.readFileSync(file).toString('base64')}`;
};

const metricsPage = await browser.newPage();
await metricsPage.setContent('<html><body></body></html>');
async function measure(file) {
  return metricsPage.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const scale = Math.min(1, 480 / img.width);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    let n = 0, sumL = 0, sumL2 = 0, clip = 0, crush = 0, sumS = 0;
    const greens = [];
    const rowL = new Float64Array(h);
    for (let y = 0; y < h; y++) {
      let rl = 0;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
        const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const s = mx === 0 ? 0 : (mx - mn) / mx;
        let hue = 0;
        if (mx !== mn) {
          if (mx === r) hue = ((g - b) / (mx - mn)) % 6;
          else if (mx === g) hue = (b - r) / (mx - mn) + 2;
          else hue = (r - g) / (mx - mn) + 4;
          hue *= 60; if (hue < 0) hue += 360;
        }
        n++; sumL += L; sumL2 += L * L; sumS += s; rl += L;
        if (L > 0.985) clip++;
        if (L < 0.02) crush++;
        if (hue >= 65 && hue <= 165 && s > 0.2 && mx > 0.1) greens.push([hue, L]);
      }
      rowL[y] = rl / w;
    }
    const mean = sumL / n;
    const std = Math.sqrt(Math.max(0, sumL2 / n - mean * mean));
    let gHueStd = null, gLStd = null;
    if (greens.length > n * 0.05) {
      const mh = greens.reduce((a, g) => a + g[0], 0) / greens.length;
      const ml = greens.reduce((a, g) => a + g[1], 0) / greens.length;
      gHueStd = Math.sqrt(greens.reduce((a, g) => a + (g[0] - mh) ** 2, 0) / greens.length);
      gLStd = Math.sqrt(greens.reduce((a, g) => a + (g[1] - ml) ** 2, 0) / greens.length);
    }
    // vertical light falloff: top third vs bottom third (sky vs ground separation)
    const third = Math.floor(h / 3);
    const avg = (a, b) => { let s = 0; for (let y = a; y < b; y++) s += rowL[y]; return s / Math.max(1, b - a); };
    const top = avg(0, third), bottom = avg(h - third, h);
    // flatness of the bottom third: an empty floor means camera under terrain or no ground
    let bs = 0, bs2 = 0, bn = 0;
    const meanRGB = (y0, y1) => { let r = 0, g = 0, b = 0, k = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; k++; } return [r / k, g / k, b / k]; };
    for (let y = h - third; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const L = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
      bs += L; bs2 += L * L; bn++;
    }
    const bottomStd = Math.sqrt(Math.max(0, bs2 / bn - (bs / bn) ** 2));
    const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
    const row0 = [[], [], []];
    for (let x = 0; x < w; x++) for (let k = 0; k < 3; k++) row0[k].push(d[x * 4 + k]);
    const tc = row0.map(med), bc = meanRGB(h - third, h);
    const bottomLikeSky = Math.hypot(tc[0] - bc[0], tc[1] - bc[1], tc[2] - bc[2]) < 25;
    return {
      w: img.width, h: img.height,
      brightness: +mean.toFixed(3),
      contrast: +std.toFixed(3),
      saturation: +(sumS / n).toFixed(3),
      clippedPct: +((clip / n) * 100).toFixed(2),
      crushedPct: +((crush / n) * 100).toFixed(2),
      greenPct: +((greens.length / n) * 100).toFixed(1),
      greenHueSpread: gHueStd === null ? null : +gHueStd.toFixed(1),
      greenLightSpread: gLStd === null ? null : +gLStd.toFixed(3),
      topVsBottom: +(top - bottom).toFixed(3),
      bottomFlatness: +bottomStd.toFixed(4),
      bottomLikeSky,
    };
  }, toDataUrl(file));
}

for (const s of shots) s.m = await measure(s.file);
const refMetrics = [];
for (const r of refs) {
  try { refMetrics.push({ file: r, m: await measure(r) }); } catch { /* unreadable ref */ }
}
const refAvg = refMetrics.length
  ? Object.fromEntries(['brightness', 'contrast', 'saturation'].map((k) => [k, +(refMetrics.reduce((a, r) => a + r.m[k], 0) / refMetrics.length).toFixed(3)]))
  : null;

// motion: how much consecutive slow-mo frames differ (0 = frozen)
let motionDiff = null;
if (motion.length > 1) {
  motionDiff = await metricsPage.evaluate(async (srcs) => {
    const load = async (s) => { const i = new Image(); i.src = s; await i.decode(); return i; };
    const imgs = await Promise.all(srcs.map(load));
    const w = 240, h = Math.round(240 * imgs[0].height / imgs[0].width);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const frames = imgs.map((im) => { ctx.drawImage(im, 0, 0, w, h); return ctx.getImageData(0, 0, w, h).data.slice(); });
    const diffs = [];
    for (let k = 1; k < frames.length; k++) {
      let s = 0;
      for (let i = 0; i < frames[k].length; i += 4) s += Math.abs(frames[k][i + 1] - frames[k - 1][i + 1]);
      diffs.push(+(s / (w * h) / 255).toFixed(4));
    }
    return diffs;
  }, motion.map(toDataUrl));
}

// ---------- findings ----------
const hard = [];
const warn = [];
if (loadError) hard.push(`Page failed to load: ${loadError}`);
if (!gpu.canvas) hard.push('No <canvas> on the page. The scene never mounted.');
if (pageErrors.length) hard.push(`${pageErrors.length} uncaught error(s). First: ${pageErrors[0]}`);
if (consoleErrors.length) warn.push(`${consoleErrors.length} console error(s). First: ${consoleErrors[0]}`);
if (failedRequests.length) warn.push(`${failedRequests.length} failed request(s). First: ${failedRequests[0]}`);
if (!hasHook) warn.push('No window.__worldTaste hook, so only default shots were taken. Add cameras (references/check.md) for repeatable checks.');
if (gpu.cssSize && gpu.canvasSize) {
  const [cw] = gpu.canvasSize.split('x').map(Number);
  const [vw] = gpu.cssSize.split('x').map(Number);
  if (vw && cw < vw * 0.95) warn.push(`Canvas renders at ${gpu.canvasSize} but shows at ${gpu.cssSize}. Render at 100% resolution (setPixelRatio, no downscale).`);
}
if (softwareGL) warn.push(`Software renderer (${gpu.renderer}). FPS here means nothing. Run with --headed on a real GPU to judge speed.`);
else if (perf.fps && perf.fps < 50) warn.push(`Runs at ${perf.fps} fps (p95 frame ${perf.p95ms} ms). Target 60.`);

for (const s of shots) {
  const m = s.m;
  const tag = `[${s.name}]`;
  if (m.contrast < 0.025) { hard.push(`${tag} Frame is almost one flat color (contrast ${m.contrast}). Blank or broken render.`); continue; }
  if (m.contrast < 0.09) warn.push(`${tag} Low contrast (${m.contrast}). Usually flat, even lighting with no clear sun.`);
  if (m.bottomFlatness < 0.012) {
    if (m.bottomLikeSky) hard.push(`${tag} Bottom third of the frame is empty and matches the sky. Camera is under the terrain, or there is no ground there.`);
    else hard.push(`${tag} Bottom third of the frame is one flat color. Either the camera sees empty background (under the terrain, or no ground there), or the ground has no texture, light variation or detail near the camera.`);
  }
  if (m.clippedPct > 6) warn.push(`${tag} ${m.clippedPct}% of pixels are blown-out white. Bloom or exposure is too strong.`);
  if (m.crushedPct > 12) warn.push(`${tag} ${m.crushedPct}% of pixels are near black. Shadows are crushed (check black trunks, missing fill light).`);
  if (m.greenPct > 15 && m.greenHueSpread !== null && m.greenHueSpread < 9 && m.greenLightSpread < 0.07)
    warn.push(`${tag} Foliage is one uniform green (hue spread ${m.greenHueSpread}°). Vary hue and brightness per plant and root to tip.`);
  if (m.saturation > 0.68) warn.push(`${tag} Very saturated (${m.saturation}). Real scenes rarely go this hot outside neon.`);
  if (refAvg) {
    const db = m.brightness - refAvg.brightness;
    const dc = m.contrast - refAvg.contrast;
    const ds = m.saturation - refAvg.saturation;
    if (Math.abs(db) > 0.12) warn.push(`${tag} ${db > 0 ? 'Brighter' : 'Darker'} than the references (${m.brightness} vs ${refAvg.brightness}).`);
    if (dc < -0.05) warn.push(`${tag} Flatter than the references (contrast ${m.contrast} vs ${refAvg.contrast}).`);
    if (Math.abs(ds) > 0.15) warn.push(`${tag} ${ds > 0 ? 'More' : 'Less'} saturated than the references (${m.saturation} vs ${refAvg.saturation}).`);
  }
}
if (!refs.length) warn.push(`No reference images in ${REFS}/. Comparing against nothing is how slop happens. Add 4 to 6 real references.`);
if (motionDiff) {
  const frozen = motionDiff.filter((d) => d < 0.0008).length;
  if (frozen >= motionDiff.length - 1) warn.push('Slow-motion frames barely change. setTimeScale may not affect animation, or nothing moves in the motion shot.');
}

// ---------- contact sheet ----------
const sheet = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const card = (src, label, sub = '') => `<figure><img src="${src}"><figcaption><b>${label}</b>${sub ? ` · ${sub}` : ''}</figcaption></figure>`;
const metricLine = (m) => `bright ${m.brightness} · contrast ${m.contrast} · sat ${m.saturation}`;
const html = `<!doctype html><html><head><style>
  body{margin:0;padding:28px;background:#0e0f11;color:#e8e6e1;font:14px/1.4 ui-sans-serif,system-ui,sans-serif}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#9a968e;margin:26px 0 10px}
  .meta{color:#9a968e;margin-bottom:6px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px}
  .strip{display:grid;grid-template-columns:repeat(8,1fr);gap:6px}
  figure{margin:0;background:#17181b;border-radius:8px;overflow:hidden}
  img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
  figcaption{padding:8px 10px;color:#b8b4ac;font-size:12px}
  .flags{background:#17181b;border-radius:8px;padding:12px 16px;margin:0} .flags li{margin:3px 0}
  .bad{color:#ff8a7a}.warn{color:#f2c46d}.ok{color:#8fd19e}
</style></head><body>
<h1>world-check</h1>
<div class="meta">${target.toString()} · ${W}x${H} · ${softwareGL ? 'software GL' : `${perf.fps} fps`} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</div>
<ul class="flags">${hard.map((f) => `<li class="bad">✕ ${f}</li>`).join('')}${warn.map((f) => `<li class="warn">! ${f}</li>`).join('')}${!hard.length && !warn.length ? '<li class="ok">No automatic flags. Now judge it by eye against the references.</li>' : ''}</ul>
<h2>Your world</h2>
<div class="grid">${shots.map((s) => card(toDataUrl(s.file), s.name, metricLine(s.m))).join('')}</div>
${refMetrics.length ? `<h2>References</h2><div class="grid">${refMetrics.map((r) => card(toDataUrl(r.file), path.basename(r.file), metricLine(r.m))).join('')}</div>` : ''}
${motion.length ? `<h2>Slow motion · 0.25x</h2><div class="strip">${motion.map((f, i) => `<figure><img src="${toDataUrl(f)}"><figcaption>${i + 1}</figcaption></figure>`).join('')}</div>` : ''}
</body></html>`;
await sheet.setContent(html, { waitUntil: 'load' });
await sheet.screenshot({ path: path.join(OUT, 'contact-sheet.png'), fullPage: true });

await browser.close();

// ---------- report ----------
const report = {
  url: target.toString(), size: `${W}x${H}`, gpu, softwareGL, perf, hook: hasHook, cameras,
  shots: shots.map((s) => ({ name: s.name, file: path.relative(OUT, s.file), ...s.m })),
  references: refMetrics.map((r) => ({ file: r.file, ...r.m })), referenceAverage: refAvg,
  motionDiff, consoleErrors, pageErrors, failedRequests, hard, warn,
};
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));

const md = [
  '# world-check report',
  '',
  `- URL: ${report.url}`,
  `- Renderer: ${gpu.renderer || 'unknown'}${softwareGL ? ' (software, ignore fps)' : ''}`,
  `- FPS: ${perf.fps} (p95 frame ${perf.p95ms} ms)`,
  `- Cameras: ${cameras.length ? cameras.join(', ') : 'none (no hook)'}`,
  `- References: ${refMetrics.length}`,
  '',
  '## Must fix',
  ...(hard.length ? hard.map((f) => `- ${f}`) : ['- Nothing.']),
  '',
  '## Look at these',
  ...(warn.length ? warn.map((f) => `- ${f}`) : ['- Nothing flagged.']),
  '',
  '## Next',
  '',
  'Open contact-sheet.png. Put each shot next to the closest reference and go through the slop list in SKILL.md.',
  'Write down every difference you can name (light direction, shadow color, fog density, grass color, scale), fix the biggest one, and run world-check again.',
  'The numbers above catch broken renders. Your eyes catch slop. Use both.',
  '',
].join('\n');
fs.writeFileSync(path.join(OUT, 'report.md'), md);

console.log(md);
console.log(`Contact sheet: ${path.join(OUT, 'contact-sheet.png')}`);
process.exit(hard.length || (STRICT && warn.length) ? 1 : 0);
