import {createRiverState,updateReadings} from '../sim/vessel.js';
import {createEncounter} from '../sim/encounter.js';
import {createArmy} from '../sim/army.js';
import {syncAttachment} from '../sim/actor-space.js';
import {restoreGame,captureGame,projectGame} from './game-state.js';

// Camp values follow gameplay-defaults.json. The 12 m rear-depot recovery
// radius is a sandbox default, not a claim about the historical battle.
export const retryDefaults=Object.freeze({version:1,rearRecoveryRadiusM:12,campRecoveryHours:6,withoutKitMultiplier:2,healthFraction:.7,staminaFraction:.85,treatmentKitCost:1});
const lost=status=>['dead','missing','captured'].includes(status);
const near=(a,b,r)=>!!b&&Math.hypot(a.x-b.x,a.z-b.z)<=r;

export function buildFailedRetry(checkpoint,newAttemptId){
  const old=restoreGame(checkpoint),ids={campaignId:checkpoint.campaignId,attemptId:newAttemptId},c=retryDefaults;
  if(!/^attempt-[A-Za-z0-9_-]{1,100}$/.test(newAttemptId)||newAttemptId===checkpoint.attemptId)throw new Error('INVALID_RETRY_ID');
  if(old.combat.phase!=='failed_command'||!old.campaignLedger?.missionResults?.some(r=>r.attemptId===checkpoint.attemptId&&r.outcome==='failed_command'))throw new Error('ATTEMPT_NOT_SETTLED');
  if(old.campaignLedger.retries?.some(r=>r.previousAttemptId===checkpoint.attemptId))throw new Error('ATTEMPT_ALREADY_RETRIED');
  const hero=old.combat.actors.find(a=>a.id===old.heroId&&a.kind==='mainHero');
  if(!hero||lost(hero.mode))throw new Error('HERO_UNAVAILABLE');
  const rear=old.army?.depots.find(d=>d.id==='rear'&&d.health>0);
  const safeBank=p=>near(p,rear,c.rearRecoveryRadiusM);
  const recoveredBoat=old.components.hull>0&&!old.stuck&&near(old,{x:old.config.repair.zoneX,z:old.config.repair.zoneZ},old.config.repair.zoneRadiusM);
  if(!recoveredBoat)throw new Error('BOAT_NOT_RECOVERABLE');
  const safeActor=a=>safeBank(a)||(a.attachment?.boatId==='player-boat'&&recoveredBoat);
  if(!safeActor(hero))throw new Error('HERO_NOT_RECOVERABLE');
  const next=createRiverState(old.config,{heroId:old.heroId,vesselType:old.vesselType,scenarioId:old.scenarioId});
  // Simulation ticks stay monotonic. Only the scenario's tide clock restarts;
  // campaign time, injuries, ammunition and damage are carried separately.
  next.tick=old.tick;next.timeOffsetS-=old.tick/old.config.tickHz;
  for(const key of ['components','cargoKg','floodKg','discardedKg','timber'])next[key]=structuredClone(old[key]);
  next.campaignLedger=structuredClone(old.campaignLedger);next.campaignLedger.retries||=[];next.campaignLedger.attemptStartTick=next.tick;
  next.combat=createEncounter(old.combat.config,next,old.heroId);
  const initialActors=new Map(next.combat.actors.map(a=>[a.id,a]));
  next.combat.actors=structuredClone(old.combat.actors);
  const receipt={version:c.version,previousAttemptId:checkpoint.attemptId,newAttemptId,chapterInstanceId:old.campaignLedger.chapterInstanceId,tick:old.tick,recoveredHeroId:hero.id,medicineCost:0,campHours:0,missingIds:[],returnedCargo:[],lostCargo:[]};
  const needsTreatment=hero.mode==='wounded'||hero.mode==='downed';
  if(needsTreatment){receipt.medicineCost=rear?.stock.medicine>=c.treatmentKitCost?c.treatmentKitCost:0;receipt.campHours=c.campRecoveryHours*(receipt.medicineCost?1:c.withoutKitMultiplier);}
  for(const actor of next.combat.actors){
    const source=old.combat.actors.find(a=>a.id===actor.id),initial=initialActors.get(actor.id);
    actor.wounds=source.wounds??(['wounded','downed','dead'].includes(source.mode)?1:0);
    if(actor.id===hero.id&&needsTreatment){actor.health=old.combat.config.healthMax*c.healthFraction;actor.stamina=old.combat.config.staminaMax*c.staminaFraction;actor.mode='foot';}
    else if(actor.team==='friendly'&&!lost(actor.mode)&&!safeActor(source)){actor.mode='missing';actor.health=0;receipt.missingIds.push(actor.id);}
    else if(actor.mode==='downed'&&actor.team==='friendly'){actor.mode='wounded';}
    actor.retired=actor.team==='friendly'&&['wounded','downed','dead','missing','captured'].includes(actor.mode);
    if(!actor.retired&&actor.health>0&&initial){
      for(const key of ['x','y','z','yaw','vx','vy','vz','attachment','readyTick','guardSince','counterUntil','stunUntil','lastExertion','nextAI'])actor[key]=structuredClone(initial[key]);
      actor.mode='foot';actor.action=null;actor.guard=false;actor.rescue=null;actor.followBoard=null;actor.distressS=0;actor.downTick=null;
      syncAttachment(actor,next.combat,next,next.combat.config);
    }
  }
  if(old.army){
    const seed=createArmy(next,{playerCount:old.army.initial.friendly,enemyCount:old.army.initial.enemy,config:old.army.config});
    next.army=structuredClone(old.army);const army=next.army;
    army.tick=next.tick;army.riverConfig=next.config;army.waterY=next.readings.waterY;
    army.events=[];army.eventCounts={};army.journalPending=[];army.pathQueue=[];army.grid=new Map();army.intel={friendly:new Map(),enemy:new Map()};
    for(const person of army.people){
      if(person.team==='friendly'&&!lost(person.status)&&!safeBank(person)){person.status='missing';person.health=0;receipt.missingIds.push(person.id);person.history.push({tick:old.tick,type:'missing-after-failure'});}
      else if(person.team==='friendly'&&person.status==='downed')person.status='wounded';
      person.retired=person.team==='friendly'&&person.status!=='active';person.rescue=null;person.nextShot=next.tick;
      if(person.team==='enemy'&&person.status==='active'){const start=seed.byId.get(person.id);if(start){person.x=start.x;person.z=start.z;}}
    }
    army.byId=new Map(army.people.map(p=>[p.id,p]));army.squadById=new Map(army.squads.map(s=>[s.id,s]));
    for(const squad of army.squads){const initial=seed.squadById.get(squad.id);squad.path=[];squad.pathIndex=0;squad.pathPending=false;squad.order=squad.team==='enemy'?structuredClone(initial?.order||null):null;squad.status='holding';squad.report='Đã kết toán lượt trước';squad.lastOrderId=null;squad.lastProgressTick=next.tick;}
    // Jobs reserve their full cost up front. Return only that unused reserve;
    // cargo outside the rear recovery zone is lost, never teleported to stock.
    for(const job of army.jobs){const depot=army.depots.find(d=>d.id===job.depotId&&d.health>0);if(!job.done&&depot)depot.stock[job.resource]+=job.amount;}
    army.jobs=[];
    for(const convoy of army.convoys){if(convoy.amount>0){const entry={id:convoy.id,resource:convoy.resource,amount:convoy.amount};if(safeBank(convoy)){army.depots.find(d=>d.id==='rear').stock[convoy.resource]+=convoy.amount;receipt.returnedCargo.push(entry);}else receipt.lostCargo.push(entry);convoy.amount=0;convoy.status='delivered';convoy.path=[];convoy.pathPending=false;}}
    if(receipt.medicineCost)army.depots.find(d=>d.id==='rear').stock.medicine-=receipt.medicineCost;
  }
  next.combat.army=next.army||null;next.journalPending=[];next.combat.journalPending=[];
  next.campaignLedger.campaignHours=(old.campaignLedger.campaignHours||0)+receipt.campHours;
  next.campaignLedger.retries.push(receipt);updateReadings(next);
  const event={id:`${checkpoint.attemptId}:retry`,type:'AttemptRetried',tick:old.tick,data:receipt};
  return {checkpoint:captureGame(next,ids),projection:projectGame(next,ids.campaignId),events:[event],receipt};
}
