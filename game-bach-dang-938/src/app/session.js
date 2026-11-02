import { createRiverState, riverSnapshot } from '../sim/vessel.js';
import { createFixedClock, frameDelta } from '../core/clock.js';
import { createInput } from './input.js';
import { metrics, listen } from './diagnostics.js';
import { createEncounter, stepEncounter, encounterSnapshot, applyActorDamage } from '../sim/encounter.js';
import { createArmy, stepArmy, armySnapshot, issueArmyCommand, queueConvoy, queueArmyJob, bridgeArmyCombat, observeCommander } from '../sim/army.js';
import { projectGame,captureGame,restoreGame,collectGameEvents } from '../save/game-state.js';
import { encodeSave } from '../save/repository.js';
import { recordFailedAttempt } from '../save/attempt-resolution.js';

export function createSession({ root, scene, data, heroId, vesselType = 'light', scenarioId = 'harbor', persistence = null, onPause, onCamera, onClock, onStatus = () => {}, onOutcome = () => {}, onFault = () => {} }) {
  const scope = new AbortController();
  const config = data.riverConfig;
  let state;
  if(persistence?.checkpoint)state=restoreGame(persistence.checkpoint,{riverVersion:config.version});
  else{state=createRiverState(config,{heroId,vesselType,scenarioId});state.combat=createEncounter(data.characterConfig,state,heroId);state.army=scenarioId==='combat'?createArmy(state):null;state.combat.army=state.army;}
  let previous={...state};
  if(persistence){state.journalPending=[];state.combat.journalPending=[];if(state.army)state.army.journalPending=[];}
  let disposed = false, running = false, saving=false, pendingSave=null, raf = 0, lastTime = null, frames = 0, lastSecond = -1, actionSequence = 0, backlogMs = 0;
  let committedCheckpoint=persistence?.checkpoint||null,committedFingerprint=persistence?encodeSave(projectGame(state,persistence.campaignId)):null;
  const knownEvents=new Set(persistence?.eventIds||[]);
  const pending = [];
  const inputSession=crypto.randomUUID();
  const clock = createFixedClock(config.tickHz, config.maxCatchUpTicks);
  metrics.sessionsCreated++;
  function action(type,payload={}) {
    if(!running)return;
    if(type==='contextJump')type=state.combat.helm?'anchor':'jump';
    if(type==='contextF')type=state.combat.helm?'recover':'weapon';
    pending.push({id:`action:${inputSession}:${++actionSequence}`,type,epoch:state.combat.controlEpoch,...payload});
  }
  const input = createInput({ scope, canvas: scene.canvas, root, enabled: () => running&&!state.combat.mapOpen, onCamera, onPause, onAction: action,onOrbit:scene.orbitBy,onZoom:scene.zoomBy,onPick:scene.pick,movementYaw:scene.movementYaw });
  function scheduleFrame(){if(running&&!disposed&&!raf)raf=requestAnimationFrame(frame);}
  async function persistTick(){
    saving=true;
    try{
      const projection=projectGame(state,persistence.campaignId),checkpoint=captureGame(state,persistence),events=collectGameEvents(state,persistence.attemptId,knownEvents),batchId=crypto.randomUUID();
      pendingSave=persistence.commit({batchId,projection,checkpoint,events});await pendingSave;
      if(disposed)return true;
      for(const event of events)knownEvents.add(event.id);
      state.journalPending=[];state.combat.journalPending=[];if(state.army)state.army.journalPending=[];
      committedCheckpoint=checkpoint;committedFingerprint=encodeSave(projection);return true;
    }catch(error){
      if(disposed)return false;
      if(committedCheckpoint){state=restoreGame(committedCheckpoint,{riverVersion:config.version});state.journalPending=[];state.combat.journalPending=[];if(state.army)state.army.journalPending=[];previous={...state};}
      if(running){running=false;metrics.activeLoops--;}input.clear();pending.length=0;onFault(error);return false;
    }finally{saving=false;pendingSave=null;lastTime=null;}
  }
  async function frame(now) {
    raf=0;
    if (!running || disposed) return;
    const elapsed = frameDelta(now, lastTime); lastTime = now;
    let result,needsSave=false;
    try { result = clock.advance(elapsed, () => {
      previous = { ...state };
      const actions=pending.splice(0),oldEpoch=state.combat.controlEpoch,oldHelm=state.combat.helm,oldMap=state.combat.mapOpen;
      const riverActions=actions.filter(a=>['anchor','recover','repair','pump','unload'].includes(a.type));
      const armyActions=actions.filter(a=>a.type.startsWith('army-'));
      if(state.army)for(const a of armyActions){let result;
        if(a.type==='army-order')result=issueArmyCommand(state.army,{...a,type:a.orderType});
        else if(a.type==='army-cancel')result=issueArmyCommand(state.army,{...a,type:'cancel'});
        else if(a.type==='army-convoy')result=queueConvoy(state.army,a.id,'rear','forward',a.resource,a.amount);
        else if(a.type==='army-job')result=queueArmyJob(state.army,a.id,a.squadId,a.jobType);
        if(result)state.army.feedback=result.ok?'Đã nhận lệnh.':result.reason;
      }
      stepEncounter(state.combat,state,{...input.read(),actions:actions.filter(a=>!riverActions.includes(a)&&!armyActions.includes(a)),riverActions});
      if(state.army&&state.combat.phase==='active'){stepArmy(state.army,state);observeCommander(state.army,state.combat.actors.find(a=>a.id===state.combat.controlledId));bridgeArmyCombat(state.army,state.combat,applyActorDamage);}
      if(persistence)recordFailedAttempt(state,persistence);
      if(oldEpoch!==state.combat.controlEpoch||oldHelm!==state.combat.helm||oldMap!==state.combat.mapOpen){input.clear();pending.length=0;}
      if(persistence&&(state.tick%150===0||state.journalPending.length||state.combat.journalPending.length||state.army?.journalPending.length||encodeSave(projectGame(state,persistence.campaignId))!==committedFingerprint)){needsSave=true;return false;}
    });
    backlogMs = result.backlogMs;
    // A restored terminal checkpoint may be rendered before the clock advances
    // its first tick; settle it before publishing an outcome in that case too.
    if(persistence&&recordFailedAttempt(state,persistence))needsSave=true;
    if(needsSave&&!(await persistTick()))return;
    if(disposed)return;
    scene.render(state, previous, result.alpha); frames++;
    if (result.ticks > 0 && state.tick % (config.tickHz / config.hudHz) < result.ticks) onStatus(riverSnapshot(state), backlogMs,encounterSnapshot(state.combat),state.army?armySnapshot(state.army):null);
    const second = Math.floor((state.tick-(state.campaignLedger?.attemptStartTick||0)) / config.tickHz);
    if (second !== lastSecond) { onClock(second); lastSecond = second; }
    if(state.combat.phase!=='active'){pause();onOutcome(encounterSnapshot(state.combat));return;}
    scheduleFrame();
    } catch(error) { if(running){running=false;metrics.activeLoops--;}cancelAnimationFrame(raf);input.clear();pending.length=0;onFault(error); }
  }
  function pause({flush=true}={}) {
    if (running) { running = false; cancelAnimationFrame(raf); raf = 0; metrics.activeLoops--; }
    input.clear(); pending.length = 0; scene.releaseControls(); if(!saving)scene.render(state);
    if(flush&&persistence&&committedCheckpoint&&!disposed&&!saving&&state.tick!==committedCheckpoint.tick)void persistTick();
  }
  listen(scope, window, 'blur', () => { if (running) onPause('focusLost'); });
  listen(scope, document, 'visibilitychange', () => { if (document.hidden && running) onPause('hidden'); });
  scene.render(state);
  onStatus(riverSnapshot(state), 0,encounterSnapshot(state.combat),state.army?armySnapshot(state.army):null);
  return {
    start() { if (disposed || running) return; running = true; input.clear(); clock.reset(); lastTime = null; metrics.activeLoops++; scene.canvas.focus({ preventScroll: true });
      if(saving){void Promise.resolve(pendingSave).then(scheduleFrame,()=>{});return;}
      if(persistence&&!committedCheckpoint){void persistTick().then(ok=>{if(ok)scheduleFrame();});}else scheduleFrame(); },
    action,
    focus(){if(running&&!state.combat.mapOpen)scene.canvas.focus({preventScroll:true});},
    pause,
    async whenSaved(){if(pendingSave)await pendingSave;},
    async retryFailedAttempt(){
      if(!persistence?.retryFailedAttempt||disposed)throw new Error('RETRY_UNAVAILABLE');
      pause();await this.whenSaved();saving=true;
      try{pendingSave=persistence.retryFailedAttempt();return await pendingSave;}finally{pendingSave=null;saving=false;}
    },
    toggleCamera() { const mode = scene.toggleCamera(); scene.canvas.focus({ preventScroll: true }); return mode; },
    snapshot() {
      const visible=disposed?null:saving&&committedCheckpoint?restoreGame(committedCheckpoint,{riverVersion:config.version}):state;
      return { running, disposed, saving, tick: visible?.tick ?? 0, seconds: Math.floor(((visible?.tick ?? 0)-(visible?.campaignLedger?.attemptStartTick||0)) / config.tickHz), x: visible?.x, z: visible?.z, heroId, frames, backlogMs, river: visible ? riverSnapshot(visible) : null,combat:visible?encounterSnapshot(visible.combat):null,army:visible?.army?armySnapshot(visible.army):null,scene: disposed ? null : scene.stats() };
    },
    dispose() { if (disposed) return; pause({flush:false}); disposed = true; scope.abort(); scene.dispose(); state = null; previous = null; metrics.sessionsDisposed++; },
  };
}
