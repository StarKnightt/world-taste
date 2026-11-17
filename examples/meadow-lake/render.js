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
