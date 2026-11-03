// Isolated persistence foundation. A slot is always scoped to one principal.
import {buildFailedRetry} from './retry.js';
import {restoreGame,projectGame} from './game-state.js';
const DB_NAME='dcls.bd938.saves.v1', DB_VERSION=1;
export const MAX_CHECKPOINT_BYTES=8000000,MAX_CLOUD_BYTES=16000000,MAX_JOURNAL_EVENTS=100000;
const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||new Error('Transaction aborted'));tx.onerror=()=>{};});
const validSlot=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(value);
function identity(scope,slot){
  if(!scope||!['firebase','guest'].includes(scope.kind)||typeof scope.id!=='string'||!scope.id||scope.id.length>128||!validSlot(slot))throw new Error('INVALID_SCOPE');
  return JSON.stringify([scope.kind,scope.id,slot]);
}
function stable(value){
  if(value instanceof Map)return {$map:[...value].map(([k,v])=>[stable(k),stable(v)])};
  if(value instanceof Set)return {$set:[...value].map(stable)};
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object'){const result={};for(const k of Object.keys(value).sort())result[k]=stable(value[k]);return result;}
  if(typeof value==='number'&&!Number.isFinite(value))throw new Error('NONFINITE_VALUE');
  if(['undefined','function','symbol','bigint'].includes(typeof value))throw new Error('INVALID_VALUE');
  return value;
}
export function encodeSave(value){return JSON.stringify(stable(value));}
export function decodeSave(payload){return JSON.parse(payload,(_key,v)=>{
  if(v&&typeof v==='object'&&Object.keys(v).length===1&&Array.isArray(v.$map))return new Map(v.$map);
  if(v&&typeof v==='object'&&Object.keys(v).length===1&&Array.isArray(v.$set))return new Set(v.$set);
  return v;
});}
async function hash(value){const bytes=new TextEncoder().encode(value),digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function validateGameCheckpoint(projection,checkpoint){
  // Repository fixtures may store small generic checkpoints. Real simulation
  // bundles must pass semantic validation before replacing any durable head.
  if(checkpoint?.world===undefined&&checkpoint?.simVersion===undefined)return;
  const state=restoreGame(checkpoint);
  if(checkpoint.campaignId!==projection.campaignId||encodeSave(projectGame(state,checkpoint.campaignId))!==encodeSave(projection))throw new Error('CHECKPOINT_PROJECTION_MISMATCH');
}
function recoveryChain(previous,checkpoint,events){
  const recovered=new Set();if(!previous?.checkpoint||previous.checkpoint.attemptId===checkpoint?.attemptId)return recovered;
  const receipts=checkpoint?.world?.campaignLedger?.retries||[];let attempt=previous.checkpoint.attemptId;
  for(let n=0;n<receipts.length;n++){
    const receipt=receipts.find(r=>r.previousAttemptId===attempt);if(!receipt)return new Set();
    if(!events.some(e=>e.id===`${attempt}:retry`&&e.type==='AttemptRetried'&&encodeSave(e.data)===encodeSave(receipt)))return new Set();
    recovered.add(receipt.recoveredHeroId);attempt=receipt.newAttemptId;
    if(attempt===checkpoint.attemptId)return recovered;
  }return new Set();
}
function validateProjection(projection,previous,recovered=new Set()){
  if(!projection||projection.schemaVersion!==1||typeof projection.campaignId!=='string'||!projection.campaignId||!Array.isArray(projection.roster))throw new Error('INVALID_PROJECTION');
  if(previous&&previous.campaignId!==projection.campaignId)throw new Error('CAMPAIGN_MISMATCH');
  const ids=new Set();
  for(const unit of projection.roster){if(!unit||typeof unit.id!=='string'||!unit.id||ids.has(unit.id)||!['active','downed','wounded','dead','missing','captured'].includes(unit.status)||!Number.isFinite(unit.health)||unit.health<0||!Number.isInteger(unit.wounds)||unit.wounds<0)throw new Error('INVALID_ROSTER');ids.add(unit.id);}
  const current=new Map(projection.roster.map(p=>[p.id,p]));
  for(const old of previous?.roster||[]){
    const now=current.get(old.id);
    if(!now)throw new Error('ROSTER_ENTRY_REMOVED');
    if(old.status==='dead'&&now.status!=='dead')throw new Error('DEATH_ROLLBACK');
    // Only the verified camp transaction can return the main character to
    // duty. Wound history and every other person's casualty state remain.
    if(now.wounds<old.wounds||(['downed','wounded'].includes(old.status)&&now.status==='active'&&!(old.kind==='mainHero'&&recovered.has(old.id))))throw new Error('INJURY_ROLLBACK');
    // Missing and captured personnel cannot silently reappear either. A future
    // recovery operation must explicitly validate and record that transition.
    if(['missing','captured'].includes(old.status)&&now.status!==old.status&&now.status!=='dead')throw new Error('PERSONNEL_ROLLBACK');
  }
  for(const amount of Object.values(projection.inventory||{}))if(!Number.isFinite(amount)||amount<0)throw new Error('INVALID_INVENTORY');
  if(projection.missionResults!==undefined&&!Array.isArray(projection.missionResults))throw new Error('INVALID_MISSION_RESULTS');
  const results=new Map();
  const validOutcomes=new Set(['failed_command','victory','tactical_retreat']);
  for(const result of projection.missionResults||[]){
    if(!result||typeof result.attemptId!=='string'||!result.attemptId||typeof result.chapterInstanceId!=='string'||!result.chapterInstanceId||!validOutcomes.has(result.outcome)||!Number.isSafeInteger(result.tick)||result.tick<0||results.has(result.attemptId))throw new Error('INVALID_MISSION_RESULTS');
    results.set(result.attemptId,encodeSave(result));
  }
  for(const result of previous?.missionResults||[])if(results.get(result.attemptId)!==encodeSave(result))throw new Error('MISSION_RESULT_ROLLBACK');
}

export async function openSaveRepository({name=DB_NAME, leaseMs=15000}={}){
  const open=indexedDB.open(name,DB_VERSION);
  open.onupgradeneeded=()=>{const db=open.result;for(const store of ['slots','events','leases','batches','outbox'])if(!db.objectStoreNames.contains(store))db.createObjectStore(store);};
  const db=await request(open);db.onversionchange=()=>db.close();
  async function acquire(scope,slot,owner,now=Date.now()){
    const key=identity(scope,slot);if(!validSlot(owner)||!Number.isFinite(now))throw new Error('INVALID_LEASE');
    const tx=db.transaction(['leases'],'readwrite'),end=done(tx),store=tx.objectStore('leases'),old=await request(store.get(key));
    if(old&&old.owner!==owner&&old.expiresAt>now){await end;return {ok:false,expiresAt:old.expiresAt};}
    const next={owner,epoch:old?(old.owner===owner&&old.expiresAt>now?old.epoch:old.epoch+1):1,expiresAt:now+leaseMs};store.put(next,key);await end;return {ok:true,...next};
  }
  async function release(scope,slot,owner,epoch){
    const key=identity(scope,slot),tx=db.transaction(['leases'],'readwrite'),end=done(tx),s=tx.objectStore('leases'),old=await request(s.get(key));
    if(old?.owner===owner&&old.epoch===epoch){old.expiresAt=0;s.put(old,key);}await end;
  }
  async function read(scope,slot){
    const key=identity(scope,slot),tx=db.transaction(['slots'],'readonly'),end=done(tx),value=await request(tx.objectStore('slots').get(key));await end;
    if(value&&(value.payload!==encodeSave({schemaVersion:1,projection:value.projection,checkpoint:value.checkpoint})||await hash(value.payload)!==value.payloadHash))throw new Error('LOCAL_CHECKSUM_MISMATCH');
    return value||null;
  }
  async function pending(scope,slot){const key=identity(scope,slot),tx=db.transaction(['outbox'],'readonly'),end=done(tx),value=await request(tx.objectStore('outbox').get(key));await end;return value||null;}
  async function commit({scope,slot,owner,epoch,expectedRevision,batchId,projection,checkpoint,events=[],now=Date.now()}){
    const key=identity(scope,slot);
    if(!owner||!validSlot(batchId)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||!Array.isArray(events)||events.length>1000)throw new Error('INVALID_BATCH');
    const payload=encodeSave({schemaVersion:1,projection,checkpoint});if(new TextEncoder().encode(payload).length>MAX_CHECKPOINT_BYTES)throw new Error('SAVE_TOO_LARGE');
    const payloadHash=await hash(payload),batchHash=await hash(encodeSave({payloadHash,events}));
    const tx=db.transaction(['slots','events','leases','batches','outbox'],'readwrite'),end=done(tx);
    try{
      const slots=tx.objectStore('slots'),leases=tx.objectStore('leases'),batches=tx.objectStore('batches'),journal=tx.objectStore('events'),outbox=tx.objectStore('outbox');
      const lease=await request(leases.get(key));
      if(!lease||lease.owner!==owner||lease.epoch!==epoch||lease.expiresAt<=now)throw new Error('LEASE_LOST');
      const batchKey=JSON.stringify([key,batchId]),prior=await request(batches.get(batchKey));
      if(prior){if(prior.batchHash!==batchHash)throw new Error('BATCH_ID_REUSED');await end;return {...prior.receipt,duplicate:true};}
      const current=await request(slots.get(key));
      if((current?.revision||0)!==expectedRevision)throw new Error('REVISION_CONFLICT');
      if(current&&current.payload!==encodeSave({schemaVersion:1,projection:current.projection,checkpoint:current.checkpoint}))throw new Error('LOCAL_CHECKSUM_MISMATCH');
      let recovered=new Set();
      const retryEvents=events.filter(e=>e?.type==='AttemptRetried');
      if(retryEvents.length){
        if(retryEvents.length!==1||!current?.checkpoint)throw new Error('INVALID_RETRY_BATCH');
        const expected=buildFailedRetry(current.checkpoint,retryEvents[0].data?.newAttemptId);
        if(encodeSave(projection)!==encodeSave(expected.projection)||encodeSave(checkpoint)!==encodeSave(expected.checkpoint)||encodeSave(events)!==encodeSave(expected.events))throw new Error('INVALID_RETRY_BATCH');
        recovered.add(expected.receipt.recoveredHeroId);
      }
      validateProjection(projection,current?.projection,recovered);
      validateGameCheckpoint(projection,checkpoint);
      const eventIds=new Set();
      for(const event of events){
        if(!event||typeof event.id!=='string'||!event.id||event.id.length>200||eventIds.has(event.id))throw new Error('INVALID_EVENT');
        eventIds.add(event.id);const eventKey=JSON.stringify([key,event.id]),old=await request(journal.get(eventKey)),encoded=encodeSave(event);
        if(old&&old.encoded!==encoded)throw new Error('EVENT_ID_REUSED');
        if(!old)journal.put({event,encoded,revision:expectedRevision+1},eventKey);
      }
      const revision=expectedRevision+1,receipt={revision,batchId,payloadHash};
      const oldOutbox=await request(outbox.get(key));
      const record={schemaVersion:1,scope:{...scope},slot,revision,projection:structuredClone(projection),checkpoint:structuredClone(checkpoint),payload,payloadHash,cloudRevision:current?.cloudRevision||0,updatedAt:now};
      slots.put(record,key);batches.put({batchHash,receipt},batchKey);
      if(scope.kind==='firebase')outbox.put({scope:{...scope},slot,revision,payload,payloadHash,baseCloudRevision:oldOutbox?.baseCloudRevision??record.cloudRevision,syncId:`${owner}_${revision}`,updatedAt:now},key);
      lease.expiresAt=now+leaseMs;leases.put(lease,key);await end;return receipt;
    }catch(error){try{tx.abort();}catch{}try{await end;}catch{}throw error;}
  }
  async function acknowledge(scope,slot,revision,cloudRevision,syncId){
    const key=identity(scope,slot),tx=db.transaction(['slots','outbox'],'readwrite'),end=done(tx),slots=tx.objectStore('slots'),outbox=tx.objectStore('outbox');
    const item=await request(outbox.get(key)),record=await request(slots.get(key));
    if(!item||!record||item.revision<revision||!Number.isSafeInteger(cloudRevision)||cloudRevision<=item.baseCloudRevision){await end;return false;}
    if(item.revision===revision&&item.syncId!==syncId){await end;return false;}
    record.cloudRevision=cloudRevision;slots.put(record,key);
    if(item.revision===revision)outbox.delete(key);else{item.baseCloudRevision=cloudRevision;outbox.put(item,key);}
    await end;return true;
  }
  async function events(scope,slot,throughRevision=Infinity){
    const key=identity(scope,slot),tx=db.transaction(['events'],'readonly'),end=done(tx),prefix=JSON.stringify([key]).slice(0,-1)+',',range=IDBKeyRange.bound(prefix,prefix+'\uffff');
    const all=await request(tx.objectStore('events').getAll(range));await end;
    return all.filter(row=>row.revision<=throughRevision).map(x=>x.event);
  }
  async function importCloud({scope,slot,owner,epoch,document,now=Date.now()}){
    const key=identity(scope,slot);
    if(scope.kind!=='firebase'||document?.ownerUid!==scope.id||document?.schemaVersion!==1||!Number.isSafeInteger(document?.revision)||document.revision<1||typeof document.payload!=='string'||new TextEncoder().encode(document.payload).length>MAX_CLOUD_BYTES)throw new Error('INVALID_CLOUD_SAVE');
    if(await hash(document.payload)!==document.payloadHash)throw new Error('CLOUD_CHECKSUM_MISMATCH');
    let packet;try{packet=decodeSave(document.payload);}catch{throw new Error('CLOUD_PAYLOAD_INVALID');}
    if(packet?.schemaVersion!==1||packet.slot?.schemaVersion!==1||!Array.isArray(packet.journal)||packet.journal.length>MAX_JOURNAL_EVENTS)throw new Error('CLOUD_PAYLOAD_INVALID');
    if(new TextEncoder().encode(encodeSave(packet.slot)).length>MAX_CHECKPOINT_BYTES)throw new Error('SAVE_TOO_LARGE');
    const {projection,checkpoint}=packet.slot,payload=encodeSave(packet.slot),payloadHash=await hash(payload);
    validateGameCheckpoint(projection,checkpoint);
    const tx=db.transaction(['slots','events','leases','outbox'],'readwrite'),end=done(tx);
    try{
      const slots=tx.objectStore('slots'),journal=tx.objectStore('events'),leases=tx.objectStore('leases');
      const lease=await request(leases.get(key)),current=await request(slots.get(key)),outbox=await request(tx.objectStore('outbox').get(key));
      if(!lease||lease.owner!==owner||lease.epoch!==epoch||lease.expiresAt<=now)throw new Error('LEASE_LOST');
      if(outbox)throw new Error('LOCAL_UNSYNCED');
      if(current?.cloudRevision>document.revision)throw new Error('CLOUD_OLDER');
      const unchanged=current?.cloudRevision===document.revision&&current.payloadHash===payloadHash;
      if(current?.cloudRevision===document.revision&&!unchanged)throw new Error('CLOUD_REVISION_COLLISION');
      validateProjection(projection,current?.projection,recoveryChain(current,checkpoint,packet.journal));
      const revision=unchanged?current.revision:(current?.revision||0)+1,ids=new Set();
      for(const event of packet.journal){
        if(!event||typeof event.id!=='string'||!event.id||event.id.length>200||ids.has(event.id))throw new Error('INVALID_EVENT');ids.add(event.id);
        const eventKey=JSON.stringify([key,event.id]),encoded=encodeSave(event),old=await request(journal.get(eventKey));
        if(old&&old.encoded!==encoded)throw new Error('EVENT_ID_REUSED');
        if(!old)journal.put({event,encoded,revision},eventKey);
      }
      const prefix=JSON.stringify([key]).slice(0,-1)+',',range=IDBKeyRange.bound(prefix,prefix+'\uffff');
      const localEvents=await request(journal.getAll(range));
      if(localEvents.some(row=>!ids.has(row.event.id)))throw new Error('CLOUD_JOURNAL_CONFLICT');
      if(unchanged){await end;return current;}
      const record={schemaVersion:1,scope:{...scope},slot,revision,projection:structuredClone(projection),checkpoint:structuredClone(checkpoint),payload,payloadHash,cloudRevision:document.revision,updatedAt:now};
      slots.put(record,key);lease.expiresAt=now+leaseMs;leases.put(lease,key);await end;return record;
    }catch(error){try{tx.abort();}catch{}try{await end;}catch{}throw error;}
  }
  return {acquire,release,read,pending,commit,acknowledge,events,importCloud,close:()=>db.close()};
}

export async function syncPending({repository,scope,slot,getCurrentUid,cloud}){
  if(scope.kind!=='firebase'||getCurrentUid()!==scope.id)throw new Error('AUTH_SCOPE_MISMATCH');
  const item=await repository.pending(scope,slot);if(!item)return {status:'synced'};
  if(getCurrentUid()!==scope.id)throw new Error('AUTH_SCOPE_MISMATCH');
  if(await hash(item.payload)!==item.payloadHash)throw new Error('LOCAL_CHECKSUM_MISMATCH');
  const journal=await repository.events(scope,slot,item.revision);
  if(journal.length>MAX_JOURNAL_EVENTS)throw new Error('CLOUD_JOURNAL_TOO_LARGE');
  const payload=encodeSave({schemaVersion:1,slot:decodeSave(item.payload),journal});
  if(new TextEncoder().encode(payload).length>MAX_CLOUD_BYTES)throw new Error('CLOUD_PAYLOAD_TOO_LARGE');
  const payloadHash=await hash(payload);
  if(getCurrentUid()!==scope.id)throw new Error('AUTH_SCOPE_MISMATCH');
  const result=await cloud.compareAndSet({uid:scope.id,slot,baseRevision:item.baseCloudRevision,syncId:item.syncId,payload,payloadHash});
  if(getCurrentUid()!==scope.id)throw new Error('AUTH_CHANGED_AFTER_SYNC');
  if(result.conflict)return {status:'conflict',cloudRevision:result.revision};
  const acknowledged=await repository.acknowledge(scope,slot,item.revision,result.revision,item.syncId);
  return {status:acknowledged?(await repository.pending(scope,slot)?'pending':'synced'):'pending',cloudRevision:result.revision};
}
