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
