// Settlement starts by recording an outcome alongside the simulation state.
// Recovery, evacuation and retry allocation are separate operations; this
// function does not restore people, replenish inventory or award anything.
export function recordFailedAttempt(state,{campaignId,attemptId}){
  if(state?.combat?.phase!=='failed_command')return false;
  if(!campaignId||!attemptId||!Number.isSafeInteger(state.tick)||state.tick<0)throw new Error('INVALID_ATTEMPT_RESOLUTION');
  if(!Array.isArray(state.journalPending))throw new Error('JOURNAL_NOT_INITIALIZED');
  const ledger=state.campaignLedger||(state.campaignLedger={chapterInstanceId:`${campaignId}:${state.scenarioId}`,missionResults:[]});
  if(typeof ledger.chapterInstanceId!=='string'||!Array.isArray(ledger.missionResults))throw new Error('INVALID_CAMPAIGN_LEDGER');
  const existing=ledger.missionResults.find(result=>result.attemptId===attemptId);
  if(existing){
    if(existing.outcome!=='failed_command'||existing.chapterInstanceId!==ledger.chapterInstanceId)throw new Error('ATTEMPT_ALREADY_RESOLVED');
    return false;
  }
  const result={chapterInstanceId:ledger.chapterInstanceId,attemptId,outcome:'failed_command',tick:state.tick};
  ledger.missionResults.push(result);
  state.journalPending.push({id:'attempt-resolution',type:'AttemptResolved',tick:state.tick,...result});
  return true;
}
