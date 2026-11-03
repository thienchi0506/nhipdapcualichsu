"""Warnings, input release, landscape obstruction, and observed troop losses."""
from review_common import *
import traceback
b=Browser();reports=[]

def run(name,fn):
    item={'name':name};reports.append(item)
    try:fn(item);print('DONE '+name,flush=True)
    except Exception as exc:
        item['failure']={'error':str(exc),'traceback':traceback.format_exc()};print('FAIL '+name+' '+str(exc)[:180],flush=True)
    item['state']=state(b);item['layout']=layout(b);item['exceptions']=errors(b)
    b.shot(name);write('edge-observations.json',{'browser':b.version,'reports':reports})

def landscape(item):
    start(b,844,390)
    b.call('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':2})
    b.click('#bd938-systems summary')
    item['overlap']=b.evaluate("(()=>{const e=document.querySelector('#bd938-systems summary'),r=e.getBoundingClientRect();return {rect:r.toJSON(),centerHit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2).className,bottomHit:document.elementFromPoint(r.x+r.width/2,r.bottom-3).tagName}})()")
    # The remaining 3px above the bottom edge is a real pointer escape route.
    r=rect(b,'#bd938-systems summary')
    for typ in ['mousePressed','mouseReleased']:b.call('Input.dispatchMouseEvent',{'type':typ,'x':r['x']+r['width']/2,'y':r['bottom']-3,'button':'left','clickCount':1})
    item['closedAtEdge']=not b.evaluate("document.getElementById('bd938-systems').open")
    b.click('.bd938-actor-tools [data-combat-action="map"]');item['map']=layout(b);b.shot('landscape-map-clean')
    press(b,'Escape','Escape');item['escapePause']=state(b)
    b.click('[data-dialog-action="0"]');b.click('#bd938-map [data-combat-action="map"]')
    b.click('#bd938-finish');item['result']=layout(b);b.shot('landscape-result-clean')
    b.click('[data-dialog-action="0"]');ws(b,"s.state==='BRIEFING'");item['replay']=state(b)

def warning(item):
    b.navigate('game-bach-dang-938/index.html',390,844)
    select(b,'#bd938-scenario',3)
    item['scenario']=b.evaluate("document.getElementById('bd938-scenario').value")
    b.click('#bd938-next');b.click('[data-quality="economy"]');b.click('#bd938-load');ws(b,"s.state==='BRIEFING'")
    item['briefing']=layout(b)
    b.click('[data-dialog-action="0"]');time.sleep(3)
    item['initial']=state(b);item['initialAlert']=b.evaluate("document.getElementById('bd938-river-alert').innerText")
    b.click('#bd938-systems summary');b.click('[data-river-action="recover"]');time.sleep(1)
    item['recoverFeedback']=layout(b);b.shot('mobile-stake-warning-and-recovery')
    b.click('#bd938-systems summary');time.sleep(3);item['later']=state(b)
    b.click('#bd938-pause')

def touchrelease(item):
    start(b,390,844)
    b.call('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':2})
    b.click('[data-combat-action="interact"]')
    q=touchpoint(b,'[data-combat-held="guard"]',1)
    b.call('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[q]});time.sleep(.35)
    item['held']={'state':state(b),'text':b.evaluate("document.getElementById('bd938-character-state').innerText")}
    b.call('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});time.sleep(.5)
    item['released']={'state':state(b),'text':b.evaluate("document.getElementById('bd938-character-state').innerText")}
    b.click('.bd938-actor-tools [data-combat-action="map"]');time.sleep(.3)
    item['map']={'state':state(b),'text':b.evaluate("document.getElementById('bd938-character-state').innerText")}
    press(b,'Escape','Escape')

def troops(item):
    start(b)
    b.click('.bd938-actor-tools [data-combat-action="map"]')
    select(b,'#bd938-army-order',2)
    b.click('#bd938-army-z');key(b,'ControlLeft','Control','keyDown');press(b,'KeyA','a');key(b,'ControlLeft','Control','keyUp');b.call('Input.insertText',{'text':'-24'})
    b.click('[data-army-action="order"]')
    item['order']=layout(b)
    samples=[]
    for _ in range(12):
        time.sleep(5);s=state(b)
        samples.append({'tick':s['session']['tick'],'army':s['session']['army'],'text':b.evaluate("document.getElementById('bd938-army-report').innerText")})
        if any(q['counts'].get('dead',0)+q['counts'].get('wounded',0)>0 for q in s['session']['army']['squads']):break
    item['samples']=samples;item['afterOrders']=layout(b)
    b.click('#bd938-pause')

try:
    for name,fn in [('landscape-overlap-confirm',landscape),('stake-warning',warning),('touch-release-check',touchrelease),('troop-loss-readout',troops)]:run(name,fn)
finally:b.close()
