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
