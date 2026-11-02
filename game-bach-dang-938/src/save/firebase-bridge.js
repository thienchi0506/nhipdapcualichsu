// The SDK instance observes the existing Firebase Auth session; it never signs
// in, signs out or changes the site's persistence settings.
const SDK='https://www.gstatic.com/firebasejs/10.12.2/';
const INLINE_BYTES=700000,MAX_BUNDLE_BYTES=16000000,CHUNK_CHARS=50000,MAX_CHUNKS=320;
const bytes=value=>new TextEncoder().encode(value).length;
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function splitPayload(payload){
  const chunks=[];let offset=0;
  while(offset<payload.length){let end=Math.min(payload.length,offset+CHUNK_CHARS);const last=payload.charCodeAt(end-1);if(end<payload.length&&last>=0xd800&&last<=0xdbff)end--;chunks.push(payload.slice(offset,end));offset=end;}
  if(chunks.length>MAX_CHUNKS)throw new Error('CLOUD_PAYLOAD_TOO_LARGE');return chunks;
}

export async function connectFirebaseSave(config, injected=null){
  if(!config?.projectId||!config?.apiKey||!config?.appId)throw new Error('FIREBASE_CONFIG_MISSING');
  const modules=injected||{
    app:await import(`${SDK}firebase-app.js`),
    auth:await import(`${SDK}firebase-auth.js`),
    firestore:await import(`${SDK}firebase-firestore.js`),
  };
  const existing=modules.app.getApps().find(app=>app.name==='[DEFAULT]');
  if(existing&&(existing.options.projectId!==config.projectId||existing.options.appId!==config.appId))throw new Error('FIREBASE_PROJECT_MISMATCH');
  const app=existing||modules.app.initializeApp(config),auth=modules.auth.getAuth(app),db=modules.firestore.getFirestore(app);
  await new Promise((resolve,reject)=>{
    let unsubscribe,finished=false;
    unsubscribe=modules.auth.onAuthStateChanged(auth,()=>{finished=true;unsubscribe?.();resolve();},error=>{finished=true;unsubscribe?.();reject(error);});
    if(finished)unsubscribe();
  });
  const currentUid=()=>auth.currentUser?.uid||null;
  function slotRef(uid,slot){return modules.firestore.doc(db,'gameBachDang938',uid,'versions','v1','slots',slot);}
  function chunkRef(uid,slot,syncId,index){return modules.firestore.doc(db,'gameBachDang938',uid,'versions','v1','slots',slot,'snapshots',`${syncId}_${index}`);}
  function requireUid(uid){if(currentUid()!==uid)throw new Error('AUTH_SCOPE_MISMATCH');}
  const cloud={
    async read(uid,slot){
      if(currentUid()!==uid)throw new Error('AUTH_SCOPE_MISMATCH');
      const snap=await modules.firestore.getDocFromServer(slotRef(uid,slot));
      if(currentUid()!==uid)throw new Error('AUTH_CHANGED_DURING_READ');
      if(!snap.exists())return null;
      const head=snap.data();if(head.transportVersion===undefined)return head;
      if(head.transportVersion!==2||!Number.isInteger(head.chunkCount)||head.chunkCount<1||head.chunkCount>MAX_CHUNKS||!Number.isInteger(head.payloadBytes)||head.payloadBytes<1||head.payloadBytes>MAX_BUNDLE_BYTES||typeof head.syncId!=='string'||!/^[A-Za-z0-9_-]{1,150}$/.test(head.syncId))throw new Error('INVALID_CLOUD_MANIFEST');
      const parts=[];
      // Bounded batches avoid issuing hundreds of reads simultaneously.
      for(let start=0;start<head.chunkCount;start+=4){
        requireUid(uid);
        const batch=await Promise.all(Array.from({length:Math.min(4,head.chunkCount-start)},async(_,n)=>{
          const index=start+n,snapshot=await modules.firestore.getDocFromServer(chunkRef(uid,slot,head.syncId,index));
          requireUid(uid);if(!snapshot.exists())throw new Error('CLOUD_CHUNK_MISSING');const chunk=snapshot.data();
          if(chunk.ownerUid!==uid||chunk.uploadId!==head.syncId||chunk.index!==index||typeof chunk.payload!=='string'||bytes(chunk.payload)>200000||await digest(chunk.payload)!==chunk.payloadHash)throw new Error('CLOUD_CHUNK_CORRUPT');
          return chunk.payload;
        }));parts.push(...batch);
      }
      const payload=parts.join('');
      if(bytes(payload)!==head.payloadBytes||await digest(payload)!==head.payloadHash)throw new Error('CLOUD_CHECKSUM_MISMATCH');
      return {...head,payload};
    },
    async compareAndSet({uid,slot,baseRevision,syncId,payload,payloadHash}){
      if(currentUid()!==uid)throw new Error('AUTH_SCOPE_MISMATCH');
      if(typeof payload!=='string'||bytes(payload)>MAX_BUNDLE_BYTES)throw new Error('CLOUD_PAYLOAD_TOO_LARGE');
      if(typeof syncId!=='string'||!/^[A-Za-z0-9_-]{1,150}$/.test(syncId))throw new Error('INVALID_SYNC_ID');
      const ref=slotRef(uid,slot);
      let manifest=null;
      if(bytes(payload)>INLINE_BYTES){
        if(await digest(payload)!==payloadHash)throw new Error('CLOUD_CHECKSUM_MISMATCH');
        const before=await modules.firestore.getDocFromServer(ref);requireUid(uid);const old=before.exists()?before.data():null;
        if(old?.syncId===syncId){if(old.payloadHash!==payloadHash)throw new Error('SYNC_ID_REUSED');return {revision:old.revision,duplicate:true};}
        if((old?.revision||0)!==baseRevision)return {conflict:true,revision:old?.revision||0};
        const parts=splitPayload(payload);
        for(let index=0;index<parts.length;index++){
          requireUid(uid);const payload=parts[index],payloadHash=await digest(payload),chunk=chunkRef(uid,slot,syncId,index);
          await modules.firestore.runTransaction(db,async tx=>{
            requireUid(uid);const prior=await tx.get(chunk);
            if(prior.exists()){const value=prior.data();if(value.payloadHash!==payloadHash||value.payload!==payload||value.index!==index||value.uploadId!==syncId||value.ownerUid!==uid)throw new Error('SYNC_ID_REUSED');return;}
            tx.set(chunk,{ownerUid:uid,uploadId:syncId,index,payload,payloadHash});
          });
        }
        manifest={transportVersion:2,chunkCount:parts.length,payloadBytes:bytes(payload)};
      }
      return modules.firestore.runTransaction(db,async tx=>{
        if(currentUid()!==uid)throw new Error('AUTH_SCOPE_MISMATCH');
        const snapshot=await tx.get(ref),previous=snapshot.exists()?snapshot.data():null;
        if(previous?.syncId===syncId){if(previous.payloadHash!==payloadHash)throw new Error('SYNC_ID_REUSED');return {revision:previous.revision,duplicate:true};}
        const revision=previous?.revision||0;
        if(revision!==baseRevision)return {conflict:true,revision};
        const next={ownerUid:uid,schemaVersion:1,revision:revision+1,syncId,payloadHash,...(manifest||{payload})};
        tx.set(ref,next);return {revision:next.revision};
      });
    },
  };
  return {currentUid,cloud,onAuthChanged(callback){return modules.auth.onAuthStateChanged(auth,user=>callback(user?.uid||null));}};
}
