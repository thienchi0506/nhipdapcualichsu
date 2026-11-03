import * as THREE from '../../vendor/three-r128/three.module.js';
import { metrics, listen } from '../app/diagnostics.js';
import { bedAt } from '../sim/river.js';
import { localToWorld } from '../sim/actor-space.js';
import { lineOfSight } from '../sim/encounter.js';
import { armyDefaults } from '../sim/army-config.js';

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
  const actorVisuals=new Map(),arrowVisuals=new Map(),arrowPool=[],occluders=[],cameraDetails=[];
  const detailBounds=new THREE.Box3();
  const raycaster=new THREE.Raycaster();
  let cameraTargetId=null,cameraClearance=0,screenTargets=[],cameraObstructed=false,cameraOffset=0;
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
    for(const visual of actorVisuals.values())visual.label.remove();
    actorVisuals.clear();arrowVisuals.clear();arrowPool.length=0;
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
    const bronze = material('#c8963e', { roughness: 0.35, metalness: 0.8 });
    const darkWood = material('#2b1b17', { roughness: 0.85 });
    const sailRed = material('#b22222', { side: THREE.DoubleSide, roughness: 0.6 });
    const sailBlack = material('#1c1c1c', { side: THREE.DoubleSide, roughness: 0.8 });
    const stakeTipMat = material('#8a9ba8', { roughness: 0.28, metalness: 0.85 });
    const strawMat = material('#8b7355', { roughness: 0.95 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff3b08, transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending, depthWrite: false });
    materials.add(flameMat); metrics.materials++;
    const flameCoreMat = new THREE.MeshBasicMaterial({ color: 0xffdb45, transparent: true, opacity: 0.96, blending: THREE.AdditiveBlending, depthWrite: false });
    materials.add(flameCoreMat); metrics.materials++;
    const armyGeometry=new THREE.BoxGeometry(.42,1.25,.42);geometries.add(armyGeometry);metrics.geometries++;
    const armyFriendly=new THREE.InstancedMesh(armyGeometry,material('#a4d6a3'),1000),armyEnemy=new THREE.InstancedMesh(armyGeometry,material('#c76c5d'),1000);
    armyFriendly.count=0;armyEnemy.count=0;armyFriendly.frustumCulled=false;armyEnemy.frustumCulled=false;world.add(armyFriendly,armyEnemy);
    const armyMatrix=new THREE.Matrix4(),armyPosition=new THREE.Vector3(),armyScale=new THREE.Vector3(),armyRotation=new THREE.Quaternion();let armyEnemyIds=[];
    water.transparent = true; water.opacity = 0.76; water.depthWrite = false;
    const waterMesh = mesh(new THREE.PlaneGeometry(110, 180, preset.waterDetail, preset.waterDetail), water, world);
    waterMesh.rotation.x = -Math.PI / 2;
    const terrain = new THREE.PlaneGeometry(110, 180, preset.waterDetail * 2, preset.waterDetail * 3);
    terrain.rotateX(-Math.PI / 2);
    const positions = terrain.attributes.position;
    for (let i = 0; i < positions.count; i++) positions.setY(i, bedAt(river, positions.getX(i), positions.getZ(i)));
    terrain.computeVertexNormals(); occluders.push(mesh(terrain, earth, world));
    for (const shoal of river.map.shoals) box(world, sand, (shoal.xMin + shoal.xMax) / 2, shoal.bedY - 0.05, (shoal.zMin + shoal.zMax) / 2, shoal.xMax - shoal.xMin, 0.1, shoal.zMax - shoal.zMin);
    // Distant hills, reed patches and trees are code-generated placeholders.
    const hillGeo = new THREE.ConeGeometry(11, 23, 5);
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1;
      occluders.push(mesh(hillGeo, i % 3 ? green : stone, world, side * (42 + i % 3 * 7), 7, -65 + i * 12));
    }
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 3, 5), leafGeo = new THREE.ConeGeometry(2.2, 5, 6);
    const instanceMatrix=new THREE.Matrix4();
    function instances(geometry,mat,count){
      if(!geometries.has(geometry)){geometries.add(geometry);metrics.geometries++;}
      const result=new THREE.InstancedMesh(geometry,mat,count);result.castShadow=true;result.receiveShadow=true;
      // r128 has no per-instance bounding sphere; preserve visibility at all cameras.
      result.frustumCulled=false;world.add(result);return result;
    }
    const trunks=instances(trunkGeo,wood,24),leaves=instances(leafGeo,green,16),darkLeaves=instances(leafGeo,darkGreen,8);
    let greenIndex=0,darkIndex=0;
    for (let i = 0; i < 24; i++) {
      const x = (i % 2 ? 1 : -1) * (26 + (i % 4) * 2.5), z = -53 + i * 4.6;
      instanceMatrix.makeTranslation(x,2,z);trunks.setMatrixAt(i,instanceMatrix);
      instanceMatrix.makeTranslation(x,5,z);if(i%3)leaves.setMatrixAt(greenIndex++,instanceMatrix);else darkLeaves.setMatrixAt(darkIndex++,instanceMatrix);
    }
    // A small jetty and stores mark the point of departure.
    occluders.push(box(world, deck, -17, 1.7, 22, 13, 0.65, 4));
    for (let i = 0; i < 6; i++) {
      box(world, wood, -23 + i * 2.4, 0.2, 20.7, 0.3, 3, 0.3);
      box(world, deck, -26 + i % 3 * 1.4, 2.2, 17 + Math.floor(i / 3) * 1.5, 1.1, 1.2, 1.1);
    }
    // Same IDs, positions, bed and tip elevations as the collision system.
    for (const stake of river.map.stakes) {
      const bed = bedAt(river, stake.x, stake.z), tipLength = 0.85;
      const bodyH = Math.max(0.1, stake.tipY - bed - tipLength);
      mesh(new THREE.CylinderGeometry(stake.radiusM, stake.radiusM * 1.3, bodyH, 7), wood, world, stake.x, (stake.tipY + bed - tipLength) / 2, stake.z);
      mesh(new THREE.ConeGeometry(stake.radiusM * 1.15, tipLength, 7), stakeTipMat, world, stake.x, stake.tipY - tipLength / 2, stake.z);
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
      // Mô hình Thuyền Nhẹ Tiên Phong (taoMotThuyenNhe từ sa-ban-3d)
      occluders.push(box(boat, wood, 0, 0.45, 0, 2.6, 0.9, 7.2));
      box(boat, deck, 0, 0.88, 0, 2.3, 0.25, 6.8);
      const bowGeo = new THREE.ConeGeometry(1.1, 2.2, 4);
      bowGeo.rotateZ(Math.PI / 2); bowGeo.rotateY(Math.PI / 4);
      mesh(bowGeo, bronze, boat, 0, 0.5, -4.2);
      box(boat, wood, -1.25, 1.15, 0, 0.12, 0.35, 6.0);
      box(boat, wood, 1.25, 1.15, 0, 0.12, 0.35, 6.0);
      const banner = role.id === heroId ? material(role.color, { side: THREE.DoubleSide }) : figure(boat, role);
      const mastMesh = mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.5, 8), wood, boat, 0, 3.2, -0.5);
      const flagMesh = mesh(new THREE.PlaneGeometry(1.8, 1.4), banner, boat, 0.9, 4.8, -0.5);
      const details = [mastMesh, flagMesh];
      occluders.push(...details); cameraDetails.push(...details);
      for (let o = -2; o <= 2; o += 1.2) {
        const leftOarGeo = new THREE.CylinderGeometry(0.05, 0.08, 2.6, 6);
        leftOarGeo.rotateZ(Math.PI / 3);
        const leftOar = mesh(leftOarGeo, wood, boat, -1.5, 0.45, o);
        const rightOarGeo = new THREE.CylinderGeometry(0.05, 0.08, 2.6, 6);
        rightOarGeo.rotateZ(-Math.PI / 3);
        const rightOar = mesh(rightOarGeo, wood, boat, 1.5, 0.45, o);
        if (role.id === heroId) controlledOars.push(leftOar, rightOar);
      }
      const rudder = box(boat, wood, 0, 0.3, 3.7, 0.25, 1.0, 0.8);
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
    const enemyBoat = new THREE.Group(); world.add(enemyBoat); enemyBoat.visible = false;
    // Soái Hạm Khổng Lồ Của Lưu Hoằng Tháo (taoSoaiHamHoangThao từ sa-ban-3d)
    occluders.push(box(enemyBoat, darkWood, 0, 1.8, 0, 5.8, 3.2, 14));
    box(enemyBoat, deck, 0, 3.3, 0, 5.2, 0.3, 13);
    const prowGeo = new THREE.ConeGeometry(2.0, 3.8, 4);
    prowGeo.rotateZ(-Math.PI / 2);
    mesh(prowGeo, bronze, enemyBoat, 0, 2.6, -7.8);
    box(enemyBoat, darkWood, 0, 4.6, 0.5, 4.4, 2.2, 7.5);
    box(enemyBoat, darkWood, 0, 6.4, 0.5, 3.0, 1.8, 4.5);
    const fMast1 = mesh(new THREE.CylinderGeometry(0.18, 0.26, 11, 8), darkWood, enemyBoat, 0, 8.5, -2);
    const fSail1 = mesh(new THREE.PlaneGeometry(4.8, 6.8), sailBlack, enemyBoat, 0, 8.5, -1.9);
    const fMast2 = mesh(new THREE.CylinderGeometry(0.14, 0.20, 8.5, 8), darkWood, enemyBoat, 0, 7.2, 3);
    const fSail2 = mesh(new THREE.PlaneGeometry(3.8, 5.2), sailBlack, enemyBoat, 0, 7.2, 3.1);
    const fBanner = mesh(new THREE.PlaneGeometry(1.6, 2.6), material('#8B0000', { side: THREE.DoubleSide }), enemyBoat, 0.9, 12.0, -2);
    const enemyDetails = [fMast1, fSail1, fMast2, fSail2, fBanner];
    occluders.push(...enemyDetails); cameraDetails.push(...enemyDetails);

    const enemyFireCluster = new THREE.Group();
    for (let f = 0; f < 5; f++) {
      const fl = mesh(new THREE.ConeGeometry(0.6 + f * 0.15, 2.2 + f * 0.3, 6), flameMat, enemyFireCluster, (f % 2 ? 1 : -1) * (0.8 + f * 0.3), 5.5 + f * 0.4, -3 + f * 1.6);
      mesh(new THREE.SphereGeometry(0.35, 6, 6), flameCoreMat, fl, 0, -0.6, 0);
    }
    enemyFireCluster.visible = false;
    enemyBoat.add(enemyFireCluster);

    const fireRaftsGroup = new THREE.Group(); world.add(fireRaftsGroup); fireRaftsGroup.visible = false;
    for (let r = 0; r < 3; r++) {
      const raft = new THREE.Group(); raft.position.set((r - 1) * 3.5, 0.2, (r % 2) * 2);
      box(raft, wood, 0, 0.2, 0, 2.6, 0.3, 3.6);
      box(raft, strawMat, 0, 0.65, 0, 2.2, 0.6, 3.0);
      for (let b = 0; b < 3; b++) {
        mesh(new THREE.ConeGeometry(0.4, 1.4, 5), flameMat, raft, (b - 1) * 0.6, 1.4, (b % 2) * 0.4);
      }
      fireRaftsGroup.add(raft);
    }
    const arrowGeo=new THREE.BoxGeometry(.07,.07,1),arrowMat=material('#ffe6a1');
    const bodyMarker=material('#ffdd79',{side:THREE.DoubleSide}),targetMarker=material('#f1755c',{side:THREE.DoubleSide});
    function visualFor(actor){
      if(actorVisuals.has(actor.id))return actorVisuals.get(actor.id);
      const group=new THREE.Group(),body=new THREE.Group();world.add(group);group.add(body);body.position.y=-1.3;
      const role={color:actor.team==='enemy'?'#d76e59':actor.kind==='reserve'?'#b7c792':data.roles.find(r=>r.id===actor.id)?.color||'#7dc1aa'};
      const uniform=figure(body,role);
      const sword=box(group,metal,.5,1.05,-.15,.09,.9,.08);
      const bow=mesh(new THREE.TorusGeometry(.55,.04,5,12,Math.PI),wood,group,.5,1.1,-.1);bow.rotation.z=-Math.PI/2;
      const marker=mesh(new THREE.RingGeometry(.45,.52,24),bodyMarker,group,0,.03,0);marker.rotation.x=-Math.PI/2;
      const label=document.createElement('div');label.className='bd938-actor-label';label.dataset.actorId=actor.id;host.append(label);
      group.traverse(object=>{object.userData.actorId=actor.id;});
      const visual={group,body,uniform,sword,bow,marker,label};actorVisuals.set(actor.id,visual);return visual;
    }
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
      const combat=state.combat,active=combat?.actors.find(a=>a.id===combat.controlledId);
      if(state.army){let friendly=0,enemy=0;const army=state.army;armyEnemyIds=[];
        for(const soldier of army.people){if(soldier.retired||['dead','missing','captured'].includes(soldier.status))continue;
          if(soldier.team==='enemy'){const seen=army.intel.friendly.get(soldier.id);if(!seen||army.tick-seen.tick>army.config.sightIntervalTicks)continue;}
          const fallen=soldier.status!=='active';armyPosition.set(soldier.x,bedAt(river,soldier.x,soldier.z)+(fallen ? 0.2 : 0.625),soldier.z);armyScale.set(1,fallen ? 0.3 : 1,fallen ? 1.8 : 1);armyMatrix.compose(armyPosition,armyRotation,armyScale);
          if(soldier.team==='friendly'&&friendly<1000)armyFriendly.setMatrixAt(friendly++,armyMatrix);else if(soldier.team==='enemy'&&enemy<1000){armyEnemyIds.push(soldier.id);armyEnemy.setMatrixAt(enemy++,armyMatrix);}
        }
        armyFriendly.count=friendly;armyEnemy.count=enemy;armyFriendly.instanceMatrix.needsUpdate=true;armyEnemy.instanceMatrix.needsUpdate=true;
      }else{armyFriendly.count=0;armyEnemy.count=0;}
      if(combat){
        if(combat.enemyBoat){
          enemyBoat.visible=true;
          enemyBoat.position.set(combat.enemyBoat.x,readings.waterY-data.characterConfig.enemyBoat.draftM,combat.enemyBoat.z);
          enemyBoat.rotation.y=combat.enemyBoat.yaw;
          if(combat.enemyBoatTrapped){enemyBoat.rotation.z=0.18;enemyBoat.rotation.x=-0.12;}
          else{enemyBoat.rotation.z=0;enemyBoat.rotation.x=0;}
          enemyFireCluster.visible=!!combat.enemyBoatBurning;
        }
        if(combat.fireRaftActive){
          fireRaftsGroup.visible=true;
          fireRaftsGroup.position.set(0,readings.waterY,(combat.enemyBoat?combat.enemyBoat.z+10:28)-(state.tick%60)*0.12);
        }else{
          fireRaftsGroup.visible=false;
        }
        for(const actor of combat.actors){
          const visual=visualFor(actor);let px=actor.x,pz=actor.z;
          visual.group.visible=!actor.retired&&(actor.team!=='enemy'||!active||(Math.hypot(actor.x-active.x,actor.z-active.z)<=armyDefaults.sight&&lineOfSight(combat,state,active,actor)));
          if(actor.attachment?.boatId==='player-boat'){const p=localToWorld({x,z,yaw:controlled.rotation.y},actor.attachment.localX,actor.attachment.localZ);px=p.x;pz=p.z;}
          visual.group.position.set(px,actor.y,pz);visual.group.rotation.y=actor.yaw;
          const down=['wounded','downed','dead'].includes(actor.mode);visual.body.rotation.z=down?Math.PI/2:0;visual.body.position.y=down?0.3:-1.3;
          visual.sword.visible=actor.weapon==='melee'&&!down;visual.bow.visible=actor.weapon==='bow'&&!down;
          visual.sword.rotation.z=actor.action?.kind==='melee'?Math.sin((combat.tick-actor.action.start)/5)*1.2:0;
          visual.uniform.emissive.set(actor.lastHitTick+5>=combat.tick?'#6e1c12':actor.stunUntil>combat.tick?'#5d4a10':'#000000');
          visual.marker.visible=actor.id===combat.controlledId||actor.id===combat.selectedId;
          visual.marker.material=actor.id===combat.controlledId?bodyMarker:targetMarker;
          const text=`${actor.id===combat.controlledId?'▶ ':''}${actor.name} · ${Math.ceil(actor.health)}${down?' · Gục':actor.stunUntil>combat.tick?' · Choáng':actor.action?.kind==='melee'?' · Ra đòn':''}`;
          if(visual.label.textContent!==text)visual.label.textContent=text;
        }
        const live=new Set();
        for(const arrow of combat.projectiles){
          live.add(arrow.id);let object=arrowVisuals.get(arrow.id);
          if(!object){object=arrowPool.pop()||mesh(arrowGeo,arrowMat,world);object.visible=true;arrowVisuals.set(arrow.id,object);}
          object.position.set(arrow.x,arrow.y,arrow.z);object.lookAt(arrow.x+arrow.vx,arrow.y+arrow.vy,arrow.z+arrow.vz);
          if(arrow.isFire){object.material=flameMat;object.scale.set(1.5,1.5,1.5);}
          else{object.material=arrowMat;object.scale.set(1,1,1);}
        }
        for(const [id,object] of arrowVisuals)if(!live.has(id)){object.visible=false;object.scale.set(1,1,1);arrowVisuals.delete(id);arrowPool.push(object);}
      }
      const aspectScale = camera.aspect < 1 ? 1.35 : 1;
      const focus=new THREE.Vector3(active?.x??x,(active?.y??boatY)+1.1,active?.z??z);
      cameraTargetId=active?.id||null;
      if (mode === 'tactical') {
        const radius = 62 * zoom * aspectScale;
        camera.position.set(focus.x+Math.sin(orbit+0.65)*radius,focus.y+62*zoom*aspectScale,focus.z+Math.cos(orbit+0.65)*radius);
      } else {
        const c=data.characterConfig.camera;
        camera.position.set(focus.x+Math.sin(orbit)*c.followDistanceM*zoom,focus.y+c.followHeightM*zoom,focus.z+Math.cos(orbit)*c.followDistanceM*zoom);
      }
      for(const detail of cameraDetails)detail.visible=true;
      scene.updateMatrixWorld(true);
      const blockers=occluders.filter(o=>o.visible&&o.parent?.visible),c=data.characterConfig.camera;
      const desired=camera.position.clone(),delta=desired.clone().sub(focus),length=delta.length();
      function clearDistance(position){const direction=position.clone().sub(focus),distance=direction.length();raycaster.set(focus,direction.normalize());raycaster.far=distance;
        const hit=raycaster.intersectObjects(blockers,false).find(h=>h.distance>.05);
        return hit?Math.max(.1,hit.distance-c.clearanceM):distance;
      }
      let available=clearDistance(desired);cameraObstructed=available<length-.01;cameraOffset=0;
      // A camera squeezed against a nearby hull shows a wall of wood. Seek a
      // clear side angle before shortening it, without changing the chosen target.
      if(mode==='follow'&&available<Math.min(length*.75,4)){
        for(const offset of [Math.PI/3,-Math.PI/3,Math.PI*2/3,-Math.PI*2/3,Math.PI]){
          const candidate=focus.clone().add(new THREE.Vector3(Math.sin(orbit+offset)*c.followDistanceM*zoom,c.followHeightM*zoom,Math.cos(orbit+offset)*c.followDistanceM*zoom));
          const distance=clearDistance(candidate);
          if(distance>available+.15){available=distance;desired.copy(candidate);cameraOffset=offset;}
          if(available>=length-.01)break;
        }
      }
      camera.position.copy(focus).addScaledVector(desired.sub(focus).normalize(),Math.min(length,available));
      camera.position.y=Math.max(camera.position.y,bedAt(river,camera.position.x,camera.position.z)+data.characterConfig.camera.clearanceM,readings.waterY+data.characterConfig.camera.clearanceM);
      cameraClearance=camera.position.y-bedAt(river,camera.position.x,camera.position.z);
      camera.lookAt(focus);camera.updateMatrixWorld();
      // A thin mast next to the near plane may miss the centre ray yet fill
      // the picture. Cull only these decorative details near a follow camera;
      // hulls, soldiers, terrain and authoritative collision remain intact.
      if(mode==='follow')for(const detail of cameraDetails)if(detail.parent.visible&&detailBounds.setFromObject(detail).distanceToPoint(camera.position)<1.5)detail.visible=false;
      screenTargets=[];
      for(const actor of combat?.actors||[]){
        const visual=actorVisuals.get(actor.id),p=visual.group.position.clone();p.y+=2.05;p.project(camera);
        visual.label.hidden=!visual.group.visible||(actor.id!==combat.controlledId&&actor.id!==combat.selectedId&&mode!=='follow')||p.z<-1||p.z>1||Math.abs(p.x)>1.1||Math.abs(p.y)>1.1;
        visual.label.style.transform=`translate(${(p.x+1)*host.clientWidth/2}px,${(1-p.y)*host.clientHeight/2}px) translate(-50%,-100%)`;
        const q=visual.group.position.clone();q.y+=1;q.project(camera);const rect=canvas.getBoundingClientRect();
        if(actor.team==='enemy'&&actor.health>0)screenTargets.push({id:actor.id,x:rect.left+(q.x+1)*rect.width/2,y:rect.top+(1-q.y)*rect.height/2,visible:visual.group.visible&&q.z>=-1&&q.z<=1&&Math.abs(q.x)<=1&&Math.abs(q.y)<=1});
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
    listen(scope, canvas, 'webglcontextlost', event => { event.preventDefault(); if (!disposed) onContextLost(); });
    resize(); renderer.compile(scene, camera);
    return {
      canvas, render, resize, dispose,
      orbitBy(delta){orbit+=delta;},zoomBy(delta){zoom=clampZoom(zoom+delta*.001);},movementYaw(){return mode==='follow'?orbit+cameraOffset:orbit+.65;},
      pick(clientX,clientY){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),camera);raycaster.far=300;const groups=[...actorVisuals.entries()].filter(([id,v])=>v.group.visible&&lastState?.combat?.actors.find(a=>a.id===id)?.team==='enemy').map(([,v])=>v.group);const hit=raycaster.intersectObjects([...groups,armyEnemy],true)[0];return hit?.object===armyEnemy?armyEnemyIds[hit.instanceId]||null:hit?.object.userData.actorId||null;},
      releaseControls() { if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id); drag = null; },
      toggleCamera() { mode = mode === 'tactical' ? 'follow' : 'tactical'; orbit = mode==='follow'?(lastState?.combat?.actors.find(a=>a.id===lastState.combat.controlledId)?.yaw||0):0; zoom = 1; if (lastState) render(lastState); return mode; },
      stats() {
        const rect=canvas.getBoundingClientRect(),armyTargets=armyEnemyIds.map(id=>{const p=lastState?.army?.byId.get(id);if(!p)return null;const projected=new THREE.Vector3(p.x,bedAt(river,p.x,p.z)+.625,p.z).project(camera);return {id,x:rect.left+(projected.x+1)*rect.width/2,y:rect.top+(1-projected.y)*rect.height/2,visible:projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1};}).filter(Boolean);
        let objects=0;scene.traverse(()=>objects++);
        return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, gpuGeometries: renderer.info.memory.geometries, objects, mode,cameraTargetId,cameraClearance,cameraObstructed,cameraOffset,cameraPosition:camera.position.toArray(),cameraDetailsHidden:cameraDetails.filter(d=>!d.visible).length,screenTargets:screenTargets.map(p=>({...p})),armyTargets,width: canvas.width, height: canvas.height };
      },
    };
  } catch (error) { dispose(); throw error; }
}

function clampZoom(value){return Math.max(.6,Math.min(1.5,value));}
