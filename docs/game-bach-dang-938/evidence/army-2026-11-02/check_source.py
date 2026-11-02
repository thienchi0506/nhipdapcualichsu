"""Check scoped source, old-site hashes, module links and test evidence."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
GAME=ROOT/'game-bach-dang-938'
checks=[]
def check(name,passed,evidence=None):checks.append({'name':name,'passed':bool(passed),'evidence':evidence})
before=json.loads((HERE.parent/'combat-2026-11-02/hashes-before.json').read_text(encoding='utf-8'))
protected=[name for name in before if not name.startswith('game-bach-dang-938/')]
changed=[name for name in protected if not (ROOT/name).is_file() or hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=before[name]]
check('Previously existing website sources unchanged since baseline',not changed,{'count':len(protected),'changed':changed})
manifest=json.loads((GAME/'vendor/three-r128/manifest.json').read_text(encoding='utf-8'))
check('Three.js files match pinned license/version/hashes',manifest['version']=='0.128.0' and manifest['license']=='MIT' and all(hashlib.sha256((GAME/'vendor/three-r128'/x['file']).read_bytes()).hexdigest()==x['sha256'] for x in manifest['files']))
source='\n'.join(p.read_text(encoding='utf-8') for p in (GAME/'src/sim').glob('*.js'))
check('Simulation has no DOM, network, random or wall-clock dependencies',not any(x in source for x in ['document.','window.','fetch(','Math.random','Date.now','performance.now']))
app='\n'.join(p.read_text(encoding='utf-8') for p in (GAME/'src').rglob('*.js'))
check('No legacy game runtime or Firebase is imported',not any(x in app for x in ['game-runtime.js','game-upgrades-','firebase-config.js','gstatic.com/firebasejs']))
broken=[]
for path in (GAME/'src').rglob('*.js'):
    for target in re.findall(r'(?:from\s*|import\s*\()[\'\"]([^\'\"]+)',path.read_text(encoding='utf-8')):
        if target.startswith('.') and not (path.parent/target).is_file():broken.append([str(path.relative_to(ROOT)),target])
check('All local runtime module imports resolve',not broken,broken)
check('Home retains two previous game links and one new game link',all(x in (ROOT/'trang-chinh.html').read_text(encoding='utf-8') for x in ['sa-ban.html','sa-ban-3d.html','game-bach-dang-938/index.html']))
for name in ['army-core.json','army-ui.json','character-checks.json','combat-ui-checks.json','edge-checks.json','browser-checks.json']:
    result=json.loads((HERE/name).read_text(encoding='utf-8'))
    check(name+' passed',result['total']>0 and result['passed']==result['total'] and not result.get('failure'),{'passed':result['passed'],'total':result['total']})
scene=json.loads((HERE/'army-scene.json').read_text(encoding='utf-8'))
check('3D instanced soldier picking returns the simulated ID',scene['passed'] and scene['picked']==scene['target']['id'])
bench=json.loads((HERE/'army-benchmark.json').read_text(encoding='utf-8'))
check('Every stress scale has real soldiers, shots, distinct IDs and no resurrection',all(r['total']==2*r['friendly']==r['uniqueIds'] and r['shots']>0 and r['resurrected']==0 for r in bench['results']))
diff=subprocess.run(['git','diff','--check'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
check('Tracked diff whitespace check',diff.returncode==0,diff.stdout)
out=HERE/'source-integrity.json'
if not out.exists():out.write_text('{}\n',encoding='utf-8')
missing=[]
for path in [GAME/'README.md',*HERE.parent.parent.glob('*.md')]:
    for target in re.findall(r'\]\(([^)]+)\)',path.read_text(encoding='utf-8-sig')):
        if target.startswith(('http:','https:','#')):continue
        if not (path.parent/target.split('#')[0]).exists():missing.append([str(path.relative_to(ROOT)),target])
check('Project dossier links resolve',not missing,missing)
result={'checks':checks,'passed':sum(x['passed'] for x in checks),'total':len(checks),'protectedCompared':len(protected),'changedProtected':changed,
        'newGameHashes':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in GAME.rglob('*') if p.is_file()}}
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':result['passed'],'total':result['total'],'failed':[c for c in checks if not c['passed']]}))
raise SystemExit(0 if result['passed']==result['total'] else 1)
