from pathlib import Path
import sys,json,time,traceback
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent;audit.OUT=HERE;b=Browser();out={}
try:
 start(b);b.click('.bd938-actor-tools [data-combat-action="map"]');select(b,'#bd938-army-order',2)
 b.click('#bd938-army-z');key(b,'ControlLeft','Control','keyDown');press(b,'KeyA','a');key(b,'ControlLeft','Control','keyUp');b.call('Input.insertText',{'text':'-24'});b.click('[data-army-action="order"]')
 ws(b,"s.session.army.squads[0].counts.downed>0",60);time.sleep(.2)
 out['counts']=state(b)['session']['army']['squads'][0]['counts'];out['text']=b.evaluate("document.getElementById('bd938-army-losses').innerText")
 out['passed']='gục, cần cứu' in out['text'] and str(out['counts']['downed']) in out['text'];out['exceptions']=errors(b)
 b.shot('casualties-distinguished');b.click('#bd938-map-pause');out['paused']=state(b)['state']=='PAUSED';print(out,flush=True)
except Exception as exc:out['failure']=traceback.format_exc();print(out['failure'],flush=True)
finally:
 (HERE/'casualties-validation.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');b.close()
