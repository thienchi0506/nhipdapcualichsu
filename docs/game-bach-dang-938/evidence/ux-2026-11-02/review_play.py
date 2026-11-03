"""Observed play using user controls; diagnostics only read, no fixture state."""
from review_common import *
import traceback

b=Browser();reports=[]

def run(name, fn):
    item={'name':name};reports.append(item)
    try:
        fn(item)
        item['exceptions']=errors(b)
        print('DONE '+name,flush=True)
    except Exception as exc:
        item['failure']={'error':str(exc),'traceback':traceback.format_exc()}
        item['layout']=layout(b);item['state']=state(b)
        b.shot(name+'-failure');print('FAIL '+name+' '+str(exc)[:220],flush=True)
    write('play-observations.json',{'browser':b.version,'inputOnly':True,'reports':reports})

def choices(item):
    b.navigate('game-bach-dang-938/index.html')
    item['characters']=[]
    for hero in ['H01','H02','H03','H04']:
        b.click('[data-hero="'+hero+'"]')
        item['characters'].append(b.evaluate("({text:document.getElementById('bd938-selected').innerText,pressed:[...document.querySelectorAll('[data-hero]')].map(e=>({id:e.dataset.hero,pressed:e.getAttribute('aria-pressed')}))})"))
    item['qualityRuns']=[]
    for q in ['economy','balanced','detailed']:
        start(b,hero='H04',quality=q)
        item['qualityRuns'].append({'quality':q,'state':state(b)})
        b.shot('quality-'+q)
        b.click('#bd938-pause');b.click('[data-dialog-action="2"]')
    b.navigate('game-bach-dang-938/index.html')
    item['rememberedAfterReload']=state(b)

def combat(item):
    start(b)
    b.click('[data-combat-action="lock"]');b.click('[data-combat-action="weapon"]')
    item['bowBefore']=state(b)
    b.click('#bd938-camera');b.click('#bd938-canvas')
    press(b,'KeyJ','j');ws(b,'(s.session.combat.eventCounts.ArrowHit||0)>0',8)
    item['bowAfter']=state(b);b.shot('desktop-bow')
    # Begin a fresh visible trial through the normal pause/replay flow.
    b.click('#bd938-pause');b.click('[data-dialog-action="1"]');ws(b,"s.state==='BRIEFING'")
    b.click('[data-dialog-action="0"]');ws(b,"s.state==='RUNNING'")
    b.click('#bd938-canvas');key(b,'KeyW','w','keyDown');ws(b,'s.session.river.z<23')
    press(b,'KeyM','m');ws(b,'s.session.combat.mapOpen');key(b,'KeyW','w','keyUp')
    item['mapBefore']=state(b);time.sleep(.8);item['mapAfter']=state(b);b.shot('desktop-map-underway')
    b.click('#bd938-map [data-combat-action="map"]')
    b.click('#bd938-canvas');key(b,'KeyW','w','keyDown');ws(b,'s.session.river.z<19.5');key(b,'KeyW','w','keyUp');press(b,'Space',' ')
    ws(b,'s.session.river.readings.speedMps<.25',8)
    b.click('#bd938-camera');b.click('[data-combat-action="interact"]');ws(b,'!s.session.combat.helm')
    b.click('#bd938-canvas');key(b,'KeyW','w','keyDown');ws(b,'a.attachment?.localZ < -2.65',6);key(b,'KeyW','w','keyUp')
    b.click('[data-combat-action="board"]');ws(b,"a.attachment?.boatId==='enemy-boat'",5)
    b.click('[data-combat-action="lock"]');b.click('#bd938-canvas');press(b,'KeyJ','j')
    ws(b,'(s.session.combat.eventCounts.MeleeResolved||0)>0',5)
    item['melee']=state(b);b.shot('desktop-boarded-melee')
    ws(b,"s.session.combat.controlledId==='R01'",40)
    item['takeover']=state(b);b.shot('desktop-reserve-takeover')
    b.click('#bd938-pause')

def army(item):
    start(b)
    b.click('.bd938-actor-tools [data-combat-action="map"]')
    b.click('[data-army-action="order"]');item['ordered']=layout(b)
    b.click('[data-army-action="convoy"]');time.sleep(.6)
    item['supplied']=layout(b);item['state']=state(b);b.shot('desktop-orders-and-supply')
    b.click('#bd938-map [data-combat-action="map"]')
    b.click('#bd938-systems summary')
    item['followBefore']=b.evaluate("[...document.querySelectorAll('[data-combat-action=follow]')].map(e=>e.innerText)")
    b.click('[data-combat-action="follow"]');time.sleep(.2)
    item['followAfter']=b.evaluate("[...document.querySelectorAll('[data-combat-action=follow]')].map(e=>e.innerText)")
    b.shot('desktop-duplicate-follow');b.click('#bd938-pause')

def mobile(item):
    start(b,390,844)
    b.call('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':2})
    b.click('[data-combat-action="interact"]')
    p=touchpoint(b,'[data-move="forward"]',1);q=touchpoint(b,'[data-combat-held="guard"]',2)
    item['beforeTouch']=state(b)
    b.call('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[p]})
    b.call('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[p,q]});time.sleep(.5)
    item['duringTouch']=state(b)
    b.call('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});time.sleep(.2)
    item['afterCancel']=state(b);time.sleep(.5);item['afterRest']=state(b)
    b.click('.bd938-actor-tools [data-combat-action="map"]')
    b.call('Input.dispatchMouseEvent',{'type':'mouseWheel','x':200,'y':350,'deltaX':0,'deltaY':550})
    time.sleep(.4);item['scrolledMap']=layout(b);b.shot('mobile-map-scrolled')
    b.click('[data-army-action="convoy"]');time.sleep(.3);item['supplyFeedback']=layout(b);b.shot('mobile-supply-feedback')
    b.click('#bd938-map [data-combat-action="map"]')
    b.click('#bd938-systems summary');item['expanded']=layout(b);b.shot('mobile-hud-clipped')
    b.click('#bd938-pause');item['pause']=layout(b)
    b.click('#bd938-dialog-close');item['closePause']=state(b)

def landscape(item):
    start(b,844,390)
    b.call('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':2})
    b.click('#bd938-systems summary')
    r=rect(b,'#bd938-systems summary');x=r['x']+r['width']/2;y=r['y']+r['height']/2
    item['hitAtSummary']=b.evaluate(f"document.elementFromPoint({x},{y}).outerHTML")
    item['before']=state(b)
    for typ in ['mousePressed','mouseReleased']:
        b.call('Input.dispatchMouseEvent',{'type':typ,'x':x,'y':y,'button':'left','clickCount':1})
    time.sleep(.3);item['afterClick']=state(b)
    item['stillOpen']=b.evaluate("document.getElementById('bd938-systems').open")
    b.shot('landscape-system-hit-overlap')
    # Close via keyboard on the actual summary, preserving accessible fallback.
    b.evaluate("document.querySelector('#bd938-systems summary').focus()")
    press(b,'Enter','Enter')
    b.click('.bd938-actor-tools [data-combat-action="map"]')
    item['map']=layout(b);b.shot('landscape-map')
    b.call('Input.dispatchMouseEvent',{'type':'mouseWheel','x':500,'y':180,'deltaX':0,'deltaY':550});time.sleep(.3)
    item['mapScrolled']=layout(b);b.shot('landscape-map-scrolled')
    b.click('#bd938-map [data-combat-action="map"]')
    b.click('#bd938-pause');item['pause']=layout(b);b.shot('landscape-pause')
    b.click('[data-dialog-action="0"]');b.click('#bd938-finish');item['result']=layout(b);b.shot('landscape-result')

try:
    for name,fn in [('choices',choices),('combat',combat),('army',army),('mobile',mobile),('landscape',landscape)]:run(name,fn)
finally:
    b.close()
