// Isolated state fixtures; these observations are not a naturally completed chapter.
import {createRiverState} from '../../../../game-bach-dang-938/src/sim/vessel.js';
import {createEncounter,stepEncounter,applyActorDamage} from '../../../../game-bach-dang-938/src/sim/encounter.js';
import {createArmy,stepArmy,issueArmyCommand,armySnapshot} from '../../../../game-bach-dang-938/src/sim/army.js';
import {captureGame,restoreGame} from '../../../../game-bach-dang-938/src/save/game-state.js';
export async function run(){
  const root='/game-bach-dang-938/data/';
  const riverConfig=await(await fetch(root+'river-config.json')).json();
  const characterConfig=await(await fetch(root+'character-config.json')).json();
  function fixture(){const s=createRiverState(riverConfig,{scenarioId:'combat'});s.combat=createEncounter(characterConfig,s,'H01');s.army=createArmy(s);s.combat.army=s.army;return s;}
  let s=fixture();
  for(const a of s.combat.actors.filter(a=>a.team==='enemy'))applyActorDamage(s.combat,a,10000,null,'audit-fixture');
  for(const p of s.army.people.filter(p=>p.team==='enemy')){p.status='dead';p.health=0;p.wounds++;}
  for(let i=0;i<600;i++){stepEncounter(s.combat,s,{});stepArmy(s.army,s);}
  const eliminated={remainingActorEnemies:s.combat.actors.filter(a=>a.team==='enemy'&&a.health>0).length,remainingSoldierEnemies:s.army.people.filter(p=>p.team==='enemy'&&p.status==='active').length,phase:s.combat.phase,ticks:s.tick};
  s=fixture();const squad=s.army.squads.find(s=>s.team==='friendly');
  const response=issueArmyCommand(s.army,{id:'audit-retreat',squadId:squad.id,type:'retreat',x:-30,z:52,lossThreshold:.4});
  for(let i=0;i<1500;i++){s.tick++;stepArmy(s.army,s);}
  const retreat={response,squad:armySnapshot(s.army).squads[0],missionPhase:s.combat.phase,missionResults:s.campaignLedger?.missionResults??null};
  // Camera is presentation-only. Save/reconstruct at a simulation boundary,
  // then compare authoritative soldiers after a further 240 ticks.
  s=fixture();for(let i=0;i<90;i++){stepEncounter(s.combat,s,{});stepArmy(s.army,s);}
  const checkpoint=captureGame(s,{campaignId:'audit',attemptId:'attempt-a'}), restored=restoreGame(checkpoint);
  const advance=w=>{for(let i=0;i<240;i++){stepEncounter(w.combat,w,{});stepArmy(w.army,w);}return JSON.stringify(armySnapshot(w.army));};
  const same=advance(s)===advance(restored);
  return {fixture:true,eliminated,retreat,restoreDeterministic:same,notes:'Near/far authoritative simulation modes do not exist in this build; renderer distance/detail is separate.'};
}

export async function renderConsistency(){
  const {loadScene}=await import('../../../../game-bach-dang-938/src/app/loader.js');
  const {encodeSave}=await import('../../../../game-bach-dang-938/src/save/repository.js');
  const scope=new AbortController(),loaded=await loadScene({signal:scope.signal,onProgress:()=>{}});
  const s=createRiverState(loaded.data.riverConfig,{scenarioId:'combat'});
  s.combat=createEncounter(loaded.data.characterConfig,s,'H01');s.army=createArmy(s,{playerCount:480,enemyCount:480});s.combat.army=s.army;
  s.army.people[0].health=0;s.army.people[0].status='dead';s.army.people[0].wounds=1;
  s.army.people[1].health=0;s.army.people[1].status='wounded';s.army.people[1].wounds=1;
  const fingerprint=()=>encodeSave(captureGame(s,{campaignId:'render-audit',attemptId:'render-attempt'}));
  const before=fingerprint(),host=document.createElement('div');host.style.cssText='position:fixed;inset:0;width:640px;height:360px';document.body.append(host);
  const results=[];
  try{for(const quality of ['economy','balanced','detailed']){
    const scene=loaded.createScene({host,data:loaded.data,quality,heroId:'H01',scope:new AbortController(),onContextLost:()=>{}});
    try{
      scene.render(s);scene.toggleCamera();scene.orbitBy(1.8);scene.zoomBy(-1000);scene.render(s);scene.zoomBy(2000);scene.render(s);
      results.push({quality,unchangedWorld:fingerprint()===before,people:s.army.people.length,deadStatus:s.army.people[0].status,woundedStatus:s.army.people[1].status,drawCalls:scene.stats().drawCalls,triangles:scene.stats().triangles});
    }finally{scene.dispose();}
  }}finally{host.remove();scope.abort();}
  return {results,note:'Different camera/quality render passes do not mutate simulation. There is no separate far-simulation algorithm to switch in this build.'};
}
