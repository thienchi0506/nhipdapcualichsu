from pathlib import Path
import sys,json,time,traceback
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent;audit.OUT=HERE;b=Browser();checks=[]
def check(name,ok,data=None):checks.append({'name':name,'passed':bool(ok),'data':data});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
try:
 for w,h in [(320,740),(667,375),(568,320)]:
  start(b,w,h);d=layout(b);check(f'{w}: fit',d['scrollWidth']==w and d['scrollHeight']<=h and all(a['inViewport'] for a in d['actions']),d)
  check(f'{w}: touch size',all(a['rect']['width']>=44 and a['rect']['height']>=44 for a in d['actions']))
  b.click('#bd938-systems summary');b.click('#bd938-systems-close')
  check(f'{w}: close panel returns canvas focus',b.evaluate("!document.getElementById('bd938-systems').open&&document.activeElement.id==='bd938-canvas'"))
  b.shot(f'fixed-extra-{w}')
  b.click('#bd938-pause');b.click('[data-dialog-action="2"]')
 start(b,390,844);b.call('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':2})
 b.click('[data-combat-action="interact"]');p=touchpoint(b,'[data-move="forward"]',1);q=touchpoint(b,'[data-combat-held="guard"]',2)
 old=actor(state(b))['attachment']['localZ']
 b.call('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[p]});b.call('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[p,q]});time.sleep(.4)
 s=actor(state(b));check('Independent multi-touch',s['guard'] and s['attachment']['localZ']!=old)
 b.call('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});time.sleep(.3);s=actor(state(b));time.sleep(.3);t=actor(state(b))
 check('Pointercancel stops both controls',not t['guard'] and s['attachment']==t['attachment'])
 b.click('#bd938-pause');b.click('[data-dialog-action="2"]')
 check('No uncaught exception',not errors(b),errors(b))
except Exception as exc:check('Unexpected failure',False,traceback.format_exc());b.shot('edges-failure')
finally:
 (HERE/'edges-validation.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');b.close()
raise SystemExit(1 if any(not c['passed'] for c in checks) else 0)
