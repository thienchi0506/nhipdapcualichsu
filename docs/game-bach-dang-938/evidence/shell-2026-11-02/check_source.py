"""Source preservation, module links, asset provenance and evidence checks."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
GAME = ROOT / 'game-bach-dang-938'
checks = []


def check(name, condition, evidence=None):
    checks.append({'name': name, 'passed': bool(condition), 'evidence': evidence})


before = json.loads((HERE / 'tracked-hashes-before.json').read_text(encoding='utf-8'))
after = {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in before}
changed = [p for p in before if before[p] != after[p]]
check('Only existing runtime file changed is homepage', changed == ['trang-chinh.html'], changed)

homepage = (ROOT / 'trang-chinh.html').read_text(encoding='utf-8')
addition = '''                    <a href="game-bach-dang-938/index.html" class="card__btn" id="bd938-entry" style="margin-top: 10px; min-height: 44px; box-sizing: border-box; line-height: 1.5; white-space: normal;">
                        Bạch Đằng 938 — Chiến dịch nhập vai
                    </a>
'''
original = subprocess.check_output(['git', 'show', 'HEAD:trang-chinh.html'], cwd=ROOT).decode('utf-8').replace('\r\n', '\n')
check('Homepage content equals original plus exactly one anchor', homepage.count(addition) == 1 and homepage.replace(addition, '') == original)
check('Homepage has no new game script or preload', not re.search(r'<(?:script|link)\b[^>]*(?:src|href)=["\'][^"\']*game-bach-dang-938', homepage, re.I))

broken = []
for path in (GAME / 'src').rglob('*.js'):
    source = path.read_text(encoding='utf-8')
    for module in re.findall(r'(?:from\s*|import\s*\()[\'\"]([^\'\"]+)', source):
        if module.startswith('.') and not (path.parent / module).is_file():
            broken.append(str(path.relative_to(ROOT)) + ': ' + module)
check('Local ES module imports resolve', not broken, broken)
source = '\n'.join(p.read_text(encoding='utf-8') for p in (GAME/'src').rglob('*.js'))
check('New code does not import legacy runtime or Firebase', not any(name in source for name in ['game-runtime.js','game-upgrades-','site-music.js','firebase-config.js','gstatic.com/firebasejs']))
check('No gameplay API is assigned on window', not re.search(r'window\.[\w$]+\s*=', source))
check('Only independent preference key used', 'dcls.bd938.preferences.v1' in source and all(key not in source for key in ['bangVang_BachDang_938','danhTuongProfile3D','uidNguoiDung','dcls_completed_exams','dcls.music.session.v1']))

manifest = json.loads((GAME/'vendor/three-r128/manifest.json').read_text())
check('Pinned Three version and license', manifest['version'] == '0.128.0' and manifest['license'] == 'MIT')
check('Vendored files match provenance hashes', all(hashlib.sha256((GAME/'vendor/three-r128'/row['file']).read_bytes()).hexdigest() == row['sha256'] for row in manifest['files']))
data = json.loads((GAME/'data/shell-scene.json').read_text(encoding='utf-8'))
check('Four roles and three quality presets', [row['id'] for row in data['roles']] == ['H01','H02','H03','H04'] and sorted(data['quality']) == ['balanced','detailed','economy'])

broken_links = []
for path in [GAME/'README.md', *HERE.parent.parent.glob('*.md')]:
    for target in re.findall(r'\]\(([^)]+)\)', path.read_text(encoding='utf-8-sig')):
        if target.startswith(('http:', 'https:', '#')): continue
        if not (path.parent/target.split('#')[0]).exists(): broken_links.append([str(path.relative_to(ROOT)), target])
check('Dossier local links resolve', not broken_links, broken_links)

reports = {name: json.loads((HERE/name).read_text(encoding='utf-8')) for name in ['browser-checks.json','edge-checks.json','visual-checks.json']}
check('All shell reports pass', all(row['passed'] == row['total'] and not row.get('failure') for row in reports.values()), {key:[value['passed'],value['total']] for key,value in reports.items()})
legacy = json.loads((HERE/'legacy-regression.json').read_text(encoding='utf-8'))
check('All existing game assertions pass without JS errors', all(not row['errors'] and all(c['passed'] for c in row['checks']['checks']) for row in legacy['reports']))
diff = subprocess.run(['git','diff','--check'],cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace')
check('git diff --check', diff.returncode == 0, diff.stdout)
result = {'date':'2026-11-02','checks':checks,'passed':sum(row['passed'] for row in checks),'total':len(checks),'gameRuntimeHashes':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in GAME.rglob('*') if p.is_file()}}
(HERE/'source-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'passed':result['passed'],'total':result['total'],'failures':[row for row in checks if not row['passed']]},ensure_ascii=False))
raise SystemExit(0 if result['passed']==result['total'] else 1)
