import {openSaveRepository,syncPending} from '../src/save/repository.js';
import {recordFailedAttempt} from '../src/save/attempt-resolution.js';
import {connectFirebaseSave} from '../src/save/firebase-bridge.js';
import {preparePersistedSession} from '../src/save/prepare-session.js';
import {projectGame,captureGame,restoreGame} from '../src/save/game-state.js';
import {createRiverState} from '../src/sim/vessel.js';
import {createEncounter} from '../src/sim/encounter.js';
import {createArmy} from '../src/sim/army.js';

// This test may only target the demo Firestore emulator; it never uses the
// real site's project or credentials.
export async function runSaveEmulatorTests(){
  if(!['127.0.0.1','localhost'].includes(location.hostname))throw new Error('EMULATOR_TEST_REQUIRES_LOCALHOST');
  const appSDK=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const fs=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const cfg={projectId:'demo-bd938-save',apiKey:'emulator-key',appId:'emulator-app'};
  const appA=appSDK.initializeApp(cfg,`test-a-${crypto.randomUUID()}`),appB=appSDK.initializeApp(cfg,`test-b-${crypto.randomUUID()}`);
  const dbA=fs.getFirestore(appA),dbB=fs.getFirestore(appB);
  fs.connectFirestoreEmulator(dbA,'127.0.0.1',8089,{mockUserToken:{sub:'browser-A',user_id:'browser-A'}});
  fs.connectFirestoreEmulator(dbB,'127.0.0.1',8089,{mockUserToken:{sub:'browser-B',user_id:'browser-B'}});
  const fakeAuth={currentUser:{uid:'browser-A'}};
  const modules={app:{getApps:()=>[],initializeApp:()=>appA},auth:{getAuth:()=>fakeAuth,onAuthStateChanged:(_a,fn)=>{queueMicrotask(()=>fn(fakeAuth.currentUser));return ()=>{};}},firestore:{...fs,getFirestore:()=>dbA}};
  const bridge=await connectFirebaseSave(cfg,modules),names=[`bd938-emulator-${crypto.randomUUID()}`,`bd938-emulator-${crypto.randomUUID()}`];
  const first=await openSaveRepository({name:names[0]}),second=await openSaveRepository({name:names[1]}),scope={kind:'firebase',id:'browser-A'},checks=[];
  const check=(name,passed)=>checks.push({name,passed:!!passed});let largeSave=null;
  try{
    const slot='integration',l1=await first.acquire(scope,slot,'deviceA'),l2=await second.acquire(scope,slot,'deviceB');
    const initial={schemaVersion:1,campaignId:'demo-campaign',roster:[{id:'F-1',status:'active',health:100,wounds:0}],inventory:{ammo:10},chapter:{id:'chapter-1'},equipment:[],upgrades:{},missionResults:[]};
    await first.commit({scope,slot,owner:'deviceA',epoch:l1.epoch,expectedRevision:0,batchId:'init',projection:initial,checkpoint:{tick:0},events:[{id:'init',type:'Init'}]});
    check('Initial save reaches a real Firestore emulator transaction',(await syncPending({repository:first,scope,slot,getCurrentUid:bridge.currentUid,cloud:bridge.cloud})).status==='synced');
    const cloud=await bridge.cloud.read(scope.id,slot);
    await second.importCloud({scope,slot,owner:'deviceB',epoch:l2.epoch,document:cloud});
    check('A second device imports the signed-in user save',(await second.read(scope,slot)).projection.campaignId==='demo-campaign');
    const dead=structuredClone(initial);dead.roster[0]={id:'F-1',status:'dead',health:0,wounds:1};dead.inventory.ammo=7;
    await first.commit({scope,slot,owner:'deviceA',epoch:l1.epoch,expectedRevision:1,batchId:'loss',projection:dead,checkpoint:{tick:30},events:[{id:'death-F-1',type:'DeathRecorded'}]});
    check('Death and consumption synchronize to the emulator',(await syncPending({repository:first,scope,slot,getCurrentUid:bridge.currentUid,cloud:bridge.cloud})).status==='synced');
    await second.commit({scope,slot,owner:'deviceB',epoch:l2.epoch,expectedRevision:1,batchId:'offline-branch',projection:initial,checkpoint:{tick:10},events:[]});
    const conflict=await syncPending({repository:second,scope,slot,getCurrentUid:bridge.currentUid,cloud:bridge.cloud});
    check('Offline divergence is detected and the local branch is retained',conflict.status==='conflict'&&!!await second.pending(scope,slot));
    let crossDenied=false;try{await fs.getDocFromServer(fs.doc(dbB,'gameBachDang938','browser-A','versions','v1','slots',slot));}catch(e){crossDenied=e.code==='permission-denied';}
    check('A different Firebase user cannot read the first user slot',crossDenied);
    let blocked=false;try{await first.commit({scope,slot,owner:'deviceA',epoch:l1.epoch,expectedRevision:2,batchId:'rollback',projection:initial,checkpoint:{tick:0},events:[]});}catch(e){blocked=e.message==='DEATH_ROLLBACK';}
    check('Retry cannot overwrite the committed death',blocked&&(await first.read(scope,slot)).projection.roster[0].status==='dead');
    const riverConfig=await(await fetch(new URL('../data/river-config.json',import.meta.url))).json(),characterConfig=await(await fetch(new URL('../data/character-config.json',import.meta.url))).json();
    const game=createRiverState(riverConfig,{scenarioId:'combat'});game.combat=createEncounter(characterConfig,game,'H01');game.army=createArmy(game,{playerCount:10,enemyCount:10});game.combat.army=game.army;
    const casualty=game.army.people.find(p=>p.team==='friendly');casualty.status='dead';casualty.health=0;casualty.wounds=1;
    const fullLease=await first.acquire(scope,'world','deviceA');
    await first.commit({scope,slot:'world',owner:'deviceA',epoch:fullLease.epoch,expectedRevision:0,batchId:'world-1',projection:projectGame(game,'full-world'),checkpoint:captureGame(game,{campaignId:'full-world',attemptId:'attempt-1'}),events:[{id:'attempt-1:death',type:'DeathRecorded',soldierId:casualty.id}]});
    await syncPending({repository:first,scope,slot:'world',getCurrentUid:bridge.currentUid,cloud:bridge.cloud});
    const prepared=await preparePersistedSession({repository:second,scope,slot:'world',owner:'deviceB',bridge});
    const imported=restoreGame(prepared.checkpoint);
    check('Full simulation checkpoint and casualty restore from emulator to a fresh device',imported.army.byId.get(casualty.id).status==='dead'&&prepared.eventIds.includes('attempt-1:death'));
    await prepared.close();
    const largeSlot='chunked',largeLease=await first.acquire(scope,largeSlot,'deviceA');
    const largeWorld=createRiverState(riverConfig,{scenarioId:'combat'});largeWorld.combat=createEncounter(characterConfig,largeWorld,'H01');largeWorld.army=createArmy(largeWorld,{playerCount:400,enemyCount:400});largeWorld.combat.army=largeWorld.army;
    const largeCasualty=largeWorld.army.people[0];largeCasualty.status='dead';largeCasualty.health=0;largeCasualty.wounds=1;
    const largeCheckpoint={...captureGame(largeWorld,{campaignId:'large-campaign',attemptId:'attempt-large'}),fixture:'Lịch sử 🌊 '.repeat(65000)};
    await first.commit({scope,slot:largeSlot,owner:'deviceA',epoch:largeLease.epoch,expectedRevision:0,batchId:'large-1',projection:projectGame(largeWorld,'large-campaign'),checkpoint:largeCheckpoint,events:[{id:'large-death',type:'DeathRecorded',soldierId:largeCasualty.id}]});
    let writes=0,interrupt=true;
    const interruptedModules={...modules,firestore:{...modules.firestore,async runTransaction(db,fn){writes++;if(interrupt&&writes===3)throw new Error('SIMULATED_UPLOAD_INTERRUPT');return fs.runTransaction(db,fn);}}};
    const interruptedBridge=await connectFirebaseSave(cfg,interruptedModules);
    try{await syncPending({repository:first,scope,slot:largeSlot,getCurrentUid:bridge.currentUid,cloud:interruptedBridge.cloud});}catch{}
    const partialHead=await fs.getDocFromServer(fs.doc(dbA,'gameBachDang938',scope.id,'versions','v1','slots',largeSlot));
    check('Interrupted chunk upload keeps pending local data and publishes no head',!partialHead.exists()&&!!await first.pending(scope,largeSlot));
    interrupt=false;const chunkResult=await syncPending({repository:first,scope,slot:largeSlot,getCurrentUid:bridge.currentUid,cloud:interruptedBridge.cloud});
    const manifest=(await fs.getDocFromServer(fs.doc(dbA,'gameBachDang938',scope.id,'versions','v1','slots',largeSlot))).data();
    largeSave={soldiers:800,payloadBytes:manifest.payloadBytes,chunks:manifest.chunkCount,transportVersion:manifest.transportVersion};
    check('Large save publishes a manifest only after all chunks upload',chunkResult.status==='synced'&&manifest.transportVersion===2&&manifest.chunkCount>1&&!('payload' in manifest));
    const chunkCloud=await bridge.cloud.read(scope.id,largeSlot),largeLease2=await second.acquire(scope,largeSlot,'deviceB');
    await second.importCloud({scope,slot:largeSlot,owner:'deviceB',epoch:largeLease2.epoch,document:chunkCloud});
    const largeRestored=await second.read(scope,largeSlot);
    check('A new device reconstructs Vietnamese and emoji content without corruption',largeRestored.checkpoint.fixture===largeCheckpoint.fixture);
    const largeSimulation=restoreGame(largeRestored.checkpoint);
    check('Chunked save restores 400 soldiers per side with stable casualty IDs',largeSimulation.army.people.length===800&&largeSimulation.army.byId.get(largeCasualty.id).status==='dead');
    const chunkRef=fs.doc(dbA,'gameBachDang938',scope.id,'versions','v1','slots',largeSlot,'snapshots',`${manifest.syncId}_0`);
    const chunk=(await fs.getDocFromServer(chunkRef)).data();let immutable=false,privateChunk=false;
    try{await fs.setDoc(chunkRef,{...chunk,payload:'changed'});}catch(e){immutable=e.code==='permission-denied';}
    try{await fs.getDocFromServer(fs.doc(dbB,'gameBachDang938',scope.id,'versions','v1','slots',largeSlot,'snapshots',`${manifest.syncId}_0`));}catch(e){privateChunk=e.code==='permission-denied';}
    check('Uploaded chunks are immutable and private to their account',immutable&&privateChunk);
    const dup=await bridge.cloud.compareAndSet({uid:scope.id,slot:largeSlot,baseRevision:0,syncId:manifest.syncId,payload:chunkCloud.payload,payloadHash:manifest.payloadHash});
    check('Retry after a chunked head commit does not advance the cloud twice',dup.duplicate&&dup.revision===manifest.revision);
    const missingSlot='missing-chunk';await fs.setDoc(fs.doc(dbA,'gameBachDang938',scope.id,'versions','v1','slots',missingSlot),{...manifest,revision:1,syncId:'missing'});
    let missing=false;try{await bridge.cloud.read(scope.id,missingSlot);}catch(e){missing=e.message==='CLOUD_CHUNK_MISSING';}
    check('Incomplete manifests are rejected rather than importing partial saves',missing);
    // Local device B still has the pre-recovery injury while A commits camp
    // treatment. Import must accept this explicit treatment, not a raw heal.
    const retrySlot='retry-cloud';game.journalPending=[];game.combat.journalPending=[];game.army.journalPending=[];game.combat.phase='failed_command';const hero=game.combat.actors.find(a=>a.id==='H01');hero.mode='wounded';hero.health=0;hero.wounds=1;
    recordFailedAttempt(game,{campaignId:'full-world',attemptId:'attempt-cloud-old'});
    const retryLease=await first.acquire(scope,retrySlot,'deviceA');await first.commit({scope,slot:retrySlot,owner:'deviceA',epoch:retryLease.epoch,expectedRevision:0,batchId:'retry-world-1',projection:projectGame(game,'full-world'),checkpoint:captureGame(game,{campaignId:'full-world',attemptId:'attempt-cloud-old'}),events:collectGameEventsForFixture(game)});
    await syncPending({repository:first,scope,slot:retrySlot,getCurrentUid:bridge.currentUid,cloud:bridge.cloud});
    const oldRetry=await preparePersistedSession({repository:second,scope,slot:retrySlot,owner:'deviceB',bridge});await oldRetry.close();await first.release(scope,retrySlot,'deviceA',retryLease.epoch);
    const retryHandle=await preparePersistedSession({repository:first,scope,slot:retrySlot,owner:'retryA',bridge});await retryHandle.retryFailedAttempt();await retryHandle.synchronize();await retryHandle.close();
    const recoveredHandle=await preparePersistedSession({repository:second,scope,slot:retrySlot,owner:'retryB',bridge});
    check('A device with an old wound imports a verified camp recovery from cloud',restoreGame(recoveredHandle.checkpoint).combat.actors.find(a=>a.id==='H01').health===70&&recoveredHandle.controller.saved.projection.roster.find(p=>p.id===casualty.id).status==='dead');
    await recoveredHandle.close();
  }finally{
    first.close();second.close();for(const name of names)indexedDB.deleteDatabase(name);
    await fs.terminate(dbA);await fs.terminate(dbB);await appSDK.deleteApp(appA);await appSDK.deleteApp(appB);
  }
  return {checks,passed:checks.filter(x=>x.passed).length,total:checks.length,largeSave};
}
function collectGameEventsForFixture(game){return game.journalPending.map(e=>({id:`attempt-cloud-old:${e.id}`,type:e.type,tick:e.tick,data:e}));}
