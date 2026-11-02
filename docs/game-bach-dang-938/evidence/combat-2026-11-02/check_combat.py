"""Isolated local combat verification. No live backend or campaign writes.
Core fixtures are labelled separately from the real keyboard/mouse playthrough.
"""
from pathlib import Path
import importlib.util
import json
import time
import traceback

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('combat_audit',HERE.parent/'audit_capture.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit);audit.OUT=HERE
b=audit.Browser();checks=[];observations=[];failure=None;exceptions=[]


def check(name,passed,evidence=None):
    checks.append({'name':name,'passed':bool(passed),'evidence':evidence})
    print(('PASS ' if passed else 'FAIL ')+name,flush=True)


def state():return b.evaluate("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics())")
def actor(s):return next(a for a in s['session']['combat']['actors'] if a['id']==s['session']['combat']['controlledId'])


def wait(expression,seconds=20):
    start=time.monotonic();last=-1
    while time.monotonic()-start<seconds:
        if b.evaluate(expression):return
        n=int((time.monotonic()-start)/5)
        if n>last:print('Waiting '+str(n*5)+'s',flush=True);last=n
        time.sleep(.1)
    raise RuntimeError('Timed out: '+expression)


def ws(expression,seconds=20):wait("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>{const s=m.getDiagnostics();const a=s.session?.combat?.actors.find(a=>a.id===s.session.combat.controlledId);return "+expression+"})",seconds)
def press(code,key):b.call('Input.dispatchKeyEvent',{'type':'keyDown','code':code,'key':key});b.call('Input.dispatchKeyEvent',{'type':'keyUp','code':code,'key':key})
def down(code,key):b.call('Input.dispatchKeyEvent',{'type':'keyDown','code':code,'key':key})
def up(code,key):b.call('Input.dispatchKeyEvent',{'type':'keyUp','code':code,'key':key})
def errors():exceptions.extend(e for e in b.events if e.get('method')=='Runtime.exceptionThrown')


def start(scenario='combat',width=1365):
    b.navigate('game-bach-dang-938/index.html',width,900 if width==1365 else 844)
    b.evaluate("const e=document.getElementById('bd938-scenario');e.value="+json.dumps(scenario)+";e.dispatchEvent(new Event('change',{bubbles:true}))")
    b.click('[data-hero="H01"]');b.click('#bd938-next');b.click('[data-quality="economy"]');b.click('#bd938-load')
    wait("document.getElementById('bd938-root').dataset.state==='BRIEFING'")
    b.click('[data-dialog-action="0"]');ws("s.session.combat.tick>2")


try:
    b.navigate('game-bach-dang-938/index.html')
    pure=b.evaluate("import('/game-bach-dang-938/tests/character-tests.js').then(m=>m.runCharacterTests())")
    (HERE/'character-checks.json').write_text(json.dumps(pure,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    check('Character, boarding, combat and takeover core fixtures',pure['passed']==pure['total'],{'passed':pure['passed'],'total':pure['total']})
    errors()
    start()
    b.click('[data-combat-action="lock"]');b.click('[data-combat-action="weapon"]')
    before=state();selected=before['session']['combat']['selectedId']
    b.click('#bd938-camera')
    check('Camera toggle preserves selected target and controlled actor',state()['session']['combat']['selectedId']==selected and state()['session']['scene']['cameraTargetId']=='H01' and state()['session']['scene']['cameraClearance']>=.49)
    b.click('#bd938-canvas');down('KeyJ','j');time.sleep(.12);up('KeyJ','j')
    ws("(s.session.combat.eventCounts.ArrowHit||0)>0",6)
    shot=state()['session']['combat']
    check('Real bow input creates one arrow and one hit',shot['eventCounts'].get('ArrowFired')==1 and shot['eventCounts'].get('ArrowHit')==1 and actor(state())['ammo']==39,shot['eventCounts'])
    b.shot('bow-follow-camera');errors()

    start()
    b.click('#bd938-canvas');down('KeyW','w');ws('s.session.river.z<23')
    press('KeyM','m');ws('s.session.combat.mapOpen')
    at_map=state();time.sleep(.6);later=state()
    check('Opening map keeps course, simulation and boat moving',later['session']['tick']>at_map['session']['tick'] and later['session']['river']['z']<at_map['session']['river']['z'],{'before':at_map['session']['river']['z'],'after':later['session']['river']['z']})
    b.shot('tactical-map-live')
    b.click('#bd938-map [data-combat-action="map"]');ws('!s.session.combat.mapOpen');up('KeyW','w')
    b.click('#bd938-canvas');down('KeyW','w');ws('s.session.river.z<19.5');up('KeyW','w');press('Space',' ')
    ws('s.session.river.readings.speedMps<.25',6)
    b.click('#bd938-camera');b.click('[data-combat-action="interact"]');ws('!s.session.combat.helm')
    b.click('#bd938-canvas');down('KeyW','w');ws("a.attachment?.localZ < -2.65",5);up('KeyW','w')
    b.click('[data-combat-action="board"]');ws("a.mode==='air'",3)
    ws("a.attachment?.boatId==='enemy-boat'",4)
    landed=state();observations.append({'landed':landed['session']['combat']})
    check('Actual pilot-map-approach-jump chain lands on enemy deck',actor(landed)['mode']=='foot' and landed['session']['combat']['eventCounts'].get('Landed',0)>0)
    targets=landed['session']['scene']['screenTargets'];pick=next((p for p in targets if p['visible'] and 200<p['y']<650),None)
    if pick:
        for typ in ['mousePressed','mouseReleased']:b.call('Input.dispatchMouseEvent',{'type':typ,'x':pick['x'],'y':pick['y'],'button':'left','clickCount':1})
        time.sleep(.15)
        check('Mouse ray selects an actual enemy model',state()['session']['combat']['selectedId'] is not None,state()['session']['combat']['selectedId'])
    else:check('Mouse ray selects an actual enemy model',False,targets)
    b.click('[data-combat-action="lock"]')
    b.click('#bd938-canvas');down('KeyJ','j');time.sleep(.1);up('KeyJ','j')
    ws('(s.session.combat.eventCounts.MeleeResolved||0)>0',3)
    check('Real melee input resolves a bounded swing',state()['session']['combat']['eventCounts'].get('MeleeResolved',0)>=1)
    b.shot('boarded-melee')
    ws("s.session.combat.controlledId==='R01'",35)
    takeover=state();observations.append({'takeover':takeover['session']['combat']})
    hero=next(a for a in takeover['session']['combat']['actors'] if a['id']=='H01')
    check('Enemy combat naturally downs hero and reserve takes over',hero['mode']=='wounded' and actor(takeover)['attachment']['boatId']=='player-boat' and takeover['session']['scene']['cameraTargetId']=='R01')
    check('Takeover does not teleport reserve onto enemy deck',abs(actor(takeover)['z']-hero['z'])>3,{'heroZ':hero['z'],'reserveZ':actor(takeover)['z']})
    damage=[e for e in takeover['session']['combat']['events'] if e['type']=='Damage']
    keys=[(e['causeId'],e['actorId']) for e in damage]
    check('Live damage log has no duplicate attack-target pair',len(keys)==len(set(keys)))
    b.shot('reserve-takeover');errors()

    start('harbor',390);b.call('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':2})
    b.click('[data-combat-action="interact"]');ws('!s.session.combat.helm')
    def point(selector,ident):
        r=b.evaluate('document.querySelector('+json.dumps(selector)+').getBoundingClientRect().toJSON()')
        return {'id':ident,'x':r['x']+r['width']/2,'y':r['y']+r['height']/2}
    move=point('[data-move="forward"]',1);guard=point('[data-combat-held="guard"]',2)
    old=actor(state())['attachment']['localZ']
    b.call('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[move]})
    b.call('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[move,guard]});time.sleep(.4)
    held=state()
    check('Two touch pointers independently move and guard',actor(held)['guard'] and actor(held)['attachment']['localZ']!=old)
    # CDP touchEnd identifies the fingers to END, not the fingers remaining.
    b.call('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[guard]});time.sleep(.2)
    check('Releasing guard does not release movement pointer',not actor(state())['guard'] and b.evaluate("document.querySelector('[data-move=forward]').dataset.held==='true'"))
    b.call('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]});time.sleep(.2)
    cancelled=actor(state())['attachment']['localZ'];time.sleep(.4)
    check('Pointercancel clears held movement and guard',not actor(state())['guard'] and abs(actor(state())['attachment']['localZ']-cancelled)<.001)
    fit=b.evaluate("({width:document.documentElement.scrollWidth,viewport:innerWidth,buttons:[...document.querySelectorAll('#bd938-play button,#bd938-play a')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,b:r.bottom}})})")
    check('Mobile combat controls fit and remain touchable',fit['width']<=fit['viewport'] and all(p['w']>=44 and p['h']>=44 and p['b']<=845 for p in fit['buttons']),fit)
    b.shot('combat-mobile-390')
    b.click('#bd938-pause');frozen=state()['session']['combat'];time.sleep(.4)
    check('Pause freezes actor actions, arrows and handoff timers',state()['session']['combat']==frozen)
    b.click('[data-dialog-action="2"]');d=state()
    check('Actor layer disposes loops, listeners, avatars and labels',all(d[k]==0 for k in ['activeLoops','sessionListeners','renderers','geometries','materials','observers','canvases']) and b.evaluate("document.querySelectorAll('.bd938-actor-label').length===0"))
    errors()
    check('No uncaught JS exception or hidden simulation fault',not exceptions and not d['lastFault'],exceptions)
except Exception as exc:
    failure={'error':str(exc),'traceback':traceback.format_exc(),'events':b.events}
    print(failure['traceback'],flush=True)
    try:failure['state']=state();b.shot('combat-failure')
    except Exception:pass
finally:
    result={'date':'2026-11-02','checks':checks,'passed':sum(c['passed'] for c in checks),'total':len(checks),'failure':failure,'observations':observations,'browser':b.version,'actualPlaythrough':True,'physicalDeviceTested':False,'remoteBackendBlocked':True}
    (HERE/'combat-ui-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');b.close()
raise SystemExit(1 if failure or any(not c['passed'] for c in checks) else 0)
