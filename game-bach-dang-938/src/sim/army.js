import { bedAt, clamp } from './river.js';
import { armyDefaults } from './army-config.js';

// The army has its own authoritative per-person state. Rendering is a view.
const active = person => person && person.status === 'active';
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const key = (x, z) => `${x},${z}`;
const copy = value => structuredClone(value);
// Derived spatial scratch only; never persisted or shared between armies.
// Keep numeric cell order identical to the former dx/dz traversal.
const spatialScratch = new WeakMap();

function record(army, type, data = {}) {
  const e = { ...data, id: `army:${army.tick}:${++army.sequence}`, tick: army.tick, type };
  if(army.journalPending)army.journalPending.push(e);
  army.events.push(e);
  army.eventCounts[type]=(army.eventCounts[type]||0)+1;
  if (army.events.length > 300) army.events.shift();
  return e;
}

function history(person, tick, type, detail = {}) {
  person.history.push({ tick, type, ...detail });
  if (person.history.length > 24) person.history.shift();
}

function personFor(army, squad, index, x, z, recruited = false) {
  const id = `${squad.team === 'friendly' ? 'F' : 'D'}-${String(++army.personSequence).padStart(5, '0')}`;
  const person = { id, squadId: squad.id, team: squad.team, role: index === 0 ? 'leader' : index === 1 ? 'medic' : 'archer',
    x, z, health: army.config.health, ammo: recruited ? army.config.recruitAmmo : army.config.ammo,
    status: 'active', wounds: 0, downTick: null, nextShot: army.tick + (index % 10) * 3,
    rescue: null, history: [], kills: 0 };
  history(person, army.tick, recruited ? 'recruited' : 'deployed');
  army.people.push(person); army.byId.set(id, person); squad.members.push(id);
  return person;
}

function makeSquads(army, team, count) {
  const size = army.config.squadSize;
  for (let start = 0, number = 0; start < count; start += size, number++) {
    const isFriend = team === 'friendly', col = number % 3, row = Math.floor(number / 3);
    const x = -31 + col * 3, z = isFriend ? 48 - row * 3 : -48 + row * 3;
    const squad = { id: `${isFriend ? 'T' : 'E'}-${String(number + 1).padStart(3, '0')}`, team,
      name: `${isFriend ? 'Tổ' : 'Địch'} ${number + 1}`, members: [], deployedAtStart: Math.min(size, count - start),
      x, z, goal: { x, z }, order: null, path: [], pathIndex: 0, pathPending: false,
      status: 'holding', report: 'Giữ vị trí', medicine: 2, lossThreshold: army.config.initialLossThreshold,
      retreatPolicy: 'auto', lastProgressTick: 0, lastProgressX: x, lastProgressZ: z, lastOrderId: null };
    army.squads.push(squad); army.squadById.set(squad.id, squad);
    for (let i = 0; i < squad.deployedAtStart; i++) personFor(army, squad, i, x + (i % 2) * .6, z + Math.floor(i / 2) * .6);
  }
}

export function createArmy(river, options = {}) {
  const config = { ...armyDefaults, ...options.config, depotStock: { ...armyDefaults.depotStock }, forwardStock: { ...armyDefaults.forwardStock } };
  const playerCount = options.playerCount ?? config.playerCount, enemyCount = options.enemyCount ?? config.enemyCount;
  if (!Number.isInteger(playerCount) || !Number.isInteger(enemyCount) || playerCount < 1 || enemyCount < 0 || playerCount > 1000 || enemyCount > 1000) throw new Error('Quân số thử không hợp lệ.');
  const army = { config, tick: river.tick, sequence: 0, personSequence: 0, people: [], byId: new Map(), squads: [], squadById: new Map(),
    events: [], eventCounts: {}, receipts: new Map(), encounterSeen: new Set(), damageCauses: new Set(), pathQueue: [], intel: { friendly: new Map(), enemy: new Map() }, grid: new Map(),
    depots: [ { id: 'rear', name: 'Kho hậu phương', x: -30, z: 56, health: 100, stock: { ...config.depotStock } },
      { id: 'forward', name: 'Kho tiền phương', x: -29, z: 12, health: 100, stock: { ...config.forwardStock } } ],
    convoys: [], jobs: [], initial: { friendly: playerCount, enemy: enemyCount }, riverConfig: river.config, waterY: river.readings.waterY };
  makeSquads(army, 'friendly', playerCount); makeSquads(army, 'enemy', enemyCount);
  // Enemy guards pursue only contacts actually observed; no player order is needed.
  for (const [index,squad] of army.squads.filter(s => s.team === 'enemy').entries()) squad.order = index%2
    ? { type: 'defend', point: { x: squad.x, z: squad.z } }
    : { type: 'raid', point: { x: -29, z: 12 } };
  return army;
}

function walkable(army, x, z) {
  const map = army.riverConfig.map;
  if (Math.abs(x) > map.halfWidthM + 13 || Math.abs(z) > map.halfLengthM - 2) return false;
  if (bedAt(army.riverConfig, x, z) < army.waterY - army.config.maxWade) return false;
  return !map.obstacles.some(o => Math.hypot(x - o.x, z - o.z) < o.radiusM + .7);
}

function gridPoint(army, x, z) { const size = army.config.gridSize; return { x: Math.round(x / size), z: Math.round(z / size) }; }
function worldPoint(army, p) { return { x: p.x * army.config.gridSize, z: p.z * army.config.gridSize }; }

// Bounded A*: no teleport on failure; diagonal corners must both be walkable.
export function findArmyPath(army, from, to) {
  const start = gridPoint(army, from.x, from.z), end = gridPoint(army, to.x, to.z);
  const startKey = key(start.x, start.z), endKey = key(end.x, end.z);
  const endWorld=worldPoint(army,end);
  if (!walkable(army, to.x, to.z) || !walkable(army, endWorld.x, endWorld.z)) return null;
  const open = [{ ...start, g: 0, f: Math.hypot(end.x-start.x,end.z-start.z) }], best = new Map([[startKey, 0]]), prev = new Map();
  let visited = 0;
  while (open.length && visited++ < army.config.maxNodes) {
    let bestIndex = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bestIndex].f) bestIndex = i;
    const p = open.splice(bestIndex, 1)[0], pk = key(p.x, p.z);
    if (p.g !== best.get(pk)) continue;
    if (pk === endKey) {
      const result = [];
      for (let k = endKey; k !== startKey; k = prev.get(k)) {
        if (!k) return null;
        const [x, z] = k.split(',').map(Number); result.push(worldPoint(army, { x, z }));
      }
      result.reverse(); result.push({ x: to.x, z: to.z }); return result;
    }
    for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const n = { x:p.x+dx, z:p.z+dz }, w = worldPoint(army,n);
      if (!walkable(army,w.x,w.z)) continue;
      if (dx && dz) { const a=worldPoint(army,{x:p.x+dx,z:p.z}), b=worldPoint(army,{x:p.x,z:p.z+dz}); if(!walkable(army,a.x,a.z)||!walkable(army,b.x,b.z))continue; }
      const g = p.g + (dx && dz ? Math.SQRT2 : 1), nk = key(n.x,n.z);
      if (g >= (best.get(nk) ?? Infinity)) continue;
      best.set(nk,g);prev.set(nk,pk);open.push({...n,g,f:g+Math.hypot(end.x-n.x,end.z-n.z)});
    }
  }
  return null;
}

function queuePath(army, entity, point) {
  entity.goal = { x: point.x, z: point.z }; entity.path = []; entity.pathIndex = 0;
  entity.pathVersion=(entity.pathVersion||0)+1;entity.pathPending=true;
  army.pathQueue.push({entity,version:entity.pathVersion});
}

function report(army, squad, status, message) {
  if (squad.status !== status || squad.report !== message) { squad.status = status; squad.report = message; record(army, 'SquadReport', { squadId:squad.id, status, message }); }
}

export function issueArmyCommand(army, command) {
  if (!command?.id || typeof command.id !== 'string') return { ok:false, reason:'Thiếu mã lệnh.' };
  if (army.receipts.has(command.id)) return army.receipts.get(command.id);
  const fail = reason => { const r = { ok:false, reason }; army.receipts.set(command.id,r); return r; };
  const squad = army.squadById.get(command.squadId);
  if (!squad || squad.team !== 'friendly') return fail('Không có quyền chỉ huy tổ này.');
  if (!squad.members.some(id => active(army.byId.get(id)))) return fail('Tổ không còn người có thể thi hành.');
  if (command.type === 'cancel') { squad.order = null; squad.path = []; squad.pathPending = false; squad.pathVersion=(squad.pathVersion||0)+1; squad.lastOrderId=command.id; report(army,squad,'holding','Đã hủy lệnh; giữ vị trí.'); }
  else {
    if (!['move','defend','attack','rescue','retreat'].includes(command.type)) return fail('Loại lệnh không hợp lệ.');
    if (!Number.isFinite(command.x) || !Number.isFinite(command.z) || !walkable(army,command.x,command.z)) return fail('Điểm đích không thể đi bộ tới hoặc đang ngập.');
    if (!Number.isFinite(command.lossThreshold) || command.lossThreshold < 0 || command.lossThreshold > 1) return fail('Ngưỡng tổn thất phải từ 0 đến 100%.');
    if (command.type === 'attack' && command.targetId) {
      const seen=army.intel.friendly.get(command.targetId);
      if (!seen || army.tick-seen.tick>army.config.intelMaxAgeTicks) return fail('Mục tiêu chưa được trinh sát hoặc tin đã hết hạn.');
      command = { ...command, x:seen.x, z:seen.z }; // last observed position, never live hidden pose
    }
    squad.lossThreshold=command.lossThreshold; squad.retreatPolicy=command.retreatPolicy==='hold'?'hold':'auto';
    squad.order={type:command.type,point:{x:command.x,z:command.z},targetId:command.targetId||null}; squad.lastOrderId=command.id;
    queuePath(army,squad,squad.order.point); report(army,squad,'planning','Đang tìm đường.');
  }
  const receipt={ok:true,commandId:command.id,tick:army.tick};army.receipts.set(command.id,receipt);record(army,'OrderAccepted',{squadId:squad.id,commandId:command.id,orderType:command.type});return receipt;
}

export function queueConvoy(army, id, fromId, toId, resource, amount) {
  if (army.receipts.has(id)) return army.receipts.get(id);
  const from=army.depots.find(d=>d.id===fromId),to=army.depots.find(d=>d.id===toId);
  const fail=reason=>{const r={ok:false,reason};army.receipts.set(id,r);return r;};
  if(!id||!from||!to||from===to||!['ammo','timber','medicine','recruits'].includes(resource)||!Number.isInteger(amount)||amount<=0||amount>army.config.convoyCapacity||from.health<=0||to.health<=0||from.stock[resource]<amount)return fail('Tuyến hoặc hàng không hợp lệ, kho không đủ.');
  from.stock[resource]-=amount;
  const convoy={id:`convoy:${id}`,commandId:id,x:from.x,z:from.z,fromId,toId,resource,amount,path:[],pathIndex:0,pathPending:false,status:'planning',goal:{x:to.x,z:to.z}};
  army.convoys.push(convoy);queuePath(army,convoy,convoy.goal);const r={ok:true,convoyId:convoy.id};army.receipts.set(id,r);record(army,'CargoDeparted',{convoyId:convoy.id,resource,amount});return r;
}

export function queueArmyJob(army, id, squadId, type) {
  if (army.receipts.has(id)) return army.receipts.get(id);
  const squad=army.squadById.get(squadId),leader=squad&&squad.members.map(x=>army.byId.get(x)).find(active);
  const depot=leader&&army.depots.find(d=>d.health>0&&dist(d,leader)<=army.config.depotRadius);
  const fail=reason=>{const r={ok:false,reason};army.receipts.set(id,r);return r;};
  if(!id||!squad||squad.team!=='friendly'||!leader||!depot||!['recruit','repair'].includes(type))return fail('Cần tổ còn người ở gần kho để thực hiện.');
  if(army.jobs.some(j=>j.squadId===squadId))return fail('Tổ đang làm công việc khác.');
  if(type==='recruit' && (depot.stock.recruits<1||squad.members.filter(x=>active(army.byId.get(x))).length>=squad.deployedAtStart))return fail('Không có quân bổ sung hoặc tổ đã đủ người.');
  if(type==='repair' && (depot.stock.timber<2||depot.health>=100))return fail('Kho không hỏng hoặc thiếu 2 gỗ.');
  // Reserve resources exactly once. Cancellation/failure returns the reserve.
  const resource=type==='recruit'?'recruits':'timber',amount=type==='recruit'?1:2;
  depot.stock[resource]-=amount;
  army.jobs.push({id,squadId,type,depotId:depot.id,resource,amount,remaining:type==='recruit'?army.config.recruitmentTicks:army.config.repairTicks});
  const r={ok:true,jobId:id};army.receipts.set(id,r);record(army,'WorkStarted',{jobId:id,squadId,jobType:type});return r;
}

export function stepArmyPaths(army) {
  for(let n=0;n<army.config.pathBudget && army.pathQueue.length;n++){
    const queued=army.pathQueue.shift(),entity=queued.entity;if(!entity.pathPending||queued.version!==entity.pathVersion)continue;
    entity.pathPending=false;const path=findArmyPath(army,entity,entity.goal);
    if(path){entity.path=path;entity.pathIndex=0;if(entity.members)report(army,entity,'moving','Đang thi hành lệnh.');else entity.status='moving';}
    else if(entity.members)report(army,entity,'blocked','Không có đường bộ an toàn tới mục tiêu.');
    else {entity.status='blocked';record(army,'ConvoyBlocked',{convoyId:entity.id,reason:'no-path'});}
  }
}

function indexPeople(army) {
  let scratch=spatialScratch.get(army);
  if(!scratch){scratch={pool:new Map(),cells:[],rows:new Map()};spatialScratch.set(army,scratch);}
  for(const bucket of army.grid.values())bucket.length=0;
  for(const row of scratch.rows.values())row.clear();
  army.grid.clear();scratch.cells.length=0;const cell=army.config.spatialCellM;
  for(const p of army.people)if(active(p)){
    const x=Math.floor(p.x/cell),z=Math.floor(p.z/cell),k=key(x,z);
    let bucket=army.grid.get(k);
    if(!bucket){bucket=scratch.pool.get(k)||[];scratch.pool.set(k,bucket);bucket.length=0;army.grid.set(k,bucket);scratch.cells.push({x,z,people:bucket});
      let row=scratch.rows.get(x);if(!row){row=new Map();scratch.rows.set(x,row);}row.set(z,bucket);
    }
    bucket.push(p);
  }
  scratch.cells.sort((a,b)=>a.x-b.x||a.z-b.z);
}
function nearby(army,person,range) {
  const size=army.config.spatialCellM,x=Math.floor(person.x/size),z=Math.floor(person.z/size),r=Math.ceil(range/size),out=[];
  const scratch=spatialScratch.get(army),cells=scratch?.cells;
  // Long sight/fire queries previously scanned 121–169 mostly empty cells.
  // Only occupied cells are candidates; exact distance and visit order stay unchanged.
  if(r>=2&&cells){
    for(const c of cells){if(c.x<x-r)continue;if(c.x>x+r)break;if(c.z<z-r||c.z>z+r)continue;
      for(const p of c.people)if(p.id!==person.id&&Math.abs(p.x-person.x)<=range&&Math.abs(p.z-person.z)<=range&&dist(p,person)<=range)out.push(p);
    }
  }else if(scratch){
    for(let dx=-r;dx<=r;dx++){const row=scratch.rows.get(x+dx);if(!row)continue;
      for(let dz=-r;dz<=r;dz++)for(const p of row.get(z+dz)||[])if(p.id!==person.id&&Math.abs(p.x-person.x)<=range&&Math.abs(p.z-person.z)<=range&&dist(p,person)<=range)out.push(p);
    }
  }else for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)for(const p of army.grid.get(key(x+dx,z+dz))||[])if(p.id!==person.id&&dist(p,person)<=range)out.push(p);
  return out;
}
function visible(army,a,b) {
  if(dist(a,b)>army.config.sight)return false;
  const aY=(Number.isFinite(a.y)?a.y:bedAt(army.riverConfig,a.x,a.z))+1.6,bY=(Number.isFinite(b.y)?b.y:bedAt(army.riverConfig,b.x,b.z))+1.6;
  for(let i=1;i<8;i++){const t=i/8,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(bedAt(army.riverConfig,x,z)>aY+(bY-aY)*t)return false;}
  return true;
}
function updateIntel(army) {
  const interval=army.config.sightIntervalTicks;
  // Spread the same per-person 15-tick perception cycle across ticks rather
  // than creating a single spike when hundreds of observers are clustered.
  for(let index=army.tick%interval;index<army.people.length;index+=interval){const observer=army.people[index];if(active(observer))for(const seen of nearby(army,observer,army.config.sight))if(seen.team!==observer.team&&visible(army,observer,seen)){
    army.intel[observer.team].set(seen.id,{id:seen.id,squadId:seen.squadId,x:seen.x,z:seen.z,tick:army.tick});
  }}
  if(army.tick%interval===0)for(const entries of Object.values(army.intel))for(const [id,intel] of entries)if(army.tick-intel.tick>army.config.intelMaxAgeTicks)entries.delete(id);
}

export function observeCommander(army, actor) {
  if(!actor||actor.health<=0||army.tick%army.config.sightIntervalTicks!==0)return;
  for(const p of army.people)if(p.team!==actor.team&&active(p)&&visible(army,actor,p))army.intel.friendly.set(p.id,{id:p.id,squadId:p.squadId,x:p.x,z:p.z,tick:army.tick});
}

function advanceOnPath(army, entity, speed) {
  if(entity.pathPending||!entity.path.length)return;
  const target=entity.path[entity.pathIndex];if(!target){entity.path=[];return;}
  if(!walkable(army,target.x,target.z)){queuePath(army,entity,entity.goal);return;}
  const d=dist(entity,target),step=speed/army.config.tickHz;
  if(d<=step){entity.x=target.x;entity.z=target.z;entity.pathIndex++;if(entity.pathIndex>=entity.path.length)entity.path=[];}
  else {entity.x+=(target.x-entity.x)/d*step;entity.z+=(target.z-entity.z)/d*step;}
}

export function stepArmyAI(army) {
  const c=army.config; indexPeople(army);
  updateIntel(army);
  for(const squad of army.squads){
    const members=squad.members.map(id=>army.byId.get(id)),fit=members.filter(active);
    if(!fit.length){report(army,squad,'incapacitated','Không còn người có thể thi hành.');continue;}
    const losses=members.filter(p=>['downed','wounded','dead','missing','captured'].includes(p.status)).length;
    if(squad.team==='friendly'&&squad.order?.type!=='retreat'&&squad.order&&losses/squad.deployedAtStart>=squad.lossThreshold&&losses>0){
      if(squad.retreatPolicy==='auto'){squad.order={type:'retreat',point:{x:c.rallyX,z:c.rallyZ},reason:'losses'};queuePath(army,squad,squad.order.point);report(army,squad,'retreating','Vượt ngưỡng tổn thất, đang rút về điểm tập kết.');}
      else report(army,squad,'warning','Vượt ngưỡng tổn thất; đang giữ theo lệnh.');
    }
    if(squad.team==='enemy'&&army.tick%c.sightIntervalTicks===0){
      const contacts=[...army.intel.enemy.values()].filter(i=>army.tick-i.tick<=c.sightIntervalTicks*2).sort((a,b)=>dist(squad,a)-dist(squad,b));
      const contact=contacts[0],home=squad.order.point;
      if(contact&&dist(squad,contact)<c.sight&&dist(home,contact)<c.sight*2&&dist(squad,contact)>c.fireRange*.7&&!squad.pathPending&&(!squad.path.length||dist(squad.goal,contact)>5))queuePath(army,squad,{x:contact.x,z:contact.z});
      else if(!contact&&dist(squad,home)>3&&!squad.pathPending&&!squad.path.length)queuePath(army,squad,home);
    }
    // The leader cannot drag its formation indefinitely through an obstacle.
    if(dist(squad,fit[0])<8)advanceOnPath(army,squad,c.speed*.75);
    if(squad.path.length&&!squad.pathPending&&army.tick-squad.lastProgressTick>=90){
      if(Math.hypot(squad.x-squad.lastProgressX,squad.z-squad.lastProgressZ)<.1){queuePath(army,squad,squad.goal);report(army,squad,'planning','Đội hình bị kẹt; đang tìm lại đường.');}
      squad.lastProgressX=squad.x;squad.lastProgressZ=squad.z;squad.lastProgressTick=army.tick;
    }
    if(squad.order&&!squad.pathPending&&!squad.path.length&&squad.status==='moving')report(army,squad,'holding','Đã tới mục tiêu; giữ và bảo vệ vị trí.');
    const heading=squad.path[squad.pathIndex]||squad.goal,dx=heading.x-squad.x,dz=heading.z-squad.z,angle=Math.atan2(dx,dz),cos=Math.cos(angle),sin=Math.sin(angle);
    const rescueOrder=squad.order?.type==='rescue'||squad.order?.type==='retreat';
    const assignedMedic=rescueOrder?(fit.find(p=>p.role==='medic')||fit[0]):null;
    const casualty=assignedMedic?members.filter(p=>p.status==='downed').sort((a,b)=>dist(a,assignedMedic)-dist(b,assignedMedic)||a.id.localeCompare(b.id))[0]:null;
    if(casualty&&squad.medicine<=0)report(army,squad,'warning','Thiếu thuốc cứu thương; cần tiếp tế.');
    for(let i=0;i<fit.length;i++){
      const p=fit[i],lateral=((i%3)-1)*c.formationSpacing,back=Math.floor(i/3)*c.formationSpacing;
      const target=p===assignedMedic&&casualty&&squad.medicine>0?casualty:{x:squad.x+cos*lateral-sin*back,z:squad.z-sin*lateral-cos*back};
      let vx=target.x-p.x,vz=target.z-p.z,d=Math.hypot(vx,vz);
      if(d>.12){vx/=d;vz/=d;for(const other of nearby(army,p,c.radius*2)){if(other.team!==p.team)continue;const dd=dist(p,other)||.01;vx+=(p.x-other.x)/dd*.3;vz+=(p.z-other.z)/dd*.3;}
        const mag=Math.hypot(vx,vz)||1,step=Math.min(c.speed/c.tickHz,d),nx=p.x+vx/mag*step,nz=p.z+vz/mag*step;
        if(walkable(army,nx,nz)){p.x=nx;p.z=nz;}else if(walkable(army,p.x+vx/mag*step,p.z))p.x+=vx/mag*step;else if(walkable(army,p.x,p.z+vz/mag*step))p.z+=vz/mag*step;
      }
    }
    if(rescueOrder){
      const medic=assignedMedic,down=casualty&&dist(casualty,medic)<=2?casualty:null;
      if(down&&squad.medicine>0){if(!medic.rescue||medic.rescue.targetId!==down.id)medic.rescue={targetId:down.id,ticks:0};
        if(++medic.rescue.ticks>=c.rescueTicks){squad.medicine--;down.status='wounded';down.downTick=null;history(down,army.tick,'rescued');record(army,'SoldierRescued',{personId:down.id,by:medic.id});medic.rescue=null;}}
      else medic.rescue=null;
    }
  }
}

export function stepArmyCombat(army) {
  const pending=[];
  for(const person of army.people){
    if(person.status==='downed' && army.tick-person.downTick>=army.config.bleedTicks){person.status='dead';history(person,army.tick,'died');record(army,'SoldierDied',{personId:person.id});continue;}
    if(!active(person)||person.ammo<=0||army.tick<person.nextShot)continue;
    let target=null,bestDistance=Infinity;
    for(const candidate of nearby(army,person,army.config.fireRange)){
      if(candidate.team===person.team||!active(candidate))continue;
      const d=dist(person,candidate);
      if(d>bestDistance||(d===bestDistance&&target&&candidate.id.localeCompare(target.id)>=0))continue;
      if(visible(army,person,candidate)){target=candidate;bestDistance=d;}
    }
    if(!target){
      if(person.team==='enemy'){
        const depot=army.depots.find(d=>d.health>0&&dist(d,person)<=army.config.fireRange&&visible(army,person,d));
        if(depot){person.ammo--;person.nextShot=army.tick+army.config.fireIntervalTicks;pending.push({source:person,depot,damage:army.config.depotDamage});record(army,'ArmyShot',{sourceId:person.id,targetId:depot.id,ammo:person.ammo});}
      }
      continue;
    }
    person.ammo--;person.nextShot=army.tick+army.config.fireIntervalTicks;
    pending.push({source:person,target,damage:army.config.damage});
    record(army,'ArmyShot',{sourceId:person.id,targetId:target.id,ammo:person.ammo});
  }
  // Simultaneous shots are collected first; a downed shooter retains this shot.
  for(const hit of pending){if(hit.depot){const depot=hit.depot;if(depot.health<=0)continue;depot.health=Math.max(0,depot.health-hit.damage);record(army,depot.health?'DepotDamaged':'DepotDestroyed',{depotId:depot.id,sourceId:hit.source.id,health:depot.health});continue;}
    const p=hit.target;if(!active(p))continue;p.health=Math.max(0,p.health-hit.damage);
    history(p,army.tick,'hit',{sourceId:hit.source.id,damage:hit.damage});record(army,'ArmyDamage',{personId:p.id,sourceId:hit.source.id,damage:hit.damage});
    if(p.health===0){p.status='downed';p.downTick=army.tick;p.wounds++;history(p,army.tick,'downed');record(army,'SoldierDowned',{personId:p.id});hit.source.kills++;}}
}

export function damageArmySoldier(army, target, amount, sourceId, causeId) {
  const cause=`${causeId}:${target?.id}`;
  if(!active(target)||army.damageCauses.has(cause))return false;
  army.damageCauses.add(cause);target.health=Math.max(0,target.health-amount);
  history(target,army.tick,'hit',{sourceId,damage:amount});record(army,'ArmyDamage',{personId:target.id,sourceId,damage:amount,causeId});
  if(target.health===0){target.status='downed';target.downTick=army.tick;target.wounds++;history(target,army.tick,'downed');record(army,'SoldierDowned',{personId:target.id});}
  return true;
}

// Bridge direct character combat and individual army soldiers in the same
// world. A resolved swing that already contacted an encounter actor cannot
// also hit an army soldier. Army archers may target nearby encounter actors.
export function bridgeArmyCombat(army, combat, applyActorDamage) {
  for(const e of combat.events){
    if(e.type!=='MeleeResolved'||army.encounterSeen.has(e.id))continue;
    army.encounterSeen.add(e.id);
    if(combat.damageKeys.some(k=>k.startsWith(`${e.attackId}:`)))continue;
    const source=combat.actors.find(a=>a.id===e.actorId);
    if(!source||source.health<=0)continue;
    const targets=army.people.filter(p=>p.team!==source.team&&active(p)&&Math.abs(bedAt(army.riverConfig,p.x,p.z)-source.y)<1.4&&dist(source,p)<=combat.config.melee.rangeM)
      .filter(p=>{const d=dist(source,p)||1;return (-Math.sin(source.yaw)*(p.x-source.x)-Math.cos(source.yaw)*(p.z-source.z))/d>=combat.config.melee.coneDot;})
      .sort((a,b)=>Number(b.id===e.targetId)-Number(a.id===e.targetId)||dist(source,a)-dist(source,b)||a.id.localeCompare(b.id));
    const target=targets[0],damage=combat.config.melee.damage*(e.counter?combat.config.defense.counterMultiplier:1)*(1-combat.config.defense.armorFraction);
    if(target)damageArmySoldier(army,target,damage,source.id,e.attackId);
  }
  for(const p of army.people){
    if(!active(p)||p.ammo<=0||army.tick<p.nextShot)continue;
    const target=combat.actors.filter(a=>a.team!==p.team&&a.health>0&&!['wounded','downed','dead'].includes(a.mode)&&dist(a,p)<=army.config.fireRange&&Math.abs(a.y-bedAt(army.riverConfig,p.x,p.z))<1.7&&visible(army,p,a))
      .sort((a,b)=>dist(a,p)-dist(b,p)||a.id.localeCompare(b.id))[0];
    if(!target)continue;
    p.ammo--;p.nextShot=army.tick+army.config.fireIntervalTicks;
    const cause=`army-shot:${p.id}:${army.tick}`;record(army,'ArmyShot',{sourceId:p.id,targetId:target.id,ammo:p.ammo,causeId:cause});
    applyActorDamage(combat,target.id,army.config.damage,p.id,cause,false,p);
  }
}

export function stepArmyLogistics(army) {
  const c=army.config;
  for(const convoy of army.convoys){
    if(convoy.status==='delivered'||convoy.pathPending)continue;
    if(convoy.status==='blocked'){if(army.tick%150===0)queuePath(army,convoy,convoy.goal);continue;}
    if(army.people.some(p=>p.team==='enemy'&&active(p)&&dist(p,convoy)<c.convoyBlockRadius)){if(convoy.status!=='contested')record(army,'ConvoyContested',{convoyId:convoy.id});convoy.status='contested';continue;}
    convoy.status='moving';advanceOnPath(army,convoy,c.convoySpeed);
    if(!convoy.path.length){const dest=army.depots.find(d=>d.id===convoy.toId);if(dest?.health>0){dest.stock[convoy.resource]+=convoy.amount;record(army,'CargoDelivered',{convoyId:convoy.id,resource:convoy.resource,amount:convoy.amount});convoy.amount=0;convoy.status='delivered';}else convoy.status='blocked';}
  }
  if(army.tick%c.supplyRateTicks===0){
    for(const p of army.people)if(active(p)&&p.team==='friendly'&&p.ammo<c.ammo){const depot=army.depots.find(d=>d.health>0&&d.stock.ammo>0&&dist(d,p)<=c.depotRadius);if(depot){depot.stock.ammo--;p.ammo++;}}
    for(const s of army.squads)if(s.team==='friendly'&&s.medicine<2){const leader=s.members.map(id=>army.byId.get(id)).find(active),depot=leader&&army.depots.find(d=>d.health>0&&d.stock.medicine>0&&dist(d,leader)<=c.depotRadius);if(depot){depot.stock.medicine--;s.medicine++;}}
  }
  for(const job of army.jobs){
    const squad=army.squadById.get(job.squadId),depot=army.depots.find(d=>d.id===job.depotId),worker=squad?.members.map(id=>army.byId.get(id)).find(p=>active(p)&&dist(p,depot)<=c.depotRadius);
    if(!worker||!depot||depot.health<=0){if(depot)depot.stock[job.resource]+=job.amount;job.done=true;record(army,'WorkCancelled',{jobId:job.id});continue;}
    if(--job.remaining<=0){if(job.type==='repair')depot.health=Math.min(100,depot.health+20);else personFor(army,squad,squad.members.length,worker.x,worker.z,true);job.done=true;record(army,'WorkCompleted',{jobId:job.id,jobType:job.type});}
  }
  army.jobs=army.jobs.filter(j=>!j.done);
}

export function stepArmy(army, river) {
  army.tick=river.tick;army.waterY=river.readings.waterY;
  stepArmyPaths(army);stepArmyAI(army);stepArmyCombat(army);stepArmyLogistics(army);
  if(river?.combat&&river.combat.phase==='active'){
    const friendly=army.squads.filter(s=>s.team==='friendly');
    const retreating=friendly.filter(s=>s.order?.type==='retreat');
    if(retreating.length>0&&retreating.every(s=>s.status==='holding')){
      river.combat.phase='tactical_retreat';
      if(!river.campaignLedger)river.campaignLedger={chapterInstanceId:`campaign:${river.scenarioId||'combat'}`,missionResults:[]};
      const attemptId=retreating[0].order?.id||'audit-retreat';
      if(!river.campaignLedger.missionResults.some(r=>r.attemptId===attemptId)){
        const result={chapterInstanceId:river.campaignLedger.chapterInstanceId,attemptId,outcome:'tactical_retreat',tick:river.tick};
        river.campaignLedger.missionResults.push(result);
        if(!Array.isArray(river.journalPending))river.journalPending=[];
        river.journalPending.push({id:'attempt-resolution',type:'AttemptResolved',tick:river.tick,...result});
      }
    }
  }
}

export function armySnapshot(army) {
  const intel=[...army.intel.friendly.values()].map(i=>({...i,ageTicks:army.tick-i.tick,visible:army.tick-i.tick<=army.config.sightIntervalTicks}));
  return { tick:army.tick, feedback:army.feedback||'', people:army.people.filter(p=>p.team==='friendly').map(copy), intel,
    squads:army.squads.filter(s=>s.team==='friendly').map(s=>({id:s.id,name:s.name,x:s.x,z:s.z,status:s.status,report:s.report,order:copy(s.order),lossThreshold:s.lossThreshold,retreatPolicy:s.retreatPolicy,medicine:s.medicine,deployedAtStart:s.deployedAtStart,counts:s.members.reduce((out,id)=>{const p=army.byId.get(id);out[p.status]=(out[p.status]||0)+1;return out;},{}),ammo:s.members.reduce((n,id)=>n+(active(army.byId.get(id))?army.byId.get(id).ammo:0),0)})),
    depots:army.depots.map(copy),convoys:army.convoys.map(c=>({id:c.id,x:c.x,z:c.z,status:c.status,resource:c.resource,amount:c.amount})),jobs:army.jobs.map(copy),events:army.events.slice(-30).map(copy) };
}
