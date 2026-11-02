import {openSaveRepository,syncPending} from '../src/save/repository.js';
import {connectFirebaseSave} from '../src/save/firebase-bridge.js';

// Isolated demo project: never connects to a production Auth or Firestore.
export async function runAuthEmulatorTests(){
  if(!['127.0.0.1','localhost'].includes(location.hostname))throw new Error('EMULATOR_TEST_REQUIRES_LOCALHOST');
  const appSDK=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const authSDK=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
  const fs=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
  const config={projectId:'demo-bd938-save',apiKey:'emulator-key',appId:'emulator-app'};
  const app=appSDK.initializeApp(config,`auth-demo-${crypto.randomUUID()}`),auth=authSDK.getAuth(app),db=fs.getFirestore(app);
  authSDK.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  fs.connectFirestoreEmulator(db,'127.0.0.1',8089);
  const fakeEmail=`test-${crypto.randomUUID()}@example.invalid`,fakePassword='Demo-Only-123456';
  const userA=(await authSDK.createUserWithEmailAndPassword(auth,fakeEmail,fakePassword)).user;
  const modules={app:{getApps:()=>[{name:'[DEFAULT]',options:config}]},auth:{...authSDK,getAuth:()=>auth},firestore:{...fs,getFirestore:()=>db}};
  const bridge=await connectFirebaseSave(config,modules),name=`bd938-auth-demo-${crypto.randomUUID()}`,repo=await openSaveRepository({name}),checks=[];
  const check=(label,passed)=>checks.push({name:label,passed:!!passed});
  try{
    const scope={kind:'firebase',id:userA.uid},lease=await repo.acquire(scope,'main','auth-test-tab');
    check('Bridge observes the existing real Firebase Auth emulator session',bridge.currentUid()===userA.uid);
    const projection={schemaVersion:1,campaignId:'auth-campaign',roster:[{id:'F-1',status:'dead',health:0,wounds:1}],inventory:{ammo:7},chapter:{id:'one'},equipment:[],upgrades:{},missionResults:[]};
    await repo.commit({scope,slot:'main',owner:'auth-test-tab',epoch:lease.epoch,expectedRevision:0,batchId:'auth-init',projection,checkpoint:{tick:30},events:[{id:'death-F-1',type:'DeathRecorded'}]});
    check('Auth user can sync a local save using actual Firestore SDK',(await syncPending({repository:repo,scope,slot:'main',getCurrentUid:bridge.currentUid,cloud:bridge.cloud})).status==='synced');
    await repo.commit({scope,slot:'main',owner:'auth-test-tab',epoch:lease.epoch,expectedRevision:1,batchId:'pending',projection,checkpoint:{tick:31},events:[]});
    await authSDK.signOut(auth);
    check('Signing out retains the unsynced account-specific outbox',bridge.currentUid()===null&&!!await repo.pending(scope,'main'));
    let denied=false;try{await syncPending({repository:repo,scope,slot:'main',getCurrentUid:bridge.currentUid,cloud:bridge.cloud});}catch(e){denied=e.message==='AUTH_SCOPE_MISMATCH';}
    check('Signed-out state cannot write the former user save',denied);
    const userB=(await authSDK.createUserWithEmailAndPassword(auth,`other-${crypto.randomUUID()}@example.invalid`,fakePassword)).user;
    let crossDenied=false;try{await fs.getDocFromServer(fs.doc(db,'gameBachDang938',userA.uid,'versions','v1','slots','main'));}catch(e){crossDenied=e.code==='permission-denied';}
    check('A different authenticated emulator account cannot read the save',userB.uid!==userA.uid&&crossDenied);
    await authSDK.signInWithEmailAndPassword(auth,fakeEmail,fakePassword);
    check('Original user can resume the pending sync after signing back in',bridge.currentUid()===userA.uid&&(await syncPending({repository:repo,scope,slot:'main',getCurrentUid:bridge.currentUid,cloud:bridge.cloud})).status==='synced');
  }finally{repo.close();indexedDB.deleteDatabase(name);await authSDK.signOut(auth);await fs.terminate(db);await appSDK.deleteApp(app);}
  return {checks,passed:checks.filter(c=>c.passed).length,total:checks.length};
}
