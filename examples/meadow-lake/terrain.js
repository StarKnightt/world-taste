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
