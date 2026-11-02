import * as THREE from '../../vendor/three-r128/three.module.js';
import { metrics, listen } from '../app/diagnostics.js';
import { bedAt } from '../sim/river.js';

export function createScene({ host, data, quality, heroId, vesselType = 'light', scope, onContextLost }) {
  const preset = data.quality[quality];
  const river = data.riverConfig;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#aec6bd');
  scene.fog = new THREE.Fog('#aec6bd', 100, 230);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 300);
  const geometries = new Set(), materials = new Set();
  let renderer, observer, disposed = false, orbit = 0, zoom = 1, drag = null, mode = 'tactical';
  let lastState = null;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function material(color, extra = {}) {
    const result = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
    // r128 expects linear material colors when the renderer outputs sRGB.
    result.color.convertSRGBToLinear();
    materials.add(result); metrics.materials++;
    return result;
  }
  function mesh(geometry, mat, parent, x = 0, y = 0, z = 0) {
    if (!geometries.has(geometry)) { geometries.add(geometry); metrics.geometries++; }
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true;
    parent.add(object); return object;
  }
  function box(parent, mat, x, y, z, w, h, d) { return mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z); }
  const world = new THREE.Group(); scene.add(world);
  const boats = [];
  function dispose() {
    if (disposed) return;
    disposed = true;
    scope.abort();
    if (observer) { observer.disconnect(); observer = null; metrics.observers--; }
    if (renderer) {
      for (const geometry of geometries) { geometry.dispose(); metrics.geometries--; }
      for (const mat of materials) { mat.dispose(); metrics.materials--; }
      geometries.clear(); materials.clear();
      // No external textures. Explicitly release the renderer's shadow targets as well.
      scene.traverse(object => { if (object.shadow?.map) object.shadow.map.dispose(); });
      renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove(); metrics.renderers--;
    }
    scene.clear();
    lastState = null; boats.length = 0;
  }
  try {
    renderer = new THREE.WebGLRenderer({ antialias: quality !== 'economy', alpha: false, powerPreference: 'default' });
    metrics.renderers++;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, preset.maxDpr));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = preset.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.id = 'bd938-canvas'; canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Cảnh bến sông 3D. W S tiến lùi, A D lái thuyền, C đổi camera, Escape tạm dừng.');
    host.append(canvas);
    scene.add(new THREE.HemisphereLight('#e9f0d9', '#3d4f3b', 0.95));
    const sun = new THREE.DirectionalLight('#ffe5ac', 1.1);
    sun.position.set(-30, 55, 20); sun.castShadow = preset.shadows;
    sun.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    Object.assign(sun.shadow.camera, { left: -65, right: 65, top: 70, bottom: -70, far: 160 });
    sun.shadow.bias = -0.001; scene.add(sun);
    const water = material('#3c8382', { roughness: 0.4, metalness: 0.12 });
    const earth = material('#86845b'), sand = material('#c4b58a'), wood = material('#49382a'), deck = material('#aa8551');
    const green = material('#4f7152'), darkGreen = material('#35594a'), stone = material('#819186');
    const skin = material('#d7ae81'), metal = material('#c6bfa3'), dark = material('#283d37');
    water.transparent = true; water.opacity = 0.76; water.depthWrite = false;
    const waterMesh = mesh(new THREE.PlaneGeometry(110, 180, preset.waterDetail, preset.waterDetail), water, world);
    waterMesh.rotation.x = -Math.PI / 2;
    const terrain = new THREE.PlaneGeometry(110, 180, preset.waterDetail * 2, preset.waterDetail * 3);
    terrain.rotateX(-Math.PI / 2);
    const positions = terrain.attributes.position;
    for (let i = 0; i < positions.count; i++) positions.setY(i, bedAt(river, positions.getX(i), positions.getZ(i)));
    terrain.computeVertexNormals(); mesh(terrain, earth, world);
    for (const shoal of river.map.shoals) box(world, sand, (shoal.xMin + shoal.xMax) / 2, shoal.bedY - 0.05, (shoal.zMin + shoal.zMax) / 2, shoal.xMax - shoal.xMin, 0.1, shoal.zMax - shoal.zMin);
    // Distant hills, reed patches and trees are code-generated placeholders.
    const hillGeo = new THREE.ConeGeometry(11, 23, 5);
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1;
      mesh(hillGeo, i % 3 ? green : stone, world, side * (42 + i % 3 * 7), 7, -65 + i * 12);
    }
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 3, 5), leafGeo = new THREE.ConeGeometry(2.2, 5, 6);
    for (let i = 0; i < 24; i++) {
      const x = (i % 2 ? 1 : -1) * (26 + (i % 4) * 2.5), z = -53 + i * 4.6;
      mesh(trunkGeo, wood, world, x, 2, z); mesh(leafGeo, i % 3 ? green : darkGreen, world, x, 5, z);
    }
    // A small jetty and stores mark the point of departure.
    box(world, deck, -17, 1.7, 22, 13, 0.65, 4);
    for (let i = 0; i < 6; i++) {
      box(world, wood, -23 + i * 2.4, 0.2, 20.7, 0.3, 3, 0.3);
      box(world, deck, -26 + i % 3 * 1.4, 2.2, 17 + Math.floor(i / 3) * 1.5, 1.1, 1.2, 1.1);
    }
    // Same IDs, positions, bed and tip elevations as the collision system.
    for (const stake of river.map.stakes) {
      const bed = bedAt(river, stake.x, stake.z), tipLength = 0.3;
      mesh(new THREE.CylinderGeometry(stake.radiusM, stake.radiusM * 1.3, stake.tipY - bed - tipLength, 5), wood, world, stake.x, (stake.tipY + bed - tipLength) / 2, stake.z);
      mesh(new THREE.ConeGeometry(stake.radiusM, tipLength, 5), wood, world, stake.x, stake.tipY - tipLength / 2, stake.z);
    }
    const dangerMark = mesh(new THREE.RingGeometry(5.7, 5.85, 40), material('#f2b85f', { side: THREE.DoubleSide, transparent: true, opacity: 0.55 }), world, 11.75, 0.03, -21);
    dangerMark.rotation.x = -Math.PI / 2;
    const repairMark = mesh(new THREE.RingGeometry(river.repair.zoneRadiusM - 0.15, river.repair.zoneRadiusM, 64), material('#8bf0be', { side: THREE.DoubleSide, transparent: true, opacity: 0.5 }), world, river.repair.zoneX, 0.04, river.repair.zoneZ);
    repairMark.rotation.x = -Math.PI / 2;
    const waveMat = material('#8ac1ae', { transparent: true, opacity: 0.35 });
    const waves = [];
    for (let i = 0; i < 18; i++) { const wave = box(world, waveMat, -17 + i % 6 * 6, 0.015, -46 + Math.floor(i / 6) * 30, 2.5, 0.015, 0.1); waves.push({ mesh: wave, z: wave.position.z }); }
    function figure(parent, role) {
      const uniform = material(role.color);
      mesh(new THREE.CylinderGeometry(0.32, 0.45, 1, 6), uniform, parent, 0, 2.2, 0);
      mesh(new THREE.SphereGeometry(0.29, 8, 6), skin, parent, 0, 2.95, 0);
      mesh(new THREE.ConeGeometry(0.48, 0.2, 8), deck, parent, 0, 3.2, 0);
      box(parent, dark, -0.18, 1.55, 0, 0.22, 0.5, 0.3); box(parent, dark, 0.18, 1.55, 0, 0.22, 0.5, 0.3);
      if (role.prop === 'bow') mesh(new THREE.TorusGeometry(0.7, 0.06, 5, 12, Math.PI), wood, parent, 0.7, 2.4, 0).rotation.z = -Math.PI / 2;
      if (role.prop === 'hammer') { box(parent, wood, 0.6, 2.3, 0, 0.1, 1.9, 0.1); box(parent, metal, 0.6, 3.25, 0, 0.8, 0.35, 0.35); }
      if (role.prop === 'crate') box(parent, deck, 0, 2.2, 0.5, 0.95, 0.9, 0.65);
      if (role.prop === 'oar') { box(parent, wood, 0.75, 1.7, 0, 0.1, 3, 0.1).rotation.z = -0.4; box(parent, deck, 1.3, 0.4, 0, 0.4, 0.8, 0.13).rotation.z = -0.4; }
      return uniform;
    }
    let controlled, controlledRudder;
    const controlledOars = [];
    let mooredIndex = 0;
    data.roles.forEach((role, index) => {
      const boat = new THREE.Group(); world.add(boat);
      box(boat, wood, 0, 0.4, 0, 2.8, 0.8, 7);
      box(boat, deck, 0, 0.9, 0, 2.4, 0.25, 6.6);
      mesh(new THREE.ConeGeometry(1.4, 2, 4), wood, boat, 0, 0.4, -4).rotation.x = -Math.PI / 2;
      box(boat, wood, -1.3, 1.3, 0, 0.15, 0.45, 5.8); box(boat, wood, 1.3, 1.3, 0, 0.15, 0.45, 5.8);
      const banner = figure(boat, role);
      box(boat, wood, 0, 3.7, 2, 0.09, 4.8, 0.09); box(boat, banner, 0.75, 5.25, 2, 1.5, 0.9, 0.06);
      for (const side of [-1, 1]) {
        const oar = box(boat, deck, side * 2, 0.9, 1.6, 2.5, 0.09, 0.2); oar.rotation.z = -side * 0.12;
        if (role.id === heroId) controlledOars.push(oar);
      }
      const rudder = box(boat, wood, 0, 0.3, 3.7, 0.25, 1, 0.8);
      if (role.id === heroId) {
        controlled = boat; controlledRudder = rudder;
        const vessel = river.vessels[vesselType];
        boat.scale.set(vessel.widthM / 2.8, vesselType === 'transport' ? 1.2 : 1, vessel.lengthM / 7);
      } else {
        const position = river.map.mooredBoats[mooredIndex++];
        boat.position.set(position.x, 0, position.z);
      }
      boats.push(boat);
    });
    const selection = mesh(new THREE.RingGeometry(2.2, 2.35, 32), material('#ffe7a0', { side: THREE.DoubleSide }), controlled, 0, 0.05, 0);
    selection.rotation.x = -Math.PI / 2;
    function render(state, previous = state, alpha = 1) {
      if (disposed) return;
      lastState = state;
      const x = previous.x + (state.x - previous.x) * alpha, z = previous.z + (state.z - previous.z) * alpha;
      const readings = state.readings;
      const boatY = Math.max(readings.waterY - readings.draft + state.liftM, readings.bedY);
      controlled.position.set(x, boatY + (reducedMotion || state.stuck ? 0 : Math.sin(state.tick / river.tickHz) * 0.025), z);
      selection.position.y = (Math.max(readings.waterY, readings.bedY) + 0.05 - controlled.position.y) / controlled.scale.y;
      controlled.rotation.y = previous.yaw + (state.yaw - previous.yaw) * alpha;
      controlledRudder.visible = state.components.rudder > 0;
      controlledOars.forEach(oar => { oar.visible = state.components.oars > 0; });
      for (const boat of boats) if (boat !== controlled) boat.position.y = readings.waterY - river.vessels.light.baseDraftM;
      waterMesh.position.y = readings.waterY;
      dangerMark.position.y = readings.waterY + 0.03; repairMark.position.y = readings.waterY + 0.04;
      for (const wave of waves) { wave.mesh.position.y = readings.waterY + 0.02; wave.mesh.position.z = wave.z + (reducedMotion ? 0 : (state.tick / river.tickHz * river.current.zMps) % 6); }
      const aspectScale = camera.aspect < 1 ? 1.35 : 1;
      if (mode === 'tactical') {
        const radius = 62 * zoom * aspectScale;
        camera.position.set(Math.sin(orbit + 0.65) * radius, 62 * zoom * aspectScale, Math.cos(orbit + 0.65) * radius);
        camera.lookAt(0, readings.waterY, 0);
      } else {
        const angle = state.yaw + orbit;
        camera.position.set(x + Math.sin(angle) * 16 * zoom, readings.waterY + 10 * zoom, z + Math.cos(angle) * 16 * zoom);
        camera.lookAt(x, boatY + 1, z - 3);
      }
      renderer.render(scene, camera);
    }
    function resize() {
      if (disposed) return;
      const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, preset.maxDpr));
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
      if (lastState) render(lastState);
    }
    observer = new ResizeObserver(resize); observer.observe(host); metrics.observers++;
    listen(scope, canvas, 'pointerdown', event => { canvas.focus({ preventScroll: true }); drag = { id: event.pointerId, x: event.clientX }; canvas.setPointerCapture(event.pointerId); });
    listen(scope, canvas, 'pointermove', event => { if (drag?.id === event.pointerId) { orbit -= (event.clientX - drag.x) * 0.008; drag.x = event.clientX; } });
    const releaseDrag = event => { if (drag?.id === event.pointerId) drag = null; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); };
    listen(scope, canvas, 'pointerup', releaseDrag); listen(scope, canvas, 'pointercancel', releaseDrag);
    listen(scope, canvas, 'wheel', event => { if (event.ctrlKey || event.metaKey) return; event.preventDefault(); zoom = Math.max(0.6, Math.min(1.5, zoom + event.deltaY * 0.001)); }, { passive: false });
    listen(scope, canvas, 'webglcontextlost', event => { event.preventDefault(); if (!disposed) onContextLost(); });
    resize(); renderer.compile(scene, camera);
    return {
      canvas, render, resize, dispose,
      releaseControls() { if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id); drag = null; },
      toggleCamera() { mode = mode === 'tactical' ? 'follow' : 'tactical'; orbit = 0; zoom = 1; if (lastState) render(lastState); return mode; },
      stats() { return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, gpuGeometries: renderer.info.memory.geometries, mode, width: canvas.width, height: canvas.height }; },
    };
  } catch (error) { dispose(); throw error; }
}
