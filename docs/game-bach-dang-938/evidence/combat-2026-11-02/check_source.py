"""Verify character/combat-layer scope, local imports, configuration and evidence integrity."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
GAME = ROOT/'game-bach-dang-938'
checks = []


def check(name, condition, evidence=None):
    checks.append({'name':name, 'passed':bool(condition), 'evidence':evidence})


before = json.loads((HERE/'hashes-before.json').read_text())
after = {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() if (ROOT/p).is_file() else None for p in before}
protected = [p for p in before if not p.startswith('game-bach-dang-938/')]
changed_protected = [p for p in protected if before[p]!=after[p]]
check('All pre-existing website code and user changes are preserved',not changed_protected,{'protectedFiles':len(protected),'changed':changed_protected})
check('Vendored engine is unchanged',all(before[p]==after[p] for p in before if '/vendor/' in p))
shell = json.loads((GAME/'data/shell-scene.json').read_text(encoding='utf-8'))
river = json.loads((GAME/'data/river-config.json').read_text(encoding='utf-8'))
check('Shell no longer contains a duplicate movement configuration','simulation' not in shell and shell['version']=='bd938-shell-2')
check('Physics configuration has distinct types and stable stake IDs',set(river['vessels'])=={'light','transport'} and len({row['id'] for row in river['map']['stakes']})==len(river['map']['stakes']))
character = json.loads((GAME/'data/character-config.json').read_text(encoding='utf-8'))
check('Combat tuning has bounded hit counts and explicit rescue/takeover limits', character['melee']['maxTargets']==1 and character['rescueWorkS']>0 and character['waterRescueWindowS']>0 and character['takeoverDelayS']>0)
check('Old instantaneous movement module is retired',not (GAME/'src/core/demo.js').exists())
source='\n'.join(p.read_text(encoding='utf-8') for p in (GAME/'src/sim').glob('*.js'))
check('Simulation does not depend on DOM, renderer or wall clock',not any(token in source for token in ['document.','window.','THREE','Math.random','Date.now','performance.now']))
app='\n'.join(p.read_text(encoding='utf-8') for p in (GAME/'src').rglob('*.js'))
check('No legacy runtime, Firebase import or gameplay global is introduced',not any(token in app for token in ['game-runtime.js','game-upgrades-','firebase-config.js','gstatic.com/firebasejs']) and not re.search(r'window\.[\w$]+\s*=',app))
broken_imports=[]
for path in (GAME/'src').rglob('*.js'):
    for target in re.findall(r'(?:from\s*|import\s*\()[\'\"]([^\'\"]+)',path.read_text(encoding='utf-8')):
        if target.startswith('.') and not (path.parent/target).is_file():broken_imports.append([str(path.relative_to(ROOT)),target])
check('All local runtime module imports resolve',not broken_imports,broken_imports)
trailing=[]
for path in GAME.rglob('*'):
    if path.is_file() and '/vendor/' not in path.as_posix() and path.suffix in ['.js','.html','.css','.json','.md']:
        for n,line in enumerate(path.read_text(encoding='utf-8').splitlines(),1):
            if line.rstrip()!=line:trailing.append(f'{path.relative_to(ROOT)}:{n}')
check('New application source has no trailing whitespace',not trailing,trailing)
for name in ['physics-checks.json','character-checks.json','combat-ui-checks.json','browser-checks.json','edge-checks.json']:
    report=json.loads((HERE/name).read_text(encoding='utf-8'))
    check(name+' passed',report['passed']==report['total'] and not report.get('failure'),{'passed':report['passed'],'total':report['total']})
diff=subprocess.run(['git','diff','--check'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
check('git diff --check',diff.returncode==0,diff.stdout)

report_path=HERE/'source-integrity.json'
if not report_path.exists():report_path.write_text('{}\n',encoding='utf-8')
broken=[]
for path in [GAME/'README.md',*HERE.parent.parent.glob('*.md')]:
    for target in re.findall(r'\]\(([^)]+)\)',path.read_text(encoding='utf-8-sig')):
        if target.startswith(('http:','https:','#')):continue
        if not (path.parent/target.split('#')[0]).exists():broken.append([str(path.relative_to(ROOT)),target])
check('Dossier links resolve',not broken,broken)
result={'date':'2026-11-02','checks':checks,'passed':sum(row['passed'] for row in checks),'total':len(checks),'protectedFilesCompared':len(protected),'changedProtectedFiles':changed_protected,'modifiedNewGameFiles':[p for p in before if p.startswith('game-bach-dang-938/') and before[p]!=after[p]],'newGameHashes':{p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in GAME.rglob('*') if p.is_file()}}
report_path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(HERE/'hashes-after.json').write_text(json.dumps(after,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':result['passed'],'total':result['total'],'protectedFiles':len(protected),'changedProtectedFiles':changed_protected,'failures':[row for row in checks if not row['passed']]},ensure_ascii=True))
raise SystemExit(0 if result['passed']==result['total'] else 1)
