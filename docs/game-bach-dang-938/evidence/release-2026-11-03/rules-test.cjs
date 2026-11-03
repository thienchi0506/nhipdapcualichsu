// Runs only against a local Firestore emulator and demo project.
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, deleteDoc, runTransaction, getDocFromServer } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

(async()=>{
  
  const actualRules=fs.readFileSync(path.join(process.env.BD938_REPO,'firestore.rules'),'utf8');
  const actual=await initializeTestEnvironment({projectId:'demo-bd938-save',firestore:{host:'127.0.0.1',port:8089,rules:actualRules}});
  try {
    const db=actual.authenticatedContext('current-rules-owner').firestore();
    const ref=doc(db,'gameBachDang938','current-rules-owner','versions','v1','slots','main');
    await assertFails(setDoc(ref,{ownerUid:'current-rules-owner',schemaVersion:1,revision:1,syncId:'current_rules_probe',payload:'{}',payloadHash:'a'.repeat(64)}));
    await assertFails(getDocFromServer(ref));
    fs.writeFileSync(path.join(process.env.BD938_EVIDENCE,'current-rules-gap.json'),JSON.stringify({repositoryRulesDenyOwnerCreate:true,repositoryRulesDenyOwnerGet:true,productionRulesInspected:false,meaning:'Game fragment is not installed in the repository production rules file.'},null,2));
  } finally { await actual.cleanup(); }
  const mergedRules=fs.readFileSync(path.join(process.env.BD938_EVIDENCE,'rules-under-test.txt'),'utf8');
  const environment=await initializeTestEnvironment({projectId:'demo-bd938-save',firestore:{host:'127.0.0.1',port:8089,rules:mergedRules}});

  const checks=[];
  const test=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
  try{
    const a=environment.authenticatedContext('test-user-A').firestore();
    const b=environment.authenticatedContext('test-user-B').firestore();
    const guest=environment.unauthenticatedContext().firestore();
    const ref=(db,uid='test-user-A',slot='main')=>doc(db,'gameBachDang938',uid,'versions','v1','slots',slot);
    const row={ownerUid:'test-user-A',schemaVersion:1,revision:1,syncId:'sample_1',payload:'{}',payloadHash:'a'.repeat(64)};
    await test('owner can create their own slot',()=>assertSucceeds(setDoc(ref(a),row)));
    await test('owner can get their own slot',()=>assertSucceeds(getDoc(ref(a))));
    await test('other account cannot read the slot',()=>assertFails(getDoc(ref(b))));
    await test('other account cannot update the slot',()=>assertFails(setDoc(ref(b),{...row,revision:2})));
    await test('anonymous account cannot read the slot',()=>assertFails(getDoc(ref(guest))));
    await test('owner cannot forge a different owner',()=>assertFails(setDoc(ref(a,'test-user-A','forged'),{...row,ownerUid:'test-user-B'})));
    await test('unexpected fields are rejected',()=>assertFails(setDoc(ref(a,'test-user-A','extra'),{...row,extra:true})));
    await test('bad version and hash are rejected',()=>assertFails(setDoc(ref(a,'test-user-A','bad'),{...row,schemaVersion:2,payloadHash:'bad'})));
    await test('owner may advance exactly one revision',()=>assertSucceeds(setDoc(ref(a),{...row,revision:2,syncId:'sample_2'})));
    await test('revision rollback is denied',()=>assertFails(setDoc(ref(a),row)));
    await test('revision skipping is denied',()=>assertFails(setDoc(ref(a),{...row,revision:4})));
    await test('deletion is denied',()=>assertFails(deleteDoc(ref(a))));
    await test('existing public posts read still works',()=>assertSucceeds(getDoc(doc(guest,'posts','not-a-real-post'))));
    await test('existing post creation still uses the original author rule',()=>assertSucceeds(setDoc(doc(a,'posts','fixture-post'),{authorUid:'test-user-A',author:'A',topic:'Lịch sử',content:'Nội dung thử',likes:0,commentsCount:0})));
    await test('existing comments creation still works',()=>assertSucceeds(setDoc(doc(a,'comments','fixture-comment'),{authorUid:'test-user-A',postId:'fixture-post',author:'A',content:'Bình luận thử'})));
    await test('existing post impersonation is still denied',()=>assertFails(setDoc(doc(b,'posts','forged-post'),{authorUid:'test-user-A',author:'A',topic:'Lịch sử',content:'Nội dung thử',likes:0,commentsCount:0})));
    const source=fs.readFileSync(path.join(process.env.BD938_REPO,'game-bach-dang-938/src/save/firebase-bridge.js'),'utf8');
    const {connectFirebaseSave}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
    const fakeAuth={currentUser:{uid:'test-user-A'}};
    const injected={app:{getApps:()=>[],initializeApp:c=>({options:c})},auth:{getAuth:()=>fakeAuth,onAuthStateChanged:(_a,fn)=>{queueMicrotask(()=>fn(fakeAuth.currentUser));return ()=>{};}},firestore:{getFirestore:()=>a,doc,runTransaction,getDocFromServer}};
    const bridge=await connectFirebaseSave({projectId:'demo-bd938-save',apiKey:'test',appId:'test-app'},injected);
    await test('bridge makes a real emulator transaction',async()=>{const res=await bridge.cloud.compareAndSet({uid:'test-user-A',slot:'bridge',baseRevision:0,syncId:'b1',payload:'{}',payloadHash:'b'.repeat(64)});if(res.revision!==1)throw Error('wrong revision');});
    await test('bridge transaction returns same receipt on duplicate',async()=>{const res=await bridge.cloud.compareAndSet({uid:'test-user-A',slot:'bridge',baseRevision:0,syncId:'b1',payload:'{}',payloadHash:'b'.repeat(64)});if(!res.duplicate||res.revision!==1)throw Error('not idempotent');});
    await test('bridge detects concurrent device revision',async()=>{const res=await bridge.cloud.compareAndSet({uid:'test-user-A',slot:'bridge',baseRevision:0,syncId:'b2',payload:'{}',payloadHash:'c'.repeat(64)});if(!res.conflict||res.revision!==1)throw Error('conflict absent');});
    await test('bridge refuses a different local UID',async()=>{try{await bridge.cloud.read('test-user-B','bridge');throw Error('did not reject');}catch(e){if(e.message!=='AUTH_SCOPE_MISMATCH')throw e;}});
    fs.writeFileSync(path.join(process.env.BD938_EVIDENCE,'rules-emulator.json'),JSON.stringify({projectId:'demo-bd938-save',checks,passed:checks.length,total:checks.length},null,2));
    const {spawnSync}=require('child_process');
    const browser=spawnSync(process.env.BD938_PYTHON,[path.join(process.env.BD938_EVIDENCE,'check_save_emulator.py')],{stdio:'inherit',env:process.env,cwd:process.env.BD938_REPO});
    if(browser.status!==0)throw new Error(`Browser emulator integration failed: ${browser.status}`);
  }finally{await environment.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
