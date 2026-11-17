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
