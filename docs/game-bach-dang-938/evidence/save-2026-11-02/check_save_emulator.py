from pathlib import Path
import importlib.util
import json

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('audit', HERE.parent/'audit_capture.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
browser=audit.Browser()
try:
    browser.navigate('game-bach-dang-938/tests/index.html')
    result=browser.evaluate("import('/game-bach-dang-938/tests/save-emulator-tests.js').then(m=>m.runSaveEmulatorTests())")
    (HERE/'browser-emulator.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    auth=browser.evaluate("import('/game-bach-dang-938/tests/save-auth-emulator-tests.js').then(m=>m.runAuthEmulatorTests())")
    original_uid=browser.evaluate("""(async()=>{const app=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),a=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
      const instance=app.initializeApp({projectId:'demo-bd938-save',apiKey:'emulator-key',appId:'emulator-app'});const auth=a.getAuth(instance);a.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
      await a.setPersistence(auth,a.indexedDBLocalPersistence);return (await a.createUserWithEmailAndPassword(auth,`persist-${crypto.randomUUID()}@example.invalid`,'Demo-Only-123456')).user.uid;})()""")
    browser.navigate('game-bach-dang-938/index.html')
    resumed_uid=browser.evaluate("""(async()=>{const app=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),a=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'),f=await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
      const {connectFirebaseSave}=await import('/game-bach-dang-938/src/save/firebase-bridge.js');const config={projectId:'demo-bd938-save',apiKey:'emulator-key',appId:'emulator-app'};let db;
      const modules={app,auth:{...a,getAuth(instance){const auth=a.getAuth(instance);a.connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});return auth;}},firestore:{...f,getFirestore(instance){db=f.getFirestore(instance);f.connectFirestoreEmulator(db,'127.0.0.1',8089);return db;}}};
      const bridge=await connectFirebaseSave(config,modules);return bridge.currentUid();})()""")
    auth['checks'].append({'name':'Existing Firebase Auth session is restored in a new document','passed':original_uid==resumed_uid and original_uid is not None})
    auth['passed']=sum(x['passed'] for x in auth['checks']);auth['total']=len(auth['checks'])
    (HERE/'auth-emulator.json').write_text(json.dumps(auth,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'firestore':[result['passed'],result['total']],'auth':[auth['passed'],auth['total']],'failures':[x['name'] for x in result['checks']+auth['checks'] if not x['passed']]}),flush=True)
finally:browser.close()
raise SystemExit(0 if result['passed']==result['total'] and auth['passed']==auth['total'] else 1)
