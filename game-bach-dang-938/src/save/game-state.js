// Convert live simulation state to a detached, versioned checkpoint. The
// adapter does not write storage or start/stop the simulation.
const inactive=new Set(['wounded','downed','dead','missing','captured']);
export function projectGame(state,campaignId){
  if(!state?.combat||typeof campaignId!=='string'||!campaignId)throw new Error('INVALID_GAME_STATE');
  const people=(state.army?.people||[]).map(p=>({id:p.id,kind:'soldier',team:p.team,squadId:p.squadId,status:p.status,health:p.health,wounds:p.wounds,ammo:p.ammo,history:structuredClone(p.history)}));
  for(const actor of state.combat.actors){
    const status=inactive.has(actor.mode)?actor.mode:'active';
    people.push({id:actor.id,kind:actor.kind,team:actor.team,status,health:actor.health,wounds:actor.wounds??(status==='active'?0:1),ammo:actor.ammo,weapon:actor.weapon});
  }
  const inventory={cargoKg:state.cargoKg,timber:state.timber};
  for(const depot of state.army?.depots||[])for(const [resource,quantity] of Object.entries(depot.stock))inventory[`depot:${depot.id}:${resource}`]=quantity;
  for(const convoy of state.army?.convoys||[])if(convoy.amount>0)inventory[`convoy:${convoy.id}:${convoy.resource}`]=convoy.amount;
  const army=state.army;
  return {schemaVersion:1,simVersion:'bd938-sim-1',configVersion:state.config.version,contentVersion:'bd938-sandbox-1',campaignId,
    selectedHeroId:state.heroId,chapter:{id:state.scenarioId,phase:state.combat.phase},roster:people,inventory,
    units:(army?.squads||[]).map(s=>({id:s.id,members:[...s.members],deployedAtStart:s.deployedAtStart})),
    equipment:state.combat.actors.map(a=>({actorId:a.id,weapon:a.weapon})),upgrades:structuredClone(state.campaignLedger?.upgrades||{}),missionResults:structuredClone(state.campaignLedger?.missionResults||[])};
}

export function captureGame(state,{campaignId,attemptId}){
  if(!campaignId||!attemptId)throw new Error('INVALID_SESSION_ID');
  const world=structuredClone(state),army=world.army;
  world.combat.army=null;
  if(army){
    army.pathQueue=army.pathQueue.map(q=>({entityId:q.entity.id,version:q.version}));
    army.byId=null;army.squadById=null;army.grid=null;
  }
  return {schemaVersion:1,simVersion:'bd938-sim-1',configVersion:state.config.version,contentVersion:'bd938-sandbox-1',campaignId,attemptId,tick:state.tick,world};
}

export function restoreGame(checkpoint,{riverVersion='bd938-river-lab-1'}={}){
  if(checkpoint?.schemaVersion!==1||checkpoint.simVersion!=='bd938-sim-1'||checkpoint.contentVersion!=='bd938-sandbox-1'||checkpoint.configVersion!==riverVersion||checkpoint.world?.config?.version!==riverVersion||checkpoint.tick!==checkpoint.world?.tick)throw new Error('UNSUPPORTED_CHECKPOINT');
  const world=structuredClone(checkpoint.world),army=world.army;
  if(army){
    army.byId=new Map(army.people.map(p=>[p.id,p]));army.squadById=new Map(army.squads.map(s=>[s.id,s]));army.grid=new Map();
    if(army.byId.size!==army.people.length||army.squadById.size!==army.squads.length)throw new Error('INVALID_CHECKPOINT_IDS');
    army.pathQueue=army.pathQueue.map(q=>{const entity=army.squadById.get(q.entityId)||army.convoys.find(c=>c.id===q.entityId);if(!entity)throw new Error('INVALID_CHECKPOINT_QUEUE');return {entity,version:q.version};});
    army.riverConfig=world.config;
  }
  world.combat.army=army||null;return world;
}

export function collectGameEvents(state,attemptId,knownIds=new Set()){
  const result=[];
  for(const e of [...(state.journalPending||state.events||[]),...(state.combat?.journalPending||state.combat?.events||[]),...(state.army?.journalPending||state.army?.events||[])]){
    const id=`${attemptId}:${e.id}`;if(knownIds.has(id))continue;
    result.push({id,type:e.type,tick:e.tick,data:structuredClone(e)});
  }
  return result;
}
