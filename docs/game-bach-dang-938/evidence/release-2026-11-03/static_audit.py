from pathlib import Path
import hashlib,json,re,subprocess
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
baseline=json.loads((HERE.parent/'audit-2026-11-01'/'runtime-hashes-before.json').read_text(encoding='utf8'))
protected={p:h for p,h in baseline.items() if not p.startswith(('docs/','tools/','game-bach-dang-938/')) and Path(p).suffix in ['.html','.js','.css','.rules'] and (ROOT/p).is_file()}
compared=[{'path':p,'baselineHash':h,'currentHash':sha(ROOT/p),'same':sha(ROOT/p)==h} for p,h in protected.items()]
manifest=json.loads((ROOT/'game-bach-dang-938/vendor/three-r128/manifest.json').read_text(encoding='utf8'))
licenses=[{'file':a['file'],'size':(ROOT/'game-bach-dang-938/vendor/three-r128'/a['file']).stat().st_size,'hashMatches':sha(ROOT/'game-bach-dang-938/vendor/three-r128'/a['file'])==a['sha256'],'license':manifest['license']} for a in manifest['files']]
runtime=[p for p in (ROOT/'game-bach-dang-938').rglob('*') if p.is_file() and p.suffix in ['.html','.js','.css','.json'] and not any(x in p.parts for x in ['vendor','tests'])]
network=[]
for p in runtime:
 for line,s in enumerate(p.read_text(encoding='utf8').splitlines(),1):
  if re.search(r'https?://|fetch\(|new URL\(|import\(',s):network.append({'file':str(p.relative_to(ROOT)).replace('\\','/'),'line':line,'text':s.strip()})
changes=subprocess.check_output(['git','diff','34cc820','HEAD','--name-only','--','*.html','*.js','*.css','*.rules'],cwd=ROOT).decode().splitlines()
out={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),'protected':compared,'protectedSame':sum(x['same'] for x in compared),'protectedTotal':len(compared),'changedSincePriorHead':changes,'vendorChecks':licenses,'networkReferences':network,'runtimeDataFiles':[p.name for p in (ROOT/'game-bach-dang-938/data').glob('*')],'runtimeHashes':{str(p.relative_to(ROOT)).replace('\\','/'):sha(p) for p in runtime},'notes':['Comparison baseline is pre-new-game working tree; homepage is expected to differ by its new entry.','Network scan is a code inventory, not an assessment of every legacy asset license.','No production rules or remote deployed version queried.']}
(HERE/'source-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Protected same:',out['protectedSame'],'/',out['protectedTotal']);print('Changed:',[x['path'] for x in compared if not x['same']]);print('Vendor:',licenses)
