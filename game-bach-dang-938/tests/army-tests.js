import { createArmy, issueArmyCommand, queueConvoy, queueArmyJob, stepArmy, stepArmyAI, stepArmyPaths, stepArmyCombat, stepArmyLogistics, bridgeArmyCombat, armySnapshot } from '../src/sim/army.js';
import { createRiverState } from '../src/sim/vessel.js';
import { createEncounter, stepEncounter, applyActorDamage } from '../src/sim/encounter.js';
import { bedAt } from '../src/sim/river.js';

export async function runArmyTests() {
  const riverConfig=await(await fetch(new URL('../data/river-config.json',import.meta.url))).json();
  const checks=[],check=(name,condition,evidence)=>checks.push({name,passed:!!condition,evidence});
  const fixture=(friendly=10,enemy=0,extra={})=>{const river={tick:0,config:riverConfig,readings:{waterY:1.4}};return {river,army:createArmy(river,{playerCount:friendly,enemyCount:enemy,config:extra})};};
  const tick=(f,n)=>{for(let i=0;i<n;i++){f.river.tick++;stepArmy(f.army,f.river);}};
  const order=(f,id,squadId,type,x,z,lossThreshold=.4)=>issueArmyCommand(f.army,{id,squadId,type,x,z,lossThreshold,retreatPolicy:'auto'});
  let f=fixture(20,10),a=f.army;
  check('Every simulated soldier has a unique stable ID and history',a.people.length===30&&new Set(a.people.map(p=>p.id)).size===30&&a.people.every(p=>p.history.length===1));
  check('Each soldier belongs to exactly one squad',a.people.every(p=>a.squadById.get(p.squadId).members.filter(id=>id===p.id).length===1));
  check('Cannot command the opposing team',!order(f,'bad','E-001','move',-30,20).ok);
  check('Cannot issue order into deep river',!order(f,'water','T-001','move',0,0).ok);
  const r=order(f,'first','T-001','move',-30,20);check('Valid ground objective is accepted',r.ok);
  check('Duplicate command returns its original receipt',issueArmyCommand(a,{id:'first',squadId:'T-001',type:'cancel'})===r);
  order(f,'second','T-002','defend',-27,15);tick(f,180);
  check('Two independent squads advance without micro-management',a.squadById.get('T-001').z<45&&a.squadById.get('T-002').z<45);
  const one=a.squadById.get('T-001');issueArmyCommand(a,{id:'cancel',squadId:one.id,type:'cancel'});const held=one.z;tick(f,90);
  check('Cancel stops order at the current position',one.order===null&&Math.abs(one.z-held)<.001);
  order(f,'change-1',one.id,'move',-30,20);order(f,'change-2',one.id,'move',-30,52);tick(f,5);
  check('Changing an order invalidates pending old paths',one.order.point.z===52&&one.goal.z===52);
  order(f,'across',one.id,'move',30,20);tick(f,10);
  check('Unreachable opposite bank produces a blocked report, not teleportation',one.status==='blocked'&&one.x<0,{report:one.report});

  f=fixture(10,10);a=f.army;const observer=a.people.find(p=>p.team==='friendly'),enemy=a.people.find(p=>p.team==='enemy');
  for(const p of a.people)p.ammo=0;
  check('Unknown enemy is absent from fog snapshot',armySnapshot(a).intel.length===0);
  enemy.x=observer.x;enemy.z=observer.z-3;tick(f,15);
  const contact=a.intel.friendly.get(enemy.id);check('Sight records an enemy position and observation tick',!!contact&&contact.tick===15,contact);
  const oldZ=contact.z;enemy.x=-30;enemy.z=-48;tick(f,30);
  const stale=a.intel.friendly.get(enemy.id);check('Hidden enemy retains old observed position, not current position',stale&&stale.z===oldZ&&enemy.z!==oldZ);
  const unknown=issueArmyCommand(a,{id:'unknown-target',squadId:'T-001',type:'attack',x:-30,z:20,targetId:'D-unknown',lossThreshold:.4});
  check('Cannot issue attack using an unobserved enemy ID',!unknown.ok);

  f=fixture(1,1,{damage:100,fireIntervalTicks:1});a=f.army;const friendly=a.people.find(p=>p.team==='friendly'),foe=a.people.find(p=>p.team==='enemy');
  friendly.x=-30;friendly.z=0;foe.x=-30;foe.z=2;friendly.ammo=1;foe.ammo=1;a.squadById.get(friendly.squadId).x=-30;a.squadById.get(friendly.squadId).z=0;a.squadById.get(foe.squadId).x=-30;a.squadById.get(foe.squadId).z=2;tick(f,1);
  check('Each archer fires one finite shot and simultaneous damage is resolved',friendly.ammo===0&&foe.ammo===0&&friendly.status==='downed'&&foe.status==='downed'&&a.events.filter(e=>e.type==='ArmyDamage').length===2);
  tick(f,10);check('Out-of-ammo soldiers do not create repeated hits',a.events.filter(e=>e.type==='ArmyDamage').length===2);

  f=fixture(10,0,{rescueTicks:3,bleedTicks:30});a=f.army;const squad=a.squadById.get('T-001'),medic=a.byId.get(squad.members[1]),patient=a.byId.get(squad.members[2]);
  patient.status='downed';patient.health=0;patient.wounds=1;patient.downTick=0;patient.x=medic.x;patient.z=medic.z;squad.order={type:'rescue',point:{x:squad.x,z:squad.z}};tick(f,4);
  check('Nearby medic stabilizes casualty once and consumes medical supply',patient.status==='wounded'&&squad.medicine===1&&a.events.filter(e=>e.type==='SoldierRescued').length===1);
  const woundedId=patient.id;tick(f,100);check('Wounded identity and injury persist without double-counting during rescue',a.byId.get(woundedId)===patient&&patient.status==='wounded'&&patient.wounds===1);
  f=fixture(10,0,{rescueTicks:3});a=f.army;const rescueSquad=a.squadById.get('T-001'),rescueMedic=a.byId.get(rescueSquad.members[1]),remotePatient=a.byId.get(rescueSquad.members[2]);remotePatient.status='downed';remotePatient.health=0;remotePatient.downTick=0;remotePatient.x=rescueMedic.x;remotePatient.z=rescueMedic.z-4;rescueSquad.order={type:'rescue',point:{x:rescueSquad.x,z:rescueSquad.z}};tick(f,100);
  check('Medic moves towards a nearby casualty before stabilizing them',remotePatient.status==='wounded'&&a.eventCounts.SoldierRescued===1);
  f=fixture(10,0,{bleedTicks:5});a=f.army;const dying=a.people[2];dying.status='downed';dying.health=0;dying.downTick=0;tick(f,8);check('Untreated casualty becomes dead once and is never removed',dying.status==='dead'&&a.byId.get(dying.id)===dying&&a.events.filter(e=>e.type==='SoldierDied').length===1);
  f=fixture(10);a=f.army;const retreat=a.squadById.get('T-001');order(f,'retreat-on-loss',retreat.id,'move',-30,20,.4);for(const id of retreat.members.slice(0,4)){const p=a.byId.get(id);p.health=0;p.status='downed';p.downTick=0;}tick(f,1);
  check('Loss threshold uses initial deployed denominator and triggers retreat',retreat.order.type==='retreat'&&retreat.deployedAtStart===10);

  f=fixture(10);a=f.army;const source=a.depots[0],dest=a.depots[1],stock=source.stock.ammo;
  const convoy=queueConvoy(a,'supply','rear','forward','ammo',30);queueConvoy(a,'supply','rear','forward','ammo',30);
  check('Supply is debited exactly once at departure',convoy.ok&&source.stock.ammo===stock-30&&a.convoys.length===1);
  check('Supply movement does not mutate the simulation configuration',a.config.depotStock.ammo===stock);
  for(let i=0;i<800;i++){a.tick++;stepArmyPaths(a);stepArmyLogistics(a);}
  check('Physical convoy delivers its reserved cargo exactly once',dest.stock.ammo===30&&a.convoys[0].status==='delivered'&&a.events.filter(e=>e.type==='CargoDelivered').length===1);
  f=fixture(10,1);a=f.army;const blocker=a.people.find(p=>p.team==='enemy');blocker.x=a.depots[0].x;blocker.z=a.depots[0].z;queueConvoy(a,'blocked-route','rear','forward','ammo',30);a.tick++;stepArmyPaths(a);stepArmyLogistics(a);
  check('Enemy near route stops convoy without duplicating or delivering cargo',a.convoys[0].status==='contested'&&a.convoys[0].amount===30&&a.depots[1].stock.ammo===0);
  f=fixture(10);a=f.army;const noStock=queueConvoy(a,'too-much','rear','forward','ammo',41);check('Insufficient capacity does not create cargo or debit stock',!noStock.ok&&a.convoys.length===0&&a.depots[0].stock.ammo===500);
  f=fixture(10,0,{supplyRateTicks:1});a=f.army;const archer=a.people[0],depot=a.depots[0];archer.x=depot.x;archer.z=depot.z;archer.ammo=0;const before=depot.stock.ammo;tick(f,1);
  check('Nearby supply transfers finite ammunition from depot',archer.ammo===1&&depot.stock.ammo===before-1);
  f=fixture(10,0,{repairTicks:2,recruitmentTicks:2});a=f.army;const unit=a.squadById.get('T-001'),lead=a.byId.get(unit.members[0]),home=a.depots[0];lead.x=home.x;lead.z=home.z;home.health=60;
  const wood=home.stock.timber;check('Repair reserves finite timber',queueArmyJob(a,'fix',unit.id,'repair').ok&&home.stock.timber===wood-2);stepArmyLogistics(a);stepArmyLogistics(a);
  check('Repair completes once and restores depot health',home.health===80&&a.events.filter(e=>e.type==='WorkCompleted').length===1);
  const fallen=a.byId.get(unit.members[3]);fallen.status='dead';fallen.health=0;const recruitStock=home.stock.recruits;check('Recruitment is possible only with missing active soldier and available stock',queueArmyJob(a,'new',unit.id,'recruit').ok);stepArmyLogistics(a);stepArmyLogistics(a);
  check('Recruit has a new ID and cannot resurrect the old soldier',home.stock.recruits===recruitStock-1&&fallen.status==='dead'&&unit.members.length===11&&new Set(unit.members).size===11);
  f=fixture(10,0,{repairTicks:10});a=f.army;const worker=a.people[0],home2=a.depots[0];worker.x=home2.x;worker.z=home2.z;home2.health=50;queueArmyJob(a,'cancel-work','T-001','repair');worker.x=-30;worker.z=-20;stepArmyLogistics(a);
  check('Interrupted work refunds the reserved timber once',home2.stock.timber===40&&a.jobs.length===0);

  const characterConfig=await(await fetch(new URL('../data/character-config.json',import.meta.url))).json();
  const river=createRiverState(riverConfig,{scenarioId:'harbor'}),encounter=createEncounter(characterConfig,river,'H01'),army=createArmy(river,{playerCount:1,enemyCount:1});
  const hero=encounter.actors[0],soldier=army.people.find(p=>p.team==='enemy'),enemySquad=army.squadById.get(soldier.squadId);
  hero.x=-30;hero.z=0;hero.y=bedAt(riverConfig,hero.x,hero.z);hero.attachment=null;hero.yaw=0;encounter.helm=false;
  soldier.x=-30;soldier.z=-1;soldier.ammo=0;enemySquad.x=-30;enemySquad.z=-1;enemySquad.goal={x:-30,z:-1};enemySquad.order={type:'defend',point:{x:-30,z:-1}};
  for(let i=0;i<14;i++){stepEncounter(encounter,river,i===0?{actions:[{id:'swing',type:'attack',epoch:1}]}:{});stepArmy(army,river);bridgeArmyCombat(army,encounter,applyActorDamage);}
  const woundedHealth=soldier.health;bridgeArmyCombat(army,encounter,applyActorDamage);
  check('A real character melee action can damage an army soldier exactly once',woundedHealth===79&&soldier.health===79&&army.eventCounts.ArmyDamage===1,{health:soldier.health,events:army.eventCounts});
  army.people.find(p=>p.team==='friendly').status='downed';soldier.ammo=1;soldier.nextShot=army.tick;for(const d of army.depots)d.health=0;
  const heroHealth=hero.health;bridgeArmyCombat(army,encounter,applyActorDamage);bridgeArmyCombat(army,encounter,applyActorDamage);
  check('An army archer can damage the controlled character without duplicate shots',hero.health===heroHealth-15&&soldier.ammo===0,{health:hero.health});
  hero.health=100;hero.guard=true;hero.stamina=100;hero.yaw=0;soldier.ammo=1;army.tick++;soldier.nextShot=army.tick;
  bridgeArmyCombat(army,encounter,applyActorDamage);
  check('Character guard uses the real army archer position',hero.health===96.25&&hero.stamina===92,{health:hero.health,stamina:hero.stamina});

  const r2=createRiverState(riverConfig,{scenarioId:'harbor'}),w2=createEncounter(characterConfig,r2,'H01'),a2=createArmy(r2,{playerCount:1,enemyCount:1});w2.army=a2;w2.helm=false;
  const shooter=w2.actors[0],target=a2.people.find(p=>p.team==='enemy'),enemyTeam=a2.squadById.get(target.squadId),ally=a2.people.find(p=>p.team==='friendly');
  shooter.x=-30;shooter.z=0;shooter.y=bedAt(riverConfig,-30,0);shooter.attachment=null;shooter.weapon='bow';ally.x=-30;ally.z=35;
  target.x=-30;target.z=-5;target.ammo=0;enemyTeam.x=-30;enemyTeam.z=-5;enemyTeam.goal={x:-30,z:-5};enemyTeam.order={type:'defend',point:{x:-30,z:-5}};
  for(let i=0;i<75;i++){const actions=i===0?[{id:'select-army',type:'select',targetId:target.id,epoch:1}]:i===1?[{id:'shoot-army',type:'attack',epoch:1}]:[];stepEncounter(w2,r2,{actions});stepArmy(a2,r2);bridgeArmyCombat(a2,w2,applyActorDamage);}
  check('Player can select and shoot a real army soldier once',shooter.ammo===39&&target.health===83.5&&a2.eventCounts.ArmyDamage===1,{ammo:shooter.ammo,health:target.health,events:a2.eventCounts});

  function deterministic(){const t=fixture(20,20);order(t,'o1','T-001','move',-30,15);order(t,'o2','T-002','defend',-27,10);tick(t,120);return JSON.stringify(armySnapshot(t.army));}
  check('Same scenario and commands produce the same snapshot',deterministic()===deterministic());
  return {checks,passed:checks.filter(c=>c.passed).length,total:checks.length};
}

export async function benchmarkArmy() {
  const riverConfig=await(await fetch(new URL('../data/river-config.json',import.meta.url))).json(),results=[];
  const percentile=(v,q)=>{const s=[...v].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(s.length*q))]||0;};
  for(const count of [50,100,200,400,480]){
    const river={tick:0,config:riverConfig,readings:{waterY:1.4}},army=createArmy(river,{playerCount:count,enemyCount:count});
    // Place real opposing soldiers in a contested corridor for every scale.
    for(const [i,squad] of army.squads.filter(s=>s.team==='enemy').entries()){
      const dx=(-32+(i%3)*3)-squad.x,dz=(30+(i%5)*2)-squad.z;squad.x+=dx;squad.z+=dz;
      squad.order.point={x:squad.x,z:squad.z};squad.goal={x:squad.x,z:squad.z};
      for(const id of squad.members){const p=army.byId.get(id);p.x+=dx;p.z+=dz;}
    }
    const phases={path:[],pathActive:[],ai:[],combat:[],logistics:[]},terminal=new Set();let resurrected=0;
    for(let i=0;i<240;i++){
      river.tick++;army.tick=river.tick;
      if(i%30===0)for(const squad of army.squads.filter(s=>s.team==='friendly').slice(0,8))issueArmyCommand(army,{id:`bench:${i}:${squad.id}`,squadId:squad.id,type:'move',x:-30,z:15+(i%60),lossThreshold:.8});
      const runs=[['path',stepArmyPaths],['ai',stepArmyAI],['combat',stepArmyCombat],['logistics',stepArmyLogistics]];
      for(const [name,fn] of runs){const hadPaths=name==='path'&&army.pathQueue.length>0,start=performance.now();fn(army);const elapsed=performance.now()-start;if(i>=60){phases[name].push(elapsed);if(hadPaths)phases.pathActive.push(elapsed);}}
      for(const p of army.people){if(terminal.has(p.id)&&p.status==='active')resurrected++;if(p.status==='dead'||p.status==='wounded')terminal.add(p.id);}
      if(i%40===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    const metrics={};for(const [name,values] of Object.entries(phases))metrics[name]={samples:values.length,meanMs:values.length?values.reduce((a,b)=>a+b,0)/values.length:0,p95Ms:percentile(values,.95),maxMs:values.length?Math.max(...values):0};
    results.push({friendly:count,enemy:count,total:army.people.length,uniqueIds:new Set(army.people.map(p=>p.id)).size,resurrected,ticks:240,warmupTicks:60,sampledTicks:180,pathsQueued:army.pathQueue.length,shots:army.eventCounts.ArmyShot||0,damages:army.eventCounts.ArmyDamage||0,downed:army.eventCounts.SoldierDowned||0,metrics});
  }
  return {scenario:'local deterministic simulation stress; no rendering or persistence',results};
}
