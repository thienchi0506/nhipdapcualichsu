import { syncPending,encodeSave } from './repository.js';

// Coordinates durable writes and throttled account sync. The simulation owns
// the commit barrier and publishes candidate state only after acknowledgement.
export async function createSaveController({repository,scope,slot,owner,bridge=null,onStatus=()=>{},onAccountChange=()=>{},syncDelayMs=30000}) {
  if(scope.kind==='firebase'&&bridge?.currentUid()!==scope.id)throw new Error('AUTH_SCOPE_MISMATCH');
  let lease=await repository.acquire(scope,slot,owner),closed=false,busy=false,conflicted=false,syncBlocked=false,timer=null,syncing=null;
  if(!lease.ok)throw new Error('SLOT_IN_USE');
  let current;
  try{current=await repository.read(scope,slot);}catch(error){await repository.release(scope,slot,owner,lease.epoch);throw error;}
  let status='local',lastSyncError='';
  function update(next,detail=''){status=next;if(!closed)onStatus({status:next,detail,revision:current?.revision||0});}
  async function synchronize(){
    if(closed||scope.kind!=='firebase'||!bridge)return {status:'local'};
    if(bridge.currentUid()!==scope.id){update('local','Phiên tài khoản đã đổi; dữ liệu chờ vẫn được giữ trên máy.');return {status:'auth-changed'};}
    if(syncing)return syncing;
    syncing=(async()=>{try{const result=await syncPending({repository,scope,slot,getCurrentUid:bridge.currentUid,cloud:bridge.cloud});
      if(result.status==='conflict'){conflicted=true;if(timer){clearTimeout(timer);timer=null;}}
      if(result.status==='synced'){syncBlocked=false;lastSyncError='';}
      update(result.status==='synced'?'synced':result.status==='conflict'?'conflict':'local',result.status==='conflict'?'Hai thiết bị có thay đổi khác nhau; cả hai bản được giữ lại.':'');return result;
    }catch(error){
      syncBlocked=['CLOUD_PAYLOAD_TOO_LARGE','CLOUD_JOURNAL_TOO_LARGE','SAVE_TOO_LARGE','SYNC_ID_REUSED','INVALID_SYNC_ID','LOCAL_CHECKSUM_MISMATCH','CLOUD_CHECKSUM_MISMATCH'].includes(error.message)||['permission-denied','firestore/permission-denied'].includes(error.code||error.message);
      lastSyncError=`Đã giữ bản lưu trên thiết bị; chưa đồng bộ: ${error.message}`;
      update(syncBlocked?'failed':'local',lastSyncError);
      if(!syncBlocked)schedule();return {status:syncBlocked?'failed':'pending',error:error.message};
    }finally{syncing=null;}})();
    return syncing;
  }
  function schedule(){if(closed||conflicted||syncBlocked||scope.kind!=='firebase'||!bridge||timer)return;timer=setTimeout(()=>{timer=null;void synchronize();},syncDelayMs);}
  const unsubscribe=bridge?.onAuthChanged?.(uid=>{if(!closed&&scope.kind==='firebase'){if(uid!==scope.id){update('local','Phiên tài khoản đã đổi; dữ liệu chờ vẫn được giữ trên máy.');onAccountChange(uid);}else schedule();}});
  if(await repository.pending(scope,slot))schedule();
  return {
    get status(){return status;},
    get revision(){return current?.revision||0;},
    get saved(){return current?structuredClone(current):null;},
    async exportLocal(){const record=await repository.read(scope,slot),outbox=await repository.pending(scope,slot),journal=await repository.events(scope,slot);return encodeSave({schemaVersion:1,scope,slot,record,outbox,journal});},
    async importCloud(document){
      if(closed||busy)throw new Error('SAVE_IN_PROGRESS');if(scope.kind!=='firebase'||bridge?.currentUid()!==scope.id)throw new Error('AUTH_SCOPE_MISMATCH');
      busy=true;update('saving');
      try{const renewed=await repository.acquire(scope,slot,owner);if(!renewed.ok)throw new Error('SLOT_IN_USE');lease=renewed;
        current=await repository.importCloud({scope,slot,owner,epoch:lease.epoch,document});update('synced');return structuredClone(current);
      }catch(error){update('failed',error.message);throw error;}finally{busy=false;}
    },
    async commit({batchId,projection,checkpoint,events}){
      if(closed)throw new Error('CONTROLLER_CLOSED');if(busy)throw new Error('SAVE_IN_PROGRESS');
      if(scope.kind==='firebase'&&bridge?.currentUid()!==scope.id){update('failed','Phiên tài khoản đã đổi.');throw new Error('AUTH_SCOPE_MISMATCH');}
      busy=true;update('saving');
      try{
        const renewed=await repository.acquire(scope,slot,owner);if(!renewed.ok)throw new Error('SLOT_IN_USE');lease=renewed;
        const result=await repository.commit({scope,slot,owner,epoch:lease.epoch,expectedRevision:current?.revision||0,batchId,projection,checkpoint,events});
        current=await repository.read(scope,slot);update(syncBlocked?'failed':'local',syncBlocked?lastSyncError:'Đã lưu trên thiết bị.');schedule();return result;
      }catch(error){update('failed',error.message);throw error;}finally{busy=false;}
    },
    synchronize,
    async close(){if(closed)return;if(busy)throw new Error('SAVE_IN_PROGRESS');closed=true;if(timer)clearTimeout(timer);unsubscribe?.();await repository.release(scope,slot,owner,lease.epoch);},
  };
}
