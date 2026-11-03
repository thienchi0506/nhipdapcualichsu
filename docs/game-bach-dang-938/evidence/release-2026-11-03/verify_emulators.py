"""Runs current save/Auth/Rules tests against local demo emulators only."""
from pathlib import Path
import json, os, subprocess, sys, tempfile
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
prior=HERE.parent/'save-2026-11-02'
tools=json.loads((prior/'temp-tools.json').read_text(encoding='utf8'))
packages=Path(tools['root'])/'packages'/'node_modules'
node=Path(tools['node'])/'node.exe';java=Path(tools['java'])/'bin'
work=Path(tempfile.mkdtemp(prefix='bd938-release-emulator-'))
original=(ROOT/'firestore.rules').read_text(encoding='utf8')
fragment=(ROOT/'game-bach-dang-938/firestore.rules.fragment.txt').read_text(encoding='utf8')
pos=original.rfind('  }')
merged=original[:pos]+fragment+'\n'+original[pos:]
(work/'firestore.test.rules').write_text(merged,encoding='utf8')
(HERE/'rules-under-test.txt').write_text(merged,encoding='utf8')
(work/'firebase.test.json').write_text(json.dumps({'firestore':{'rules':'firestore.test.rules'},'emulators':{'auth':{'host':'127.0.0.1','port':9099},'firestore':{'host':'127.0.0.1','port':8089},'ui':{'enabled':False},'singleProjectMode':True}}),encoding='utf8')
source=(prior/'rules-test.cjs').read_text(encoding='utf8')
source=source.replace("const environment=await initializeTestEnvironment({projectId:'demo-bd938-save',firestore:{host:'127.0.0.1',port:8089}});", """
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
""")
# The existing rule suite is copied verbatim; its child reads current modules in
# an isolated browser and writes into this review directory, not prior evidence.
(HERE/'rules-test.cjs').write_text(source,encoding='utf8')
browser=(prior/'check_save_emulator.py').read_text(encoding='utf8')
(HERE/'check_save_emulator.py').write_text(browser,encoding='utf8')
env=os.environ.copy();env.update(BD938_REPO=str(ROOT),BD938_EVIDENCE=str(HERE),BD938_PYTHON=sys.executable,BD938_NODE=str(node),NODE_PATH=str(packages),FIREBASE_EMULATORS_PATH=str(Path(tools['root'])/'emulator-cache'),JAVA_HOME=tools['java'])
env.pop('DEBUG',None)
env['PATH']=str(java)+os.pathsep+tools['node']+os.pathsep+env['PATH']
(work/'run.cmd').write_text('@echo off\n"%BD938_NODE%" "%BD938_EVIDENCE%\\rules-test.cjs"\n',encoding='ascii')
cli=packages/'firebase-tools'/'lib'/'bin'/'firebase.js'
cmd=[str(node),str(cli),'emulators:exec','--project','demo-bd938-save','--only','firestore,auth','--config',str(work/'firebase.test.json'),str(work/'run.cmd')]
with (HERE/'emulator-run.log').open('w',encoding='utf8') as log:
    result=subprocess.run(cmd,cwd=work,env=env,stdout=log,stderr=subprocess.STDOUT)
# CLI debug output is not useful evidence and can contain environment values.
logpath=HERE/'emulator-run.log'
logpath.write_text('\n'.join('[Environment dump omitted]' if 'with environment {' in line else line for line in logpath.read_text(encoding='utf8').splitlines())+'\n',encoding='utf8')
(HERE/'emulator-environment.json').write_text(json.dumps({'project':'demo-bd938-save','exitCode':result.returncode,'temporaryConfig':str(work),'productionAccess':False,'rulesSource':'current firestore.rules + current game fragment'},indent=2),encoding='utf8')
print('Local emulator run exit:',result.returncode,flush=True)
raise SystemExit(result.returncode)
