"""Real UI orders, then keyboard boarding/melee while both squads continue."""
from pathlib import Path
import importlib.util
import json
import time
import traceback

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('audit', HERE.parent/'audit_capture.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit);audit.OUT=HERE
b=audit.Browser();checks=[];failure=None
def check(name,ok,evidence=None):
    checks.append({'name':name,'passed':bool(ok),'evidence':evidence});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
def state():return b.evaluate("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics())")
def wait(expr,seconds=25):
    start=time.monotonic()
    while time.monotonic()-start<seconds:
        if b.evaluate(expr):return
        time.sleep(.1)
    raise RuntimeError('Timeout: '+expr)
def ws(expr,seconds=25):wait("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>{const s=m.getDiagnostics(),a=s.session?.combat?.actors.find(p=>p.id===s.session.combat.controlledId);return "+expr+"})",seconds)
def key(kind,code,value):b.call('Input.dispatchKeyEvent',{'type':kind,'code':code,'key':value})
def value(selector,v):b.evaluate("(()=>{const e=document.querySelector("+json.dumps(selector)+");e.value="+json.dumps(str(v))+";e.dispatchEvent(new Event('change',{bubbles:true}));})()")
def start(width=1365,height=900):
    b.navigate('game-bach-dang-938/index.html',width,height)
    for sel in ['#bd938-next','[data-quality="economy"]','#bd938-load']:b.click(sel)
    wait("document.querySelector('#bd938-root').dataset.state==='BRIEFING'")
    b.click('[data-dialog-action="0"]');ws('s.session?.tick>2')
try:
    start();b.click('[data-combat-action="map"]');ws('s.session.combat.mapOpen')
    wait("!document.querySelector('#bd938-army-panel').hidden && document.querySelector('#bd938-army-squad').options.length===4")
    check('Tactical panel lists four separately commandable squads',b.evaluate("document.querySelector('#bd938-army-squad').options.length===4"))
    value('#bd938-army-squad','T-001');value('#bd938-army-z',15);b.click('[data-army-action="order"]')
    ws("s.session.army.squads.find(t=>t.id==='T-001').order?.type==='move'")
    value('#bd938-army-squad','T-002');value('#bd938-army-z',20);b.click('[data-army-action="order"]')
    ws("s.session.army.squads.find(t=>t.id==='T-002').order?.type==='move'")
    value('#bd938-army-resource','medicine');value('#bd938-army-amount',5);b.click('[data-army-action="convoy"]')
    ws("s.session.army.convoys.some(c=>c.resource==='medicine'&&c.amount===5)")
    check('Map sends a finite selected supply cargo',state()['session']['army']['depots'][0]['stock']['medicine']==20)
    baseline=state()['session']['army']['squads'][:2];b.shot('orders-desktop')
    check('Different squads receive independent objectives',baseline[0]['order']['point']['z']==15 and baseline[1]['order']['point']['z']==20)
    b.click('#bd938-map [data-combat-action="map"]');ws('!s.session.combat.mapOpen')
    b.click('#bd938-canvas');key('keyDown','KeyW','w');ws('s.session.river.z<19.5',30);key('keyUp','KeyW','w')
    key('keyDown','Space',' ');key('keyUp','Space',' ');ws('s.session.river.readings.speedMps<.25',10)
    b.click('#bd938-camera');b.click('[data-combat-action="interact"]');ws('!s.session.combat.helm')
    b.click('#bd938-canvas');key('keyDown','KeyW','w');ws('a.attachment?.localZ < -2.65',8);key('keyUp','KeyW','w')
    b.click('[data-combat-action="board"]');ws("a.attachment?.boatId==='enemy-boat'",8)
    before=state()['session'];b.click('#bd938-canvas');key('keyDown','KeyJ','j');time.sleep(.15);key('keyUp','KeyJ','j')
    ws('(s.session.combat.eventCounts.MeleeResolved||0)>0',8);time.sleep(1.5);after=state()['session']
    check('Character performs real boarding and melee',after['combat']['eventCounts'].get('Landed',0)>0 and after['combat']['eventCounts'].get('MeleeResolved',0)>0)
    changes=[baseline[i]['z']-after['army']['squads'][i]['z'] for i in range(2)]
    check('Both squads continue their tasks while player fights',all(x>1 for x in changes) and all(after['army']['squads'][i]['order']['type']=='move' for i in range(2)),changes)
    check('Squads do not stop while melee is resolving',after['army']['tick']>before['army']['tick'] and after['tick']>before['tick'])
    b.shot('melee-while-squads-move')
    b.click('[data-combat-action="map"]');ws('s.session.combat.mapOpen');value('#bd938-army-squad','T-001');b.click('[data-army-action="cancel"]');ws("s.session.army.squads.find(t=>t.id==='T-001').order===null")
    check('A squad order can be canceled through the map',state()['session']['army']['squads'][0]['order'] is None)
    b.click('#bd938-pause');frozen=state()['session']['army']['tick'];time.sleep(.5)
    check('Pause freezes army simulation too',state()['session']['army']['tick']==frozen)
    b.click('[data-dialog-action="2"]');s=state();check('Exit disposes the army session and render loop',s['session'] is None and s['activeLoops']==0 and s['renderers']==0)
    start(320,760);b.click('[data-combat-action="map"]');ws('s.session.combat.mapOpen')
    b.click('[data-army-action="order"]');ws("s.session.army.squads[0].order!==null")
    dims=b.evaluate("({width:document.documentElement.scrollWidth,viewport:innerWidth,panel:document.querySelector('#bd938-map').scrollHeight,client:document.querySelector('#bd938-map').clientHeight,button:document.querySelector('[data-army-action=order]').getBoundingClientRect().toJSON()})")
    check('320px map can scroll to and use order controls',dims['width']<=dims['viewport'] and dims['button']['height']>=44,dims);b.shot('army-mobile-320')
    close=b.evaluate("(()=>{const e=document.querySelector('#bd938-map [data-combat-action=map]'),r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {top:r.top,bottom:r.bottom,hit:e===h||e.contains(h)}})()")
    check('Map close stays reachable when the mobile panel scrolls',close['top']>=0 and close['bottom']<=760 and close['hit'],close)
    check('No uncaught JS errors or simulation fault',not [e for e in b.events if e.get('method')=='Runtime.exceptionThrown'] and not state()['lastFault'])
except Exception as exc:
    failure={'error':str(exc),'traceback':traceback.format_exc()};print(failure['traceback'],flush=True)
    try:failure['state']=state();b.shot('army-ui-failure')
    except Exception:pass
finally:
    result={'checks':checks,'passed':sum(x['passed'] for x in checks),'total':len(checks),'failure':failure,'browser':b.version,'actualPlaythrough':True,'physicalDeviceTested':False,'firebaseBlocked':True}
    (HERE/'army-ui.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');b.close()
raise SystemExit(1 if failure or any(not x['passed'] for x in checks) else 0)
