import {openSaveRepository,encodeSave} from '../src/save/repository.js';
import {preparePersistedSession} from '../src/save/prepare-session.js';
import {projectGame,captureGame,restoreGame,collectGameEvents} from '../src/save/game-state.js';
import {recordFailedAttempt} from '../src/save/attempt-resolution.js';
import {buildFailedRetry} from '../src/save/retry.js';
import {createRiverState} from '../src/sim/vessel.js';
import {createEncounter} from '../src/sim/encounter.js';
import {createArmy} from '../src/sim/army.js';

export async function runRetryTests(){
  const checks=[],check=(name,passed,evidence)=>checks.push({name,passed:!!passed,evidence});
  const reject=async(fn,code)=>{try{await fn();return false;}catch(e){return e.message===code;}};
  const name=`bd938-retry-${crypto.randomUUID()}`,repo=await openSaveRepository({name}),scope={kind:'guest',id:'retry-fixture'};
  let handle;
  try{
    const river=await(await fetch(new URL('../data/river-config.json',import.meta.url))).json(),character=await(await fetch(new URL('../data/character-config.json',import.meta.url))).json();
    let world=createRiverState(river,{scenarioId:'combat'});world.combat=createEncounter(character,world,'H01');world.army=createArmy(world,{playerCount:10,enemyCount:10});world.combat.army=world.army;
    world.journalPending=[];world.combat.journalPending=[];world.army.journalPending=[];world.cargoKg=0;world.timber=33;world.floodKg=45;world.components.hull=62;
    const people=world.army.people.filter(p=>p.team==='friendly'),deadId=people[0].id,missingId=people[1].id,survivorId=people[2].id;
    for(const p of people){p.x=-30;p.z=55;}
    people[0].status='dead';people[0].health=0;people[0].wounds=1;people[1].x=-30;people[1].z=-30;people[2].ammo=9;
    world.combat.actors.find(a=>a.id==='R01').mode='dead';world.combat.actors.find(a=>a.id==='R01').health=0;
    world.combat.actors.find(a=>a.id==='R02').mode='downed';world.combat.actors.find(a=>a.id==='R02').health=0;
    const hero=world.combat.actors.find(a=>a.id==='H01');hero.ammo=17;
    const rear=world.army.depots.find(d=>d.id==='rear');rear.stock.medicine=8;rear.stock.ammo=80;rear.stock.timber=10;
    world.army.jobs=[{id:'reserved-work',squadId:'T-001',type:'repair',depotId:'rear',resource:'timber',amount:2,remaining:90}];
    world.army.convoys=[{id:'safe-cargo',x:-30,z:56,resource:'ammo',amount:7,status:'moving',path:[],pathPending:false},{id:'lost-cargo',x:-29,z:12,resource:'timber',amount:3,status:'moving',path:[],pathPending:false}];
    handle=await preparePersistedSession({repository:repo,scope,owner:'retry-tab'});
    let attemptId='attempt-fixture';
    const fail=async()=>{
      world.combat.phase='failed_command';world.tick+=30;world.combat.tick=world.tick;world.army.tick=world.tick;
      const hero=world.combat.actors.find(a=>a.id==='H01');hero.health=0;hero.mode='wounded';hero.wounds=(hero.wounds||0)+1;
      world.journalPending=[];world.combat.journalPending=[];world.army.journalPending=[];
      recordFailedAttempt(world,{campaignId:'campaign-retry',attemptId});
      await handle.controller.commit({batchId:crypto.randomUUID(),projection:projectGame(world,'campaign-retry'),checkpoint:captureGame(world,{campaignId:'campaign-retry',attemptId}),events:collectGameEvents(world,attemptId)});
    };
    await fail();
    const before=handle.controller.saved,valid=buildFailedRetry(before.checkpoint,'attempt-tamper'),forged=structuredClone(valid.projection);forged.inventory.cargoKg=600;
    check('Retry transaction rejects free cargo even with a retry event',await reject(()=>handle.controller.commit({batchId:'forged-retry',projection:forged,checkpoint:valid.checkpoint,events:valid.events}),'INVALID_RETRY_BATCH')&&handle.controller.revision===before.revision);
    let allDeaths=true,allAmmo=true,allKits=true,allWounds=true;
    for(let i=0;i<5;i++){
      const preview=handle.previewRetry(),receipt=await handle.retryFailedAttempt(),saved=handle.controller.saved;world=restoreGame(saved.checkpoint);attemptId=saved.checkpoint.attemptId;
      const hero=world.combat.actors.find(a=>a.id==='H01'),stock=world.army.depots.find(d=>d.id==='rear').stock;
      allDeaths&&=world.army.byId.get(deadId).status==='dead'&&world.army.byId.get(missingId).status==='missing'&&world.combat.actors.find(a=>a.id==='R01').mode==='dead';
      allAmmo&&=hero.ammo===17&&world.army.byId.get(survivorId).ammo===9&&world.cargoKg===0&&world.timber===33&&world.floodKg===45&&world.components.hull===62;
      allKits&&=stock.medicine===7-i&&stock.ammo===87&&stock.timber===12&&receipt.medicineCost===preview.medicineCost;
      allWounds&&=hero.health===70&&hero.stamina===85&&hero.wounds===i+1&&world.campaignLedger.campaignHours===6*(i+1);
      if(i<4)await fail();
    }
    check('Five real retry transactions preserve dead and missing soldier IDs',allDeaths);
    check('Five retries do not refill arrows, cargo or boat condition',allAmmo);
    check('Medicine, returned cargo and unused job reserve settle exactly once',allKits);
    check('Main character treatment preserves wounds and campaign time',allWounds);
    check('Retry cannot run again on an already active attempt',await reject(()=>handle.retryFailedAttempt(),'ATTEMPT_NOT_SETTLED')&&handle.controller.saved.checkpoint.world.campaignLedger.retries.length===5);
    const savedTick=world.tick;await handle.close();handle=null;
    handle=await preparePersistedSession({repository:repo,scope,owner:'reopen-tab'});
    check('Reopening reconstructs the fifth retry with the same casualties',handle.checkpoint.tick===savedTick&&restoreGame(handle.checkpoint).army.byId.get(deadId).status==='dead'&&handle.controller.saved.projection.missionResults.length===5);
    const exhausted=restoreGame(handle.checkpoint);exhausted.combat.phase='failed_command';exhausted.combat.actors.find(a=>a.id==='H01').mode='wounded';exhausted.combat.actors.find(a=>a.id==='H01').health=0;exhausted.army.depots.find(d=>d.id==='rear').stock.medicine=0;exhausted.journalPending=[];
    recordFailedAttempt(exhausted,{campaignId:'campaign-retry',attemptId:handle.attemptId});
    const exhaustedCheckpoint=captureGame(exhausted,{campaignId:'campaign-retry',attemptId:handle.attemptId});
    const slow=buildFailedRetry(exhaustedCheckpoint,'attempt-no-kit');
    check('Without medicine treatment costs campaign time without negative stock',slow.receipt.medicineCost===0&&slow.receipt.campHours===12&&slow.checkpoint.world.army.depots.find(d=>d.id==='rear').stock.medicine===0);
    const beforeData=encodeSave(handle.controller.saved);
    const trapped=structuredClone(exhaustedCheckpoint);trapped.world.stuck={kind:'stake'};
    check('A trapped boat cannot be teleported to safety by retry',await reject(async()=>buildFailedRetry(trapped,'attempt-trapped'),'BOAT_NOT_RECOVERABLE'));
    const outside=structuredClone(exhaustedCheckpoint),outsideHero=outside.world.combat.actors.find(a=>a.id==='H01');outsideHero.attachment=null;outsideHero.x=30;outsideHero.z=-60;
    check('An unrecovered hero cannot teleport to camp',await reject(async()=>buildFailedRetry(outside,'attempt-outside'),'HERO_NOT_RECOVERABLE'));
    check('Rejected retry plans leave the committed save unchanged',encodeSave(handle.controller.saved)===beforeData);
  }finally{await handle?.close();repo.close();indexedDB.deleteDatabase(name);}
  return {checks,passed:checks.filter(c=>c.passed).length,total:checks.length};
}
