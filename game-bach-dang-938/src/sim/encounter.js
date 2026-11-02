import { clamp, bedAt } from './river.js';
import { stepRiver } from './vessel.js';
import { localToWorld, worldToLocal, boatList, closestDeckPoint, supportAt, attach, syncAttachment, segmentBox, deckGap } from './actor-space.js';
import { armyDefaults } from './army-config.js';
import { damageArmySoldier } from './army.js';

const alive = actor => !!actor && actor.health > 0 && !['wounded', 'downed', 'dead'].includes(actor.mode);
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const direction = (a, b) => { const d = distance(a, b) || 1; return { x: (b.x - a.x) / d, z: (b.z - a.z) / d }; };
const angle = (x, z) => Math.atan2(-x, -z);
const ticks = (c, seconds) => Math.ceil(seconds * c.tickHz);
function moveVector(intent) { const x=Number(!!intent.right)-Number(!!intent.left),z=Number(!!intent.back)-Number(!!intent.forward),yaw=Number.isFinite(intent.viewYaw)?intent.viewYaw:0;return {x:Math.cos(yaw)*x+Math.sin(yaw)*z,z:-Math.sin(yaw)*x+Math.cos(yaw)*z}; }

function event(world, type, payload = {}) {
  const e = { id: `actor:${world.tick}:${++world.sequence}`, tick: world.tick, type, ...payload };
  if(world.journalPending)world.journalPending.push(e);
  world.events.push(e); if (world.events.length > 160) world.events.shift();
  world.eventCounts[type] = (world.eventCounts[type] || 0) + 1; return e;
}
function notice(world, text) { world.message = text; world.messageUntil = world.tick + world.config.tickHz * 4; }
export function controlledActor(world) { return world.actors.find(a => a.id === world.controlledId); }

function makeActor(world, id, name, kind, team, boatId, localX, localZ, weapon = 'melee') {
  const c = world.config;
  return { id, name, kind, team, mode: 'foot', health: c.healthMax, stamina: c.staminaMax, ammo: c.bow.initialAmmo,
    x: 0, y: 0, z: 0, yaw: 0, vx: 0, vy: 0, vz: 0, attachment: { kind: 'deck', boatId, localX, localZ },
    weapon, action: null, readyTick: 0, guard: false, guardSince: -1e9, counterUntil: 0, stunUntil: 0, lastExertion: -1e9,
    distressS: 0, downTick: null, rescue: null, lastHitTick: -1e9, follows: false, followBoard: null, nextAI: 0,
  };
}

export function createEncounter(config, river, heroId) {
  const world = { config: { ...config, tickHz: river.config.tickHz }, tick: river.tick, sequence: 0, controlledId: heroId, controlEpoch: 1,
    actors: [], projectiles: [], events: [], eventCounts: {}, damageKeys: [], commandIds: [], selectedId: null,
    mapOpen: false, mapDrive: { throttle: 0, yaw: river.yaw },lastDrive:{throttle:0,yaw:river.yaw},deckDrive:null,helm: true, phase: 'active', takeoverAt: null,
    message: '', messageUntil: 0, provoked: false, defenseUntil: 0, enemyBoat: null,
  };
  world.actors.push(makeActor(world, heroId, ({ H01:'Người dẫn thuyền', H02:'Người giữ trận', H03:'Người dựng lũy', H04:'Người giữ bến' })[heroId], 'mainHero', 'friendly', 'player-boat', 0, 1.8));
  world.actors.push(makeActor(world, 'R01', 'Sĩ quan dự bị An', 'reserve', 'friendly', 'player-boat', -0.65, 1));
  world.actors.push(makeActor(world, 'R02', 'Sĩ quan dự bị Bình', 'reserve', 'friendly', 'player-boat', 0.65, 1));
  world.actors.push(makeActor(world, 'A01', 'Đồng đội Lâm', 'companion', 'friendly', 'player-boat', 0.8, -1.5));
  if (river.scenarioId === 'combat') {
    world.enemyBoat = { ...config.enemyBoat, width: config.enemyBoat.widthM * 2.4 / 2.8, length: config.enemyBoat.lengthM * 6.6 / 7, vx: 0, vz: 0 };
    world.actors.push(makeActor(world, 'E01', 'Lính giữ boong', 'soldier', 'enemy', config.enemyBoat.id, 0, 0));
    world.actors.push(makeActor(world, 'E02', 'Lính hộ vệ', 'soldier', 'enemy', config.enemyBoat.id, -0.6, -1.5));
    world.actors.push(makeActor(world, 'E03', 'Cung thủ địch', 'soldier', 'enemy', config.enemyBoat.id, 0.65, 1.6, 'bow'));
    world.actors.find(a => a.id === 'A01').follows = true;
  }
  for (const actor of world.actors) syncAttachment(actor, world, river, world.config);
  return world;
}

function exert(actor, cost, world) {
  if (actor.stamina < cost) { if (actor.id === world.controlledId) notice(world, 'Không đủ sức bền. Nghỉ trên bờ hoặc boong để hồi sức.'); return false; }
  actor.stamina -= cost; actor.lastExertion = world.tick; return true;
}
function nearestEnemy(world, actor, range = Infinity) { return world.actors.filter(a => a.team !== actor.team && alive(a) && distance(a, actor) <= range).sort((a,b) => distance(a,actor)-distance(b,actor)||a.id.localeCompare(b.id))[0]; }
function selectedTarget(world, actor) {
  const unit=world.army?.byId.get(world.selectedId);
  if(unit&&unit.status==='active'&&unit.team!==actor.team)return {...unit,y:bedAt(world.army.riverConfig,unit.x,unit.z)};
  return world.actors.find(a=>a.id===world.selectedId&&a.team!==actor.team&&alive(a));
}
function targetFor(world, actor) { const target=selectedTarget(world,actor);if(world.selectedId)return target&&distance(actor,target)<=armyDefaults.sight?target:null;return nearestEnemy(world, actor, armyDefaults.sight); }

export function lineOfSight(world, river, from, to) {
  for (let i=1;i<16;i++) { const t=i/16, x=from.x+(to.x-from.x)*t, z=from.z+(to.z-from.z)*t, y=from.y+1.1+(to.y-from.y)*t; if (bedAt(river.config,x,z)>y) return false; }
  return true;
}

export function applyActorDamage(world, targetId, amount, sourceId, causeId, melee = false, externalSource = null) {
  const target = world.actors.find(a => a.id === targetId), source = world.actors.find(a => a.id === sourceId) || externalSource, c=world.config;
  const key = `${causeId}:${targetId}`;
  if (!target || !alive(target) || world.damageKeys.includes(key)) return false;
  world.damageKeys.push(key);
  if (target.action?.kind === 'dodge' && world.tick-target.action.start < ticks(c,c.dodge.evadeWindowS)) { event(world,'Evaded',{actorId:targetId,causeId}); return false; }
  const n = source ? direction(target,source) : {x:0,z:-1};
  const frontal = (-Math.sin(target.yaw)*n.x-Math.cos(target.yaw)*n.z)>0.1;
  if (target.guard && frontal && target.stamina >= c.defense.guardCost) {
    if (melee && world.tick-target.guardSince <= ticks(c,c.defense.parryWindowS) && exert(target,c.defense.parryCost,world)) {
      target.counterUntil = world.tick+ticks(c,c.defense.counterWindowS);
      if(source){source.stunUntil=world.tick+ticks(c,c.defense.stunS);source.action=null;}
      event(world,'Parried',{actorId:targetId,sourceId,causeId}); return false;
    }
    target.stamina -= c.defense.guardCost;target.lastExertion=world.tick; amount *= c.defense.guardDamageFraction;
    event(world,'Blocked',{actorId:targetId,sourceId,causeId});
  } else if (target.guard && target.stamina < c.defense.guardCost) {
    target.guard=false;target.stunUntil=world.tick+ticks(c,c.defense.stunS);event(world,'GuardBroken',{actorId:targetId});
  }
  const damage=amount*(1-c.defense.armorFraction);
  target.health=Math.max(0,target.health-damage);target.lastHitTick=world.tick;
  if(target.team==='friendly')world.defenseUntil=world.tick+ticks(c,5);
  if(source?.team==='enemy'||target.team==='enemy')world.provoked=true;
  event(world,'Damage',{actorId:targetId,sourceId,damage,causeId});
  if(target.health===0){
    target.mode=target.kind==='mainHero'?'wounded':'downed';target.wounds=(target.wounds||0)+1;target.action=null;target.guard=false;target.downTick=world.tick;target.rescue=null;
    event(world,target.kind==='mainHero'?'HeroWounded':'ActorDowned',{actorId:targetId});
    if(target.id===world.controlledId){world.helm=false;world.takeoverAt=world.tick+ticks(c,c.takeoverDelayS);notice(world,'Nhân vật đã gục. Sĩ quan dự bị đang tiếp quản…');}
  }
  return true;
}

function startAttack(world, actor, target = targetFor(world,actor)) {
  const c=world.config;
  if(!alive(actor)||actor.mode==='swim'||actor.mode==='air'||actor.action||actor.stunUntil>world.tick||world.tick<actor.readyTick)return false;
  if(actor.weapon==='bow' && (!target||actor.ammo<=0)){if(actor.id===world.controlledId)notice(world,actor.ammo<=0?'Đã hết tên.':'Chọn hoặc khóa mục tiêu trước khi bắn.');return false;}
  if(target){const n=direction(actor,target);actor.yaw=angle(n.x,n.z);}
  const counter=actor.counterUntil>world.tick;
  if(actor.weapon==='melee'&&!exert(actor,c.melee.cost,world))return false;
  actor.guard=false;
  actor.action={id:`attack:${++world.sequence}`,kind:actor.weapon,start:world.tick,fired:false,targetId:target?.id||null,counter};
  if(counter)actor.counterUntil=0;
  event(world,'AttackStarted',{actorId:actor.id,attackId:actor.action.id,weapon:actor.weapon});return true;
}

function beginAir(world, actor, vx, vz, vy, targetBoatId=null) {
  const attachment=actor.attachment?{...actor.attachment}:null;
  actor.attachment=null;actor.mode='air';actor.vx=vx;actor.vz=vz;actor.vy=vy;actor.action=null;actor.guard=false;
  event(world,'Jumped',{actorId:actor.id,targetBoatId});
  if(targetBoatId&&actor.id===world.controlledId){
    for(const follower of world.actors.filter(a=>a.kind==='companion'&&a.follows&&alive(a))) follower.followBoard={from:attachment,targetBoatId};
  }
}

export function boardBoat(world, river, actor, targetBoatId) {
  const c=world.config, boats=boatList(world,river,c), target=boats.find(b=>b.id===targetBoatId), own=boats.find(b=>b.id===actor.attachment?.boatId);
  if(!alive(actor)||actor.mode!=='foot'||actor.action||!target||target.id===own?.id)return false;
  const p=closestDeckPoint(target,actor.x,actor.z,c.radiusM+0.05);
  const edgeGap=own?deckGap(own,target):distance(actor,p);
  if(edgeGap>c.boardingMaxGapM || distance(actor,p)>c.boardingMaxTravelM){if(actor.id===world.controlledId)notice(world,'Áp sát rồi đi tới mép boong trước khi nhảy sang.');return false;}
  if(own&&Math.hypot(own.vx-target.vx,own.vz-target.vz)>c.boardingMaxRelativeSpeedMps){if(actor.id===world.controlledId)notice(world,'Thuyền chạy quá nhanh để áp mạn. Hãm tốc hoặc neo lại.');return false;}
  if(!exert(actor,c.jumpCost,world))return false;
  const t=c.boardingFlightS;
  beginAir(world,actor,(p.x-actor.x)/t+target.vx,(p.z-actor.z)/t+target.vz,(target.deckY-actor.y+0.5*c.gravityMps2*t*t)/t,target.id);
  return true;
}

function interact(world,river,actor){
  const c=world.config,boats=boatList(world,river,c),own=boats[0];
  if(!alive(actor))return;
  if(world.helm){world.helm=false;world.deckDrive=river.anchor?null:{...world.lastDrive};notice(world,'Đã rời tay lái. Phó thuyền giữ hướng khi bạn còn trên boong, neo khi bạn rời thuyền.');event(world,'HelmReleased',{actorId:actor.id});return;}
  if(actor.mode==='swim'){
    const crew=world.actors.find(a=>a.id!==actor.id&&a.team==='friendly'&&alive(a)&&a.attachment?.boatId==='player-boat');
    const p=closestDeckPoint(own,actor.x,actor.z,c.radiusM+0.05);
    if(crew&&distance(actor,p)<=c.rescueDistanceM&&Math.hypot(own.vx,own.vz)<=c.rescueRelativeSpeedMps){actor.rescue={workS:0,start:{x:actor.x,y:actor.y,z:actor.z},local:worldToLocal(own,p.x,p.z),boatId:own.id,crewId:crew.id};event(world,'RescueStarted',{actorId:actor.id,crewId:crew.id});}
    else notice(world,'Cần đến cạnh thuyền ta đang đủ chậm và có đồng đội tỉnh táo để kéo lên.');
    return;
  }
  if(actor.attachment?.boatId==='player-boat'){
    const local=worldToLocal(own,actor.x,actor.z);
    if(local.z>0.6&&Math.abs(local.x)<0.9){world.helm=true;river.anchor=false;event(world,'HelmTaken',{actorId:actor.id});notice(world,'Đã trở lại lái thuyền.');return;}
  }
  const surfaces=supportAt(world,river,c,actor.x,actor.z);
  const candidates=[];
  const pier=c.pier;
  const shorePoint={x:clamp(actor.x,pier.xMin+0.3,pier.xMax-0.3),z:clamp(actor.z,pier.zMin+0.3,pier.zMax-0.3)};
  if(actor.attachment?.kind==='deck'&&distance(actor,shorePoint)<=c.rescueDistanceM)candidates.push({point:shorePoint,y:pier.y});
  if(actor.attachment?.kind!=='deck'){
    const p=closestDeckPoint(own,actor.x,actor.z,c.radiusM+0.05);
    if(distance(actor,p)<=c.boardingMaxGapM)candidates.push({point:p,y:own.deckY,boat:own});
  }
  if(candidates.length&&!actor.action){
    const p=candidates[0],t=c.boardingFlightS;
    if(exert(actor,c.jumpCost,world))beginAir(world,actor,(p.point.x-actor.x)/t+(p.boat?.vx||0),(p.point.z-actor.z)/t+(p.boat?.vz||0),(p.y-actor.y+0.5*c.gravityMps2*t*t)/t,p.boat?.id);
  }else notice(world,surfaces.length?'E cạnh bến để lên/xuống; ở đuôi thuyền ta để nhận tay lái.':'Chưa có chỗ bám hợp lệ.');
}

function command(world,river,actor,action,intent){
  if(!action.id||world.commandIds.includes(action.id))return;
  world.commandIds.push(action.id);
  if(action.epoch!==undefined&&action.epoch!==world.controlEpoch){event(world,'CommandRejected',{reason:'stale-control',commandId:action.id});return;}
  if(action.type==='map'){
    world.mapOpen=!world.mapOpen;
    // UI focus transfer may already have cleared keyboard/touch held input.
    // Preserve the applied helm setting, independent of how the map opened.
    world.mapDrive={throttle:world.lastDrive.throttle,yaw:river.yaw};
    event(world,'MapChanged',{open:world.mapOpen});return;
  }
  if(!alive(actor)||world.phase!=='active')return;
  if(action.type==='select'){
    const unit=world.army?.byId.get(action.targetId);
    const target=unit?.status==='active'&&unit.team!==actor.team?{...unit,y:bedAt(world.army.riverConfig,unit.x,unit.z)}:world.actors.find(a=>a.id===action.targetId&&a.team!==actor.team&&alive(a));
    if(target&&distance(actor,target)<=armyDefaults.sight&&lineOfSight(world,river,actor,target)){world.selectedId=target.id;event(world,'TargetSelected',{actorId:target.id});}return;
  }
  if(action.type==='lock') { const soldiers=(world.army?.people||[]).filter(p=>p.team!==actor.team&&p.status==='active').map(p=>({...p,y:bedAt(river.config,p.x,p.z)}));const targets=[...world.actors,...soldiers].filter(a=>a.team!==actor.team&&alive(a)&&distance(actor,a)<=armyDefaults.sight&&lineOfSight(world,river,actor,a)).sort((a,b)=>distance(actor,a)-distance(actor,b)||a.id.localeCompare(b.id));const i=targets.findIndex(a=>a.id===world.selectedId);world.selectedId=targets[(i+1)%Math.max(1,targets.length)]?.id||null;return; }
  if(world.mapOpen)return;
  if(action.type==='interact'){interact(world,river,actor);return;}
  if(action.type==='weapon'){actor.weapon=actor.weapon==='bow'?'melee':'bow';actor.action=null;notice(world,actor.weapon==='bow'?'Đã chọn cung. Khóa/chọn mục tiêu rồi nhấn Đánh/Bắn.':'Đã chọn cận chiến.');return;}
  if(action.type==='follow'){const a=world.actors.find(a=>a.kind==='companion');if(a){a.follows=!a.follows;notice(world,a.follows?'Đồng đội sẽ theo khi đường đi và cú nhảy an toàn.':'Đồng đội giữ vị trí.');}return;}
  if(action.type==='attack'){startAttack(world,actor);return;}
  if(action.type==='board'){
    if(world.helm){notice(world,'Rời tay lái (E), đi tới mép boong rồi nhảy sang (G).');return;}
    boardBoat(world,river,actor,world.enemyBoat?.id);return;
  }
  if(action.type==='jump'){
    if(world.helm){stepRiverActionNotice(world);return;}
    if(actor.mode!=='foot'||actor.action||!exert(actor,world.config.jumpCost,world))return;
    const {x:mx,z:mz}=moveVector(intent),len=Math.hypot(mx,mz);
    const n=len?{x:mx/len,z:mz/len}:{x:-Math.sin(actor.yaw),z:-Math.cos(actor.yaw)};
    const boat=boatList(world,river,world.config).find(b=>b.id===actor.attachment?.boatId);
    beginAir(world,actor,n.x*world.config.jumpSpeedMps+(boat?.vx||0),n.z*world.config.jumpSpeedMps+(boat?.vz||0),world.config.jumpUpMps);return;
  }
  if(action.type==='dodge'&&actor.mode==='foot'&&!world.helm&&!actor.action&&actor.stunUntil<=world.tick&&exert(actor,world.config.dodge.cost,world)){
    const {x:mx,z:mz}=moveVector(intent),len=Math.hypot(mx,mz);
    actor.action={id:`dodge:${++world.sequence}`,kind:'dodge',start:world.tick,x:len?mx/len:Math.sin(actor.yaw),z:len?mz/len:Math.cos(actor.yaw)};event(world,'Dodged',{actorId:actor.id});
  }
}
function stepRiverActionNotice(world){notice(world,'Đang lái thuyền. Space để neo; E rời tay lái rồi mới nhảy.');}

function moveOnSurface(world,river,actor,mx,mz,speed){
  const c=world.config,dt=1/c.tickHz,len=Math.hypot(mx,mz);if(!len)return;
  mx/=Math.max(1,len);mz/=Math.max(1,len);actor.yaw=angle(mx,mz);
  const x=actor.x+mx*speed*dt,z=actor.z+mz*speed*dt;
  if(Math.abs(x)>river.config.map.halfWidthM+14||Math.abs(z)>river.config.map.halfLengthM)return;
  const other=world.actors.find(a=>a.id!==actor.id&&alive(a)&&a.mode==='foot'&&Math.abs(a.y-actor.y)<0.6&&Math.hypot(a.x-x,a.z-z)<c.radiusM*2&&Math.hypot(a.x-x,a.z-z)<distance(a,actor)-1e-6);
  if(other){
    if(other.team===actor.team&&actor.id===world.controlledId&&other.attachment?.boatId===actor.attachment?.boatId){
      const boat=boatList(world,river,c).find(b=>b.id===other.attachment?.boatId);
      if(boat){const edge=boat.width/2-c.radiusM-.04;other.yieldLocal={x:other.attachment.localX>=0?edge:-edge,z:other.attachment.localZ};other.yieldUntil=world.tick+ticks(c,1.2);}
    }
    // Friendly crew yield with soft contact: crowded narrow decks must not trap
    // the controlled actor between two stationary reserve officers.
    if(other.team!==actor.team||actor.id!==world.controlledId)return;
  }
  const surfaces=supportAt(world,river,c,x,z),top=surfaces[0];
  if(top&&top.y>actor.y+c.stepHeightM)return;
  if(top&&actor.y-top.y<=c.stepHeightM){attach(actor,top,world,river,c,x,z);return;}
  // Crew do not walk blindly off a ledge while following. Boarding still uses
  // the same fallible ballistic jump as the player, including moving targets.
  if(actor.id!==world.controlledId)return;
  const boat=boatList(world,river,c).find(b=>b.id===actor.attachment?.boatId);
  actor.mode='air';actor.attachment=null;actor.vx=mx*speed+(boat?.vx||0);actor.vz=mz*speed+(boat?.vz||0);actor.vy=0;actor.x=x;actor.z=z;
  event(world,'Fell',{actorId:actor.id});
}

function stepMotion(world,river,actor,intent){
  const c=world.config,dt=1/c.tickHz;
  if(!alive(actor))return;
  if(actor.rescue){
    const job=actor.rescue,boat=boatList(world,river,c).find(b=>b.id===job.boatId),crew=world.actors.find(a=>a.id===job.crewId);
    const p=boat&&localToWorld(boat,job.local.x,job.local.z);
    if(!boat||!alive(crew)||distance(actor,p)>c.rescueDistanceM+1||Math.hypot(boat.vx,boat.vz)>c.rescueRelativeSpeedMps){actor.rescue=null;event(world,'RescueCancelled',{actorId:actor.id});}
    else {job.workS+=dt;const f=clamp(job.workS/c.rescueWorkS,0,1);actor.x=job.start.x+(p.x-job.start.x)*f;actor.z=job.start.z+(p.z-job.start.z)*f;actor.y=job.start.y+(boat.deckY-job.start.y)*f;if(f>=1){attach(actor,{kind:'deck',boatId:boat.id,y:boat.deckY},world,river,c);actor.rescue=null;actor.distressS=0;event(world,'Rescued',{actorId:actor.id});}return;}
  }
  if(actor.mode==='air'){
    const oldY=actor.y;actor.x+=actor.vx*dt;actor.z+=actor.vz*dt;actor.y+=actor.vy*dt-0.5*c.gravityMps2*dt*dt;actor.vy-=c.gravityMps2*dt;
    const surface=supportAt(world,river,c,actor.x,actor.z).find(s=>oldY>=s.y-0.01&&actor.y<=s.y&&actor.vy<=0);
    if(surface){attach(actor,surface,world,river,c);event(world,'Landed',{actorId:actor.id,boatId:surface.boatId||null});return;}
    if(actor.y<=river.readings.waterY-0.5){actor.mode='swim';actor.attachment=null;actor.y=river.readings.waterY-0.7;actor.distressS=0;actor.action=null;event(world,'EnteredWater',{actorId:actor.id});}return;
  }
  const {x:mx,z:mz}=moveVector(intent);
  if(actor.mode==='swim'){
    const len=Math.hypot(mx,mz),canSwim=actor.stamina>0;
    actor.x+=(canSwim&&len?mx/len*c.swimMps:0)*dt+river.readings.current.x*dt;
    actor.z+=(canSwim&&len?mz/len*c.swimMps:0)*dt+river.readings.current.z*dt;
    actor.y=river.readings.waterY-0.7;actor.stamina=Math.max(0,actor.stamina-c.swimStaminaPerS*dt);actor.lastExertion=world.tick;
    const ground=supportAt(world,river,c,actor.x,actor.z).find(s=>s.kind==='ground');
    if(ground){attach(actor,ground,world,river,c);actor.distressS=0;return;}
    if(actor.stamina===0){actor.distressS+=dt;if(actor.distressS>=c.waterRescueWindowS)applyActorDamage(world,actor.id,c.healthMax*2,null,`drown:${actor.id}`,false);}return;
  }
  if(actor.stunUntil>world.tick)return;
  if(actor.action?.kind==='dodge'){
    if(world.tick-actor.action.start>=ticks(c,c.dodge.durationS))actor.action=null;
    else moveOnSurface(world,river,actor,actor.action.x,actor.action.z,c.dodge.speedMps);
    return;
  }
  if(actor.action)return;
  let speed=c.walkMps;
  if(intent.sprint&&(mx||mz)&&actor.stamina>0){speed=c.runMps;actor.stamina=Math.max(0,actor.stamina-c.runStaminaPerS*dt);actor.lastExertion=world.tick;}
  moveOnSurface(world,river,actor,mx,mz,speed);
}

function stepAttacks(world,river,actor){
  const c=world.config,a=actor.action;
  if(!a||a.kind==='dodge'||!alive(actor)||actor.stunUntil>world.tick)return;
  const windup=a.kind==='bow'?c.bow.drawS:c.melee.windupS,recovery=a.kind==='bow'?c.bow.recoveryS:c.melee.recoveryS;
  if(!a.fired&&world.tick-a.start>=ticks(c,windup)){
    a.fired=true;
    if(a.kind==='melee'){
      const targets=world.army?.byId.has(a.targetId)?[]:world.actors.filter(t=>t.team!==actor.team&&alive(t)&&Math.abs(t.y-actor.y)<1.4&&distance(actor,t)<=c.melee.rangeM).filter(t=>{const n=direction(actor,t);return -Math.sin(actor.yaw)*n.x-Math.cos(actor.yaw)*n.z>=c.melee.coneDot;}).sort((a,b)=>distance(actor,a)-distance(actor,b)||a.id.localeCompare(b.id));
      for(const target of targets.slice(0,c.melee.maxTargets))applyActorDamage(world,target.id,c.melee.damage*(a.counter?c.defense.counterMultiplier:1),actor.id,a.id,true);
      event(world,'MeleeResolved',{actorId:actor.id,attackId:a.id,targetId:a.targetId,counter:a.counter});
    }else{
      const target=selectedTarget({...world,selectedId:a.targetId},actor);
      if(target&&actor.ammo>0&&distance(actor,target)<=c.bow.rangeM&&lineOfSight(world,river,actor,target)){
        actor.ammo--;const d=Math.max(0.1,distance(actor,target)),flight=d/c.bow.speedMps;
        world.projectiles.push({id:`arrow:${++world.sequence}`,ownerId:actor.id,x:actor.x,y:actor.y+1.2,z:actor.z,vx:(target.x-actor.x)/flight,vy:(target.y-actor.y+0.5*c.gravityMps2*flight*flight)/flight,vz:(target.z-actor.z)/flight,age:0});
        event(world,'ArrowFired',{actorId:actor.id,attackId:a.id});world.provoked=true;
      }
    }
  }
  if(world.tick-a.start>=ticks(c,windup+recovery)){actor.action=null;actor.readyTick=world.tick;}
}

function stepArrows(world,river,previous){
  const c=world.config,dt=1/c.tickHz;
  for(const arrow of world.projectiles){
    const from={x:arrow.x,y:arrow.y,z:arrow.z};arrow.x+=arrow.vx*dt;arrow.y+=arrow.vy*dt-0.5*c.gravityMps2*dt*dt;arrow.z+=arrow.vz*dt;arrow.vy-=c.gravityMps2*dt;arrow.age+=dt;
    let first=null;
    for(const actor of world.actors){
      if(actor.id===arrow.ownerId||!alive(actor))continue;
      const owner=world.actors.find(a=>a.id===arrow.ownerId);
      if(!c.friendlyFireArrows&&owner?.team===actor.team)continue;
      const before=previous.get(actor.id)||actor;
      const relFrom={x:from.x-before.x,y:from.y-before.y,z:from.z-before.z},relTo={x:arrow.x-actor.x,y:arrow.y-actor.y,z:arrow.z-actor.z};
      const t=segmentBox(relFrom,relTo,{x:-c.radiusM,y:0,z:-c.radiusM},{x:c.radiusM,y:c.heightM,z:c.radiusM});
      if(t!==null&&(!first||t<first.t))first={t,actor};
    }
    if(world.army)for(const soldier of world.army.people){
      if(soldier.status!=='active'||soldier.id===arrow.ownerId)continue;
      const owner=world.actors.find(a=>a.id===arrow.ownerId);
      if(!c.friendlyFireArrows&&owner?.team===soldier.team)continue;
      const y=bedAt(river.config,soldier.x,soldier.z);
      const t=segmentBox(from,arrow,{x:soldier.x-c.radiusM,y,z:soldier.z-c.radiusM},{x:soldier.x+c.radiusM,y:y+c.heightM,z:soldier.z+c.radiusM});
      if(t!==null&&(!first||t<first.t))first={t,actor:soldier,army:true};
    }
    let cover=null;
    const pier=c.pier;
    const pierT=segmentBox(from,arrow,{x:pier.xMin,y:pier.y-.65,z:pier.zMin},{x:pier.xMax,y:pier.y,z:pier.zMax});
    if(pierT!==null)cover=pierT;
    for(const boat of boatList(world,river,c)){
      const a=worldToLocal(boat,from.x,from.z),b=worldToLocal(boat,arrow.x,arrow.z);
      const t=segmentBox({x:a.x,y:from.y,z:a.z},{x:b.x,y:arrow.y,z:b.z},{x:-boat.width/2,y:boat.y,z:-boat.length/2},{x:boat.width/2,y:boat.deckY,z:boat.length/2});
      if(t!==null&&(cover===null||t<cover))cover=t;
    }
    if(cover!==null&&(!first||cover<first.t)){arrow.dead=true;event(world,'ArrowBlocked',{arrowId:arrow.id});}
    else if(first){if(first.army)damageArmySoldier(world.army,first.actor,c.bow.damage*(1-c.defense.armorFraction),arrow.ownerId,arrow.id);else applyActorDamage(world,first.actor.id,c.bow.damage,arrow.ownerId,arrow.id);arrow.dead=true;event(world,'ArrowHit',{arrowId:arrow.id,actorId:first.actor.id});}
    if(arrow.y<=Math.max(river.readings.waterY,bedAt(river.config,arrow.x,arrow.z))||arrow.age>c.bow.rangeM/c.bow.speedMps+1)arrow.dead=true;
  }
  world.projectiles=world.projectiles.filter(a=>!a.dead);
}

function stepAI(world,river,actor){
  const c=world.config,player=controlledActor(world);
  if(!alive(actor)||actor.id===world.controlledId)return;
  if(actor.team==='friendly'&&actor.yieldLocal&&actor.yieldUntil>world.tick){
    const boat=boatList(world,river,c).find(b=>b.id===actor.attachment?.boatId);
    if(boat){const point=localToWorld(boat,actor.yieldLocal.x,actor.yieldLocal.z),n=direction(actor,point);if(distance(actor,point)>.03)moveOnSurface(world,river,actor,n.x,n.z,c.walkMps);return;}
  }
  if(actor.team==='enemy'){
    const near=nearestEnemy(world,actor,c.enemy.detectM);
    if(!near)return;
    if(distance(actor,near)<c.enemy.activateM)world.provoked=true;
    if(!world.provoked)return;
    const n=direction(actor,near);actor.yaw=angle(n.x,n.z);
    if(actor.weapon==='melee'&&actor.attachment?.boatId===near.attachment?.boatId&&distance(actor,near)>c.melee.rangeM*0.85)moveOnSurface(world,river,actor,n.x,n.z,c.enemy.walkMps);
    if(world.tick>=actor.nextAI&&(actor.weapon==='bow'||distance(actor,near)<=c.melee.rangeM)){if(startAttack(world,actor,near))actor.nextAI=world.tick+ticks(c,actor.weapon==='bow'?c.enemy.bowIntervalS:c.enemy.attackIntervalS);}
    return;
  }
  if(actor.kind==='companion'&&actor.follows&&alive(player)){
    if(actor.followBoard&&actor.attachment?.boatId===actor.followBoard.from?.boatId){
      const own=boatList(world,river,c).find(b=>b.id===actor.attachment.boatId),point=localToWorld(own,actor.followBoard.from.localX,actor.followBoard.from.localZ);
      if(distance(actor,point)>.25){const n=direction(actor,point);moveOnSurface(world,river,actor,n.x,n.z,c.walkMps);}
      else if(boardBoat(world,river,actor,actor.followBoard.targetBoatId))actor.followBoard=null;
    }else if(actor.attachment?.boatId===player.attachment?.boatId&&distance(actor,player)>1.3&&player.mode==='foot'){const n=direction(actor,player);moveOnSurface(world,river,actor,n.x,n.z,c.walkMps);}
    const enemy=nearestEnemy(world,actor,c.melee.rangeM);
    if(enemy&&world.provoked&&world.tick>=actor.nextAI){if(startAttack(world,actor,enemy))actor.nextAI=world.tick+ticks(c,c.enemy.attackIntervalS);}
  }
  if(world.mapOpen&&world.tick<world.defenseUntil&&actor.attachment?.boatId==='player-boat'){
    const enemy=nearestEnemy(world,actor,c.enemy.detectM);
    if(enemy&&world.tick>=actor.nextAI){actor.weapon='bow';if(startAttack(world,actor,enemy))actor.nextAI=world.tick+ticks(c,c.enemy.bowIntervalS);}
  }
}

export function stepEncounter(world,river,intent={}){
  const c=world.config;let player=controlledActor(world);const oldEpoch=world.controlEpoch;
  if(world.phase!=='active')return;
  for(const action of intent.actions||[])command(world,river,player,action,intent);
  const helm=world.helm&&alive(player);
  let boatIntent={};
  if(helm){
    boatIntent=world.mapOpen?{throttle:world.mapDrive.throttle,turn:clamp((world.mapDrive.yaw-river.yaw)*4-river.yawRate*3,-1,1)}:{forward:intent.forward,back:intent.back,left:intent.left,right:intent.right};
    world.lastDrive={throttle:world.mapOpen?world.mapDrive.throttle:Number(!!intent.forward)-Number(!!intent.back),yaw:river.yaw};
  }else if(world.deckDrive&&player.attachment?.boatId==='player-boat'&&alive(player)){
    boatIntent={throttle:world.deckDrive.throttle,turn:clamp((world.deckDrive.yaw-river.yaw)*4-river.yawRate*3,-1,1)};
  }else{river.anchor=true;world.deckDrive=null;
  }
  boatIntent.actions=intent.riverActions||[];
  const extra=world.enemyBoat?[-2,0,2].map((offset,i)=>({id:`enemy-hull:${i}`,x:world.enemyBoat.x,z:world.enemyBoat.z+offset,radiusM:1.5,kind:'solid'})):[];
  // Preserve pre-motion poses for relative swept arrow/actor collision,
  // including passengers transported by a moving deck during this tick.
  const previous=new Map(world.actors.map(a=>[a.id,{x:a.x,y:a.y,z:a.z}]));
  stepRiver(river,boatIntent,extra);world.tick=river.tick;if(world.army)world.army.tick=world.tick;
  if(world.enemyBoat){const e=world.enemyBoat,b=c.enemyBoat,t=world.tick/c.tickHz;e.z=b.z+Math.sin(t*b.driftFrequency)*b.driftAmplitudeM;e.vz=Math.cos(t*b.driftFrequency)*b.driftAmplitudeM*b.driftFrequency;}
  for(const actor of world.actors)syncAttachment(actor,world,river,c);
  if(world.takeoverAt!==null&&world.tick>=world.takeoverAt){
    const reserve=world.actors.find(a=>a.kind==='reserve'&&alive(a));world.takeoverAt=null;
    if(reserve){world.controlledId=reserve.id;world.controlEpoch++;world.helm=false;world.selectedId=null;player=reserve;event(world,'ReserveTookOver',{actorId:reserve.id});notice(world,`${reserve.name} tiếp quản tại vị trí hiện tại. Nhân vật trước vẫn bị thương.`);}
    else{world.phase='failed_command';event(world,'NoReserves');notice(world,'Không còn sĩ quan dự bị đủ khả năng tiếp quản. Lượt thử kết thúc.');return;}
  }
  const activeInput=world.controlEpoch===oldEpoch&&!world.mapOpen?intent:{};
  if(alive(player)){
    const guard=!!activeInput.guard&&!world.helm&&player.mode==='foot';
    if(guard&&!player.guard)player.guardSince=world.tick;player.guard=guard;
    if(!world.helm)stepMotion(world,river,player,activeInput);
    if(activeInput.attack)startAttack(world,player);
    if(world.mapOpen&&!world.helm){player.guard=true;}
  }
  for(const actor of world.actors){
    if(actor.id!==player.id){if(['air','swim'].includes(actor.mode))stepMotion(world,river,actor,{});else stepAI(world,river,actor);}
    stepAttacks(world,river,actor);
    if(alive(actor)&&actor.mode==='foot'&&!actor.action&&!actor.guard&&world.tick-actor.lastExertion>=ticks(c,c.restDelayS))actor.stamina=Math.min(c.staminaMax,actor.stamina+c.restStaminaPerS/c.tickHz);
    if(actor.mode==='downed'&&world.tick-actor.downTick>=ticks(c,c.bleedOutS)){actor.mode='dead';event(world,'ActorDied',{actorId:actor.id});}
  }
  stepArrows(world,river,previous);
  if(world.selectedId){const target=selectedTarget(world,player);if(!target||distance(player,target)>armyDefaults.sight||!lineOfSight(world,river,player,target))world.selectedId=null;}
}

export function encounterSnapshot(world){return {tick:world.tick,controlledId:world.controlledId,controlEpoch:world.controlEpoch,helm:world.helm,mapOpen:world.mapOpen,phase:world.phase,selectedId:world.selectedId,takeoverAt:world.takeoverAt,enemyBoat:world.enemyBoat?{...world.enemyBoat}:null,actors:world.actors.map(a=>structuredClone(a)),projectiles:world.projectiles.map(a=>({...a})),eventCounts:{...world.eventCounts},events:world.events.map(e=>({...e})),message:world.tick<=world.messageUntil?world.message:''};}
