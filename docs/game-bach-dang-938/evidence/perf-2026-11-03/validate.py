from pathlib import Path
import sys,json,time,traceback
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent;audit.OUT=HERE;b=Browser();checks=[];observations=[]
def check(name,ok,data=None):
 checks.append({'name':name,'passed':bool(ok),'data':data});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
def save(): (HERE/'validation.json').write_text(json.dumps({'checks':checks,'observations':observations},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
try:
 b.navigate('game-bach-dang-938/index.html')
 for module,name in [('river-tests','runRiverTests'),('character-tests','runCharacterTests'),('army-tests','runArmyTests'),('save-tests','runSaveTests'),('retry-tests','runRetryTests'),('session-save-tests','runSessionSaveTests')]:
  r=b.evaluate(f"import('/game-bach-dang-938/tests/{module}.js').then(m=>m.{name}())")
  check(module,r['passed']==r['total'],r);save()
 for w,h in [(360,800),(390,844),(430,932),(844,390),(1365,900)]:
  start(b,w,h);before=layout(b);observations.append({'size':[w,h],'playing':before});b.shot(f'fixed-{w}-playing')
  check(f'{w}: no horizontal overflow',before['scrollWidth']==w)
  check(f'{w}: all play actions >=44px',all(a['rect']['width']>=44 and a['rect']['height']>=44 for a in before['actions']),[(a['text'],a['rect']['width'],a['rect']['height']) for a in before['actions']])
  regions=before['regions'];view=next(r['rect'] for r in regions if r['id']=='bd938-viewport')
  check(f'{w}: character HUD inside scene',all(r['rect']['bottom']<=view['bottom'] and r['rect']['top']>=view['top'] for r in regions if r['id']=='' and r['text'].startswith('Người dẫn thuyền')))
  b.click('#bd938-systems summary');check(f'{w}: single companion button',b.evaluate("document.querySelectorAll('[data-combat-action=follow]').length===1"));b.shot(f'fixed-{w}-systems')
  b.click('#bd938-systems-close');check(f'{w}: panel closes with pointer',not b.evaluate("document.getElementById('bd938-systems').open"))
  b.click('.bd938-actor-tools [data-combat-action="map"]');ws(b,'s.session.combat.mapOpen')
  a=state(b);time.sleep(.3);c=state(b);check(f'{w}: map keeps sim running',c['session']['tick']>a['session']['tick'])
  check(f'{w}: usable map height',rect(b,'#bd938-map-view')['height']>=180)
  observations[-1]['map']=layout(b);b.shot(f'fixed-{w}-map')
  b.click('[data-army-action="convoy"]');time.sleep(.2)
  check(f'{w}: translated supply status',b.evaluate("document.getElementById('bd938-army-stores').innerText.includes('đang vận chuyển')"))
  b.click('#bd938-map [data-combat-action="map"]')
  b.click('#bd938-pause');f=state(b)['session']['tick'];time.sleep(.3);check(f'{w}: pause freezes tick',state(b)['session']['tick']==f)
  b.click('[data-dialog-action="0"]');b.click('#bd938-finish');b.shot(f'fixed-{w}-results')
  b.click('[data-dialog-action="0"]');ws(b,"s.state==='BRIEFING'");b.click('[data-dialog-action="0"]')
  b.click('#bd938-pause');b.click('[data-dialog-action="2"]');s=state(b)
  check(f'{w}: replay and cleanup',all(s[k]==0 for k in ['activeLoops','sessionListeners','observers','renderers','geometries','materials','canvases']),s)
  check(f'{w}: no runtime fault',not s['lastFault'] and not errors(b),errors(b));save()
except Exception as exc:
 observations.append({'failure':str(exc),'traceback':traceback.format_exc(),'layout':layout(b)});b.shot('validation-failure');print(traceback.format_exc(),flush=True)
finally:save();b.close()
raise SystemExit(1 if any(not c['passed'] for c in checks) or any('failure' in o for o in observations) else 0)
