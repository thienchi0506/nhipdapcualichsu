import {createSaveController} from './controller.js';
import {restoreGame,projectGame} from './game-state.js';
import {encodeSave} from './repository.js';
import {buildFailedRetry} from './retry.js';

// Explicitly invoked by the game UI. Guest saves never silently merge into a
// Firebase account. Caller owns repository lifetime and account selection.
export async function preparePersistedSession({repository,scope,slot='main',owner,bridge=null,onStatus,onAccountChange}){
  const controller=await createSaveController({repository,scope,slot,owner,bridge,onStatus,onAccountChange});
  try{
    if(scope.kind==='firebase'){
      let remote;
      try{remote=await bridge.cloud.read(scope.id,slot);}catch(error){if(!controller.saved)throw new Error(`REMOTE_STATE_UNAVAILABLE:${error.message}`);remote=undefined;}
      if(bridge.currentUid()!==scope.id)throw new Error('AUTH_SCOPE_MISMATCH');
      const pending=await repository.pending(scope,slot),local=controller.saved;
      if(remote!==undefined){
        if(pending&&((remote?.revision||0)!==pending.baseCloudRevision)&&remote?.syncId!==pending.syncId)throw new Error('CLOUD_CONFLICT');
        if(!pending&&local?.cloudRevision&&!remote)throw new Error('CLOUD_MISSING');
        if(!pending&&remote)await controller.importCloud(remote);
      }
    }
    const saved=controller.saved,checkpoint=saved?.checkpoint||null;
    if(checkpoint){
      const world=restoreGame(checkpoint);
      if(checkpoint.campaignId!==saved.projection.campaignId||encodeSave(projectGame(world,checkpoint.campaignId))!==encodeSave(saved.projection))throw new Error('CHECKPOINT_PROJECTION_MISMATCH');
    }
    const campaignId=checkpoint?.campaignId||`campaign-${crypto.randomUUID()}`,attemptId=checkpoint?.attemptId||`attempt-${crypto.randomUUID()}`;
    const events=await repository.events(scope,slot);
    return {campaignId,attemptId,checkpoint,eventIds:events.map(e=>e.id),commit:args=>controller.commit(args),
      previewRetry(){const current=controller.saved;if(!current)throw new Error('NO_CHECKPOINT');return buildFailedRetry(current.checkpoint,`attempt-${crypto.randomUUID()}`).receipt;},
      async retryFailedAttempt(){
        const current=controller.saved;if(!current)throw new Error('NO_CHECKPOINT');
        const prepared=buildFailedRetry(current.checkpoint,`attempt-${crypto.randomUUID()}`);
        await controller.commit({batchId:crypto.randomUUID(),projection:prepared.projection,checkpoint:prepared.checkpoint,events:prepared.events});
        return prepared.receipt;
      },
      synchronize:()=>controller.synchronize(),exportLocal:()=>controller.exportLocal(),close:()=>controller.close(),controller};
  }catch(error){await controller.close();throw error;}
}
