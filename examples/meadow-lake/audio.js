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
