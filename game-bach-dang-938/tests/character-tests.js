import { createRiverState } from '../src/sim/vessel.js';
import { createEncounter, stepEncounter, encounterSnapshot, applyActorDamage, controlledActor } from '../src/sim/encounter.js';
import { boatList, localToWorld, attach, deckGap, supportAt } from '../src/sim/actor-space.js';

export async function runCharacterTests(){
  const riverBase=await(await fetch(new URL('../data/river-config.json',import.meta.url))).json();
  const character=await(await fetch(new URL('../data/character-config.json',import.meta.url))).json();
  const checks=[],check=(name,passed,evidence)=>checks.push({name,passed:!!passed,evidence});
  let commandSeq=0;
  function fixture(combat=false){const c=structuredClone(riverBase);c.current={xMps:0,zMps:0,eddyStrengthMps:0,maxMps:1.2};c.tideKeys=[[0,1.4],[1500,1.4]];const r=createRiverState(c,{scenarioId:combat?'combat':'harbor'});const w=createEncounter(character,r,'H01');return {r,w};}
  function step(f,n=1,intent={}){for(let i=0;i<n;i++)stepEncounter(f.w,f.r,typeof intent==='function'?intent(i):intent);}
  function cmd(f,type,payload={}){step(f,1,{actions:[{id:`test:${++commandSeq}`,epoch:f.w.controlEpoch,type,...payload}]});}
  function onDeck(f,actor,boatId,x=0,z=0){const boat=boatList(f.w,f.r,character).find(b=>b.id===boatId),p=localToWorld(boat,x,z);attach(actor,{kind:'deck',boatId,y:boat.deckY},f.w,f.r,character,p.x,p.z);}
  function quiet(f){for(const a of f.w.actors.filter(a=>a.team==='enemy'))a.nextAI=1e9;f.w.actors.find(a=>a.id==='A01').follows=false;}
  let f=fixture(),a=controlledActor(f.w);
  step(f,90,{forward:true});const oldZ=f.r.z;cmd(f,'interact');const local={...a.attachment};
  step(f,90,{});const boat=boatList(f.w,f.r,character)[0],p=localToWorld(boat,local.localX,local.localZ);
  check('Deck passenger is carried once by moving boat pose',Math.abs(a.x-p.x)<1e-8&&Math.abs(a.z-p.z)<1e-8&&f.r.z<oldZ-1,{actorZ:a.z,boatZ:f.r.z});
  step(f,10,{left:true,viewYaw:0});check('Walking on moving deck changes local position without losing support',a.attachment?.boatId==='player-boat'&&a.attachment.localX<local.localX);
  f=fixture();a=controlledActor(f.w);f.w.helm=false;attach(a,{kind:'pier',y:character.pier.y},f.w,f.r,character,-18,22);step(f,15,{right:true});
  check('Walking on pier keeps feet on its collision surface',a.x>-18&&a.y===character.pier.y&&a.mode==='foot',a);
  f=fixture();a=controlledActor(f.w);cmd(f,'interact');cmd(f,'interact');check('Leaving and retaking helm preserves actor identity',f.w.helm&&f.w.controlledId==='H01');

  f=fixture(true);quiet(f);f.r.z=19;f.w.helm=false;onDeck(f,controlledActor(f.w),'player-boat',0,-2.8);cmd(f,'board');
  check('Boarding starts a real ballistic jump',controlledActor(f.w).mode==='air'&&f.w.eventCounts.Jumped===1);
  step(f,35);a=controlledActor(f.w);check('Landing attaches to moving enemy deck, not through it',a.mode==='foot'&&a.attachment?.boatId==='enemy-boat'&&Math.abs(a.y-boatList(f.w,f.r,character)[1].deckY)<1e-8,encounterSnapshot(f.w));
  const lp={...a.attachment};step(f,30);const eb=boatList(f.w,f.r,character)[1],ep=localToWorld(eb,lp.localX,lp.localZ);
  check('Moving enemy deck carries landed actor',Math.abs(a.x-ep.x)<1e-8&&Math.abs(a.z-ep.z)<1e-8);
  f=fixture(true);quiet(f);f.r.z=19;f.w.helm=false;onDeck(f,controlledActor(f.w),'player-boat',0,-2.8);f.r.vz=-5;cmd(f,'board');check('Unsafe relative boat speed refuses boarding without charging stamina',!f.w.eventCounts.Jumped&&controlledActor(f.w).stamina===100);
  f=fixture(true);quiet(f);f.w.helm=false;onDeck(f,controlledActor(f.w),'player-boat',0,-2.8);cmd(f,'board');check('Distant boat cannot be reached by an unconditional teleport',!f.w.eventCounts.Jumped&&controlledActor(f.w).mode==='foot');
  f=fixture(true);quiet(f);f.r.z=19;f.w.helm=false;onDeck(f,controlledActor(f.w),'player-boat',0,-2.8);cmd(f,'board');f.w.enemyBoat.x=100;step(f,70);
  check('Jump missing a moved-away boat falls into water',controlledActor(f.w).mode==='swim'&&controlledActor(f.w).attachment===null,controlledActor(f.w));
  const away=controlledActor(f.w).x;step(f,10);check('Falling into water does not recover position for free',Math.abs(controlledActor(f.w).x-away)<1&&controlledActor(f.w).mode==='swim');
  f=fixture(true);f.r.z=19;f.w.helm=false;onDeck(f,controlledActor(f.w),'player-boat',0,-2.8);cmd(f,'board');step(f,105);
  check('Companion follows by walking and performing a validated jump',f.w.actors.find(a=>a.id==='A01').attachment?.boatId==='enemy-boat',f.w.events.filter(e=>e.type==='Jumped'));
  check('Deck gap uses actual side edges as well as fore/aft edges',Math.abs(deckGap({x:0,z:0,yaw:0,width:2,length:8},{x:6,z:0,yaw:0,width:2,length:8})-4)<1e-8);

  function meleeFixture(){const t=fixture(true);quiet(t);t.w.helm=false;for(const enemy of t.w.actors.filter(a=>a.team==='enemy'&&a.id!=='E03')){enemy.health=0;enemy.mode='dead';}onDeck(t,controlledActor(t.w),'enemy-boat',.65,2.9);t.w.selectedId='E03';return t;}
  f=meleeFixture();const target=f.w.actors.find(a=>a.id==='E03');const id=`one:${++commandSeq}`;step(f,100,{actions:[{id,epoch:1,type:'attack'}]});
  check('Repeated melee command damages one target only once',target.health===79&&f.w.eventCounts.MeleeResolved===1,{hp:target.health,count:f.w.eventCounts.MeleeResolved});
  f=meleeFixture();step(f,100,{attack:true});check('Held attack repeats by action recovery, not every tick',f.w.actors.find(a=>a.id==='E03').health===16&&f.w.eventCounts.MeleeResolved===4,f.w.eventCounts);
  f=meleeFixture();a=controlledActor(f.w);a.stamina=0;cmd(f,'attack');check('Insufficient stamina cannot start a melee hit',!a.action&&!f.w.eventCounts.MeleeResolved);
  f=meleeFixture();a=controlledActor(f.w);a.guard=true;a.guardSince=f.w.tick;a.yaw=0;
  const enemy=f.w.actors.find(a=>a.id==='E03');const health=a.health;applyActorDamage(f.w,a.id,28,enemy.id,'parry-hit',true);
  check('Timed frontal parry prevents damage and stuns attacker',a.health===health&&enemy.stunUntil>f.w.tick&&a.counterUntil>f.w.tick&&f.w.eventCounts.Parried===1);
  cmd(f,'attack');step(f,15);check('Counter attack uses finite window and increased damage',enemy.health<79&&f.w.eventCounts.MeleeResolved===1,enemy.health);
  f=meleeFixture();a=controlledActor(f.w);a.guard=true;a.guardSince=-1000;a.yaw=0;applyActorDamage(f.w,a.id,28,'E03','block',true);
  check('Held block reduces damage and costs stamina',a.health>79&&a.health<100&&a.stamina<100);
  f=meleeFixture();a=controlledActor(f.w);a.guard=true;a.stamina=0;applyActorDamage(f.w,a.id,28,'E03','break',true);
  check('Exhausted guard can break and stun the defender',a.stunUntil>f.w.tick&&f.w.eventCounts.GuardBroken===1);
  f=meleeFixture();a=controlledActor(f.w);cmd(f,'dodge');const hp=a.health;applyActorDamage(f.w,a.id,28,'E03','evade',true);
  check('Dodge has bounded stamina cost and evade window',a.health===hp&&a.stamina<=80&&f.w.eventCounts.Evaded===1);
  step(f,20);applyActorDamage(f.w,a.id,28,'E03','after-evade',true);check('Dodge does not provide permanent immunity',a.health<hp);

  f=fixture(true);quiet(f);for(const ally of f.w.actors.filter(a=>a.id!=='H01'&&a.team==='friendly')){ally.attachment=null;ally.x=100;ally.z=100;}
  a=controlledActor(f.w);a.weapon='bow';f.w.selectedId='E03';cmd(f,'attack');step(f,70);
  check('Bow consumes exactly one arrow and resolves one swept hit',a.ammo===39&&f.w.eventCounts.ArrowFired===1&&f.w.eventCounts.ArrowHit===1,{ammo:a.ammo,events:f.w.eventCounts});
  const enemyHP=f.w.actors.find(a=>a.id==='E03').health;step(f,90);check('Spent arrow cannot cause a second hit later',f.w.actors.find(a=>a.id==='E03').health===enemyHP&&f.w.projectiles.length===0);
  f=fixture(true);quiet(f);a=controlledActor(f.w);f.w.selectedId='E03';a.weapon='bow';a.ammo=0;cmd(f,'attack');step(f,90);check('Empty quiver cannot spawn a projectile',!f.w.eventCounts.ArrowFired);
  f=fixture();a=controlledActor(f.w);const before=a.health;applyActorDamage(f.w,a.id,10,null,'dedup');applyActorDamage(f.w,a.id,10,null,'dedup');
  check('Damage cause ledger prevents repeated resolution',a.health===before-7.5&&f.w.eventCounts.Damage===1);

  f=fixture();a=controlledActor(f.w);f.w.helm=false;a.mode='swim';a.attachment=null;const own=boatList(f.w,f.r,character)[0];a.x=own.x+own.width/2+.5;a.z=own.z;a.y=f.r.readings.waterY-.7;cmd(f,'interact');step(f,100);
  check('Nearby conscious crew performs timed rope rescue to real deck',a.mode==='foot'&&a.attachment?.boatId==='player-boat'&&f.w.eventCounts.Rescued===1,a);
  f=fixture();a=controlledActor(f.w);f.w.helm=false;a.mode='swim';a.attachment=null;a.x=0;a.z=-40;a.y=f.r.readings.waterY-.7;cmd(f,'interact');step(f,20);check('Distant rescue is refused instead of warping to shore',a.mode==='swim'&&!a.rescue&&!f.w.eventCounts.Rescued);
  f=fixture();a=controlledActor(f.w);f.w.helm=false;a.mode='swim';a.attachment=null;a.stamina=0;a.x=0;a.z=-40;a.y=f.r.readings.waterY-.7;step(f,620);
  check('Exhausted swimmer has a rescue deadline and can be downed',a.mode==='wounded'&&a.health===0&&f.w.eventCounts.HeroWounded===1);

  f=fixture();step(f,90,{forward:true});cmd(f,'map');const mapZ=f.r.z,mapTick=f.w.tick;step(f,90);
  check('Tactical map keeps simulation and held helm course running',f.w.mapOpen&&f.w.tick===mapTick+90&&f.r.z<mapZ-1);
  step(f,60);check('Map opened after UI blur retains applied throttle rather than neutral input',f.w.mapDrive.throttle===1&&Math.hypot(f.r.vx,f.r.vz)>1.5,{throttle:f.w.mapDrive.throttle,speed:Math.hypot(f.r.vx,f.r.vz)});
  cmd(f,'map');check('Map can return without changing control identity',!f.w.mapOpen&&f.w.controlledId==='H01');
  f=fixture();a=controlledActor(f.w);applyActorDamage(f.w,a.id,1000,null,'hero-down');step(f,95);
  check('Hero is wounded and a real reserve takes control after delay',a.mode==='wounded'&&f.w.controlledId==='R01'&&f.w.controlEpoch===2);
  const reserve=controlledActor(f.w);check('Takeover does not teleport reserve to wounded hero',reserve.attachment?.localX===-.65&&reserve.attachment?.localZ===1);
  const ammo=reserve.ammo;step(f,1,{actions:[{id:'old-epoch',epoch:1,type:'weapon'}]});check('Stale controller commands are rejected after takeover',reserve.ammo===ammo&&reserve.weapon==='melee'&&f.w.eventCounts.CommandRejected===1);
  applyActorDamage(f.w,'R01',1000,null,'r1-down');step(f,95);check('Second reserve takes over without reviving first reserve',f.w.controlledId==='R02'&&f.w.actors.find(a=>a.id==='R01').health===0);
  applyActorDamage(f.w,'R02',1000,null,'r2-down');step(f,95);check('No eligible reserve ends the encounter exactly once',f.w.phase==='failed_command'&&f.w.eventCounts.NoReserves===1);
  const tick=f.w.tick;step(f,30);check('Ended encounter does not keep changing combat state',f.w.tick===tick&&f.w.eventCounts.NoReserves===1);

  f=fixture();f.w.helm=false;step(f,45,{forward:true});a=controlledActor(f.w);
  check('Friendly crew cannot trap player in narrow deck corridor',a.mode==='foot'&&a.attachment.localZ<-.8,a.attachment);
  f=fixture();f.w.helm=false;a=controlledActor(f.w);attach(a,supportAt(f.w,f.r,character,-30,20).find(s=>s.kind==='ground'),f.w,f.r,character,-30,20);step(f,10,{back:true});
  check('Walking on dry shore retains actual ground support',a.mode==='foot'&&a.attachment?.kind==='ground'&&a.z>20,a);
  f=fixture();f.w.helm=false;a=controlledActor(f.w);a.mode='swim';a.attachment=null;const rescueBoat=boatList(f.w,f.r,character)[0];a.x=rescueBoat.x+rescueBoat.width/2+.5;a.z=rescueBoat.z;a.y=f.r.readings.waterY-.7;cmd(f,'interact');
  const rescuer=f.w.actors.find(t=>t.id===a.rescue.crewId);applyActorDamage(f.w,rescuer.id,1000,null,'rescuer-down');step(f,5);
  check('Rescue cancels if assigned crew is downed, without snapping to deck',a.mode==='swim'&&!a.rescue&&!f.w.eventCounts.Rescued&&f.w.eventCounts.RescueCancelled===1);
  f=fixture(true);quiet(f);a=controlledActor(f.w);const arrowTarget=f.w.actors.find(t=>t.id==='E01');
  f.w.projectiles.push({id:'fast-arrow',ownerId:a.id,x:arrowTarget.x,y:arrowTarget.y+1,z:arrowTarget.z+8,vx:0,vy:0,vz:-600,age:0});step(f);
  check('High-speed swept arrow hits once instead of tunnelling through deck actor',f.w.eventCounts.ArrowHit===1&&f.w.eventCounts.Damage===1&&f.w.projectiles.length===0,f.w.events);
  f=fixture(true);quiet(f);a=controlledActor(f.w);const ally=f.w.actors.find(t=>t.id==='R01');
  f.w.projectiles.push({id:'friendly-arrow',ownerId:a.id,x:ally.x,y:ally.y+1,z:ally.z+.7,vx:0,vy:0,vz:-60,age:0});step(f);
  check('Friendly fire is physical and respects one projectile hit',ally.health===83.5&&f.w.eventCounts.ArrowHit===1,ally.health);
  f=fixture(true);quiet(f);a=controlledActor(f.w);const ebCover=boatList(f.w,f.r,character)[1];
  f.w.projectiles.push({id:'hull-arrow',ownerId:a.id,x:ebCover.x,y:ebCover.deckY-.2,z:ebCover.z+ebCover.length/2+1,vx:0,vy:0,vz:-120,age:0});step(f);
  check('Boat hull blocks a low arrow before it can hit crew',f.w.eventCounts.ArrowBlocked===1&&!f.w.eventCounts.Damage,f.w.events);
  f=meleeFixture();a=controlledActor(f.w);a.y+=4;a.attachment=null;cmd(f,'attack');step(f,15);
  check('Melee cannot damage someone on a different vertical level',f.w.actors.find(t=>t.id==='E03').health===100);
  return {version:character.version,checks,passed:checks.filter(c=>c.passed).length,total:checks.length};
}
