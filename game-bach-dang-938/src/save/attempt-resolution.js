// Settlement starts by recording an outcome alongside the simulation state.
// Recovery, evacuation and retry allocation are separate operations; this
// function does not restore people, replenish inventory or award anything.
export const VALID_OUTCOMES = Object.freeze(new Set(['failed_command', 'victory', 'tactical_retreat']));

export function recordAttemptResolution(state, {campaignId, attemptId}, outcome = state?.combat?.phase) {
  if (!VALID_OUTCOMES.has(outcome)) return false;
  if (!campaignId || !attemptId || !Number.isSafeInteger(state.tick) || state.tick < 0) throw new Error('INVALID_ATTEMPT_RESOLUTION');
  if (!Array.isArray(state.journalPending)) throw new Error('JOURNAL_NOT_INITIALIZED');
  const ledger = state.campaignLedger || (state.campaignLedger = {chapterInstanceId: `${campaignId}:${state.scenarioId}`, missionResults: []});
  if (typeof ledger.chapterInstanceId !== 'string' || !Array.isArray(ledger.missionResults)) throw new Error('INVALID_CAMPAIGN_LEDGER');
  const existing = ledger.missionResults.find(result => result.attemptId === attemptId);
  if (existing) {
    if (existing.outcome !== outcome || existing.chapterInstanceId !== ledger.chapterInstanceId) throw new Error('ATTEMPT_ALREADY_RESOLVED');
    return false;
  }
  const result = {chapterInstanceId: ledger.chapterInstanceId, attemptId, outcome, tick: state.tick};
  ledger.missionResults.push(result);
  state.journalPending.push({id: 'attempt-resolution', type: 'AttemptResolved', tick: state.tick, ...result});
  return true;
}

export function recordFailedAttempt(state, options) {
  if (state?.combat?.phase !== 'failed_command') return false;
  return recordAttemptResolution(state, options, 'failed_command');
}
