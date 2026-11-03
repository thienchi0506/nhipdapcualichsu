from pathlib import Path
import sys,json,time,traceback
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent;audit.OUT=HERE;b=Browser();checks=[]
try:
 for w,h in [(320,740),(360,800),(390,844),(844,390),(1365,900)]:
  start(b,w,h);b.click('.bd938-actor-tools [data-combat-action="map"]');s=layout(b);b.shot(f'fixed-{w}-map')
  r=rect(b,'#bd938-map-pause');checks.append({'name':f'{w}: map pause target','passed':r['width']>=44 and r['height']>=44 and r['bottom']<=h})
  b.click('#bd938-map-pause');a=state(b);time.sleep(.3);c=state(b)
  checks.append({'name':f'{w}: map pause freezes','passed':a['state']=='PAUSED' and a['session']['tick']==c['session']['tick']})
  b.click('[data-dialog-action="0"]');b.click('#bd938-map [data-combat-action="map"]');ws(b,'!s.session.combat.mapOpen')
  checks.append({'name':f'{w}: resume and close map','passed':state(b)['state']=='RUNNING' and not errors(b)})
  b.click('#bd938-pause');b.click('[data-dialog-action="2"]');print('DONE '+str(w),flush=True)
except Exception:checks.append({'name':'unexpected failure','passed':False,'error':traceback.format_exc()})
finally:
 (HERE/'map-pause-validation.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');b.close()
raise SystemExit(1 if any(not c['passed'] for c in checks) else 0)
