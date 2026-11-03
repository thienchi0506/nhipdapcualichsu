from pathlib import Path
import json,hashlib,subprocess,re
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3]
# Correct a misleading label, preserving the actual value and query semantics.
path=HERE/'current-validation.json';d=json.loads(path.read_text(encoding='utf8'))
for probe in d['probes']:
 e=probe.get('evidence')
 if isinstance(e,dict) and 'newCanvas' in e:e['newPrefixedElements']=e.pop('newCanvas')
path.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
baseline=json.loads((HERE/'source-audit.json').read_text(encoding='utf8'))['runtimeHashes']
changed=[p for p,h in baseline.items() if hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h]
outside=subprocess.check_output(['git','diff','--name-only','HEAD','--','.',':(exclude)docs/**'],cwd=ROOT).decode().splitlines()
links=[]
for p in [ROOT/'docs/game-bach-dang-938/release-audit.md',HERE/'README.md']:
 for link in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf8')):
  if not link.startswith(('https:','http:','#')) and not (p.parent/link.split('#')[0]).exists():links.append({'file':str(p),'link':link})
out={'head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip(),'runtimeFilesRehashed':len(baseline),'changedRuntimeHashes':changed,'trackedChangesOutsideDocs':outside,'missingReportLinks':links,'productionDeployed':False,'rulesProductionChanged':False}
(HERE/'integrity.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(out,ensure_ascii=False))
raise SystemExit(bool(changed or outside or links))
