"""Reproduce pure simulation tests and real-time UI river scenarios on localhost:8765.
Uses an isolated Chrome profile and blocks remote Firebase backends.
No battle-win fixtures, no campaign writes, no FPS performance claim.
"""
from pathlib import Path
import importlib.util
import json
import time
import traceback

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('river_audit', HERE.parent/'audit_capture.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
audit.OUT = HERE
b = audit.Browser()
checks, observations, exceptions = [], [], []
failure = None


def check(name, condition, evidence=None):
    checks.append({'name':name, 'passed':bool(condition), 'evidence':evidence})
    print(('PASS ' if condition else 'FAIL ')+name, flush=True)


def state():
    return b.evaluate("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics())")


def wait(expression, seconds=20):
    start = time.monotonic()
    last_report = -1
    while time.monotonic()-start < seconds:
        if b.evaluate(expression): return
        elapsed = int(time.monotonic()-start)
        if elapsed//10 > last_report:
            last_report = elapsed//10
            print('Waiting scenario: '+str(elapsed)+'s', flush=True)
        time.sleep(.15)
    raise RuntimeError('Timed out: '+expression)


def wait_state(expression, seconds=20):
    wait("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>{const s=m.getDiagnostics();return "+expression+"})", seconds)


def errors():
    exceptions.extend(e for e in b.events if e.get('method')=='Runtime.exceptionThrown')


def open_case(scenario, vessel='light', width=1365):
    b.navigate('game-bach-dang-938/index.html',width,900 if width==1365 else 844)
    b.evaluate("document.getElementById('bd938-scenario').value="+json.dumps(scenario)+";document.getElementById('bd938-scenario').dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('bd938-vessel').value="+json.dumps(vessel)+";document.getElementById('bd938-vessel').dispatchEvent(new Event('change',{bubbles:true}))")
    b.click('#bd938-next'); b.click('[data-quality="economy"]'); b.click('#bd938-load')
    wait("document.getElementById('bd938-root').dataset.state==='BRIEFING'")
    b.click('[data-dialog-action="0"]')


def panel():
    if not b.evaluate("document.getElementById('bd938-systems').open"):
        b.click('#bd938-systems summary')


def key(code, key, duration):
    b.click('#bd938-canvas')
    b.call('Input.dispatchKeyEvent',{'type':'keyDown','code':code,'key':key})
    time.sleep(duration)
    b.call('Input.dispatchKeyEvent',{'type':'keyUp','code':code,'key':key})


try:
    b.navigate('game-bach-dang-938/tests/index.html')
    physics = b.evaluate("import('/game-bach-dang-938/tests/river-tests.js').then(m=>m.runRiverTests())")
    (HERE/'physics-checks.json').write_text(json.dumps(physics,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    check('Deterministic physics and frame-cadence matrix',physics['passed']==physics['total'],{'passed':physics['passed'],'total':physics['total']})
    errors()

    open_case('shoal','transport')
    river=state()['session']['river']
    check('Heavy vessel choice reaches simulation with increased draft',river['vesselType']=='transport' and river['readings']['draft']>1)
    b.click('#bd938-canvas')
    b.call('Input.dispatchKeyEvent',{'type':'keyDown','code':'KeyW','key':'w'})
    wait_state("s.session.river.stuck?.kind==='ground'",20)
    b.call('Input.dispatchKeyEvent',{'type':'keyUp','code':'KeyW','key':'w'})
    ground=state()['session']['river'];observations.append({'heavy_ground':ground})
    wait("document.getElementById('bd938-river-alert').textContent.includes('MẮC CẠN')")
    check('Real UI voyage grounds the loaded transport',ground['eventCounts'].get('Grounded')==1 and 'MẮC CẠN' in b.evaluate("document.getElementById('bd938-river-alert').textContent"))
    b.shot('heavy-grounded-desktop')
    b.click('#bd938-pause'); frozen=state()['session']['river'];time.sleep(.6)
    after=state()['session']['river']
    check('Pause freezes tide, drift and recovery clock',after==frozen)
    b.click('[data-dialog-action="0"]');errors()

    open_case('rudder')
    key('KeyA','a',1.2)
    check('Broken rudder cannot turn via actual keyboard input',state()['session']['river']['yaw']==0)
    panel();b.click('[data-river-action="repair"]')
    wait_state("s.session.river.components.rudder>=5",18)
    repaired=state()['session']['river']
    check('UI repair restores rudder and debits timber once',repaired['components']['rudder']==5 and repaired['timber']==38 and repaired['eventCounts'].get('RepairCompleted')==1,repaired)
    time.sleep(.5)
    check('Completed repair does not keep spending timber per frame',state()['session']['river']['timber']==38)
    b.shot('rudder-repaired-desktop')
    b.click('[data-river-action="anchor"]')
    key('KeyA','a',1.2)
    check('Repair visibly restores steering response',state()['session']['river']['yaw']>0)
    errors()

    open_case('harbor',width=320)
    panel();b.click('[data-river-action="unload"]')
    wait_state('s.session.river.cargoKg===0')
    check('Touch panel unload reduces draft with visible readouts',state()['session']['river']['readings']['draft']<.5 and '0 kg' in b.evaluate("document.getElementById('bd938-stores').textContent"))
    fit=b.evaluate("({w:document.documentElement.scrollWidth,vw:innerWidth,canvasH:document.querySelector('canvas').getBoundingClientRect().height,finishBottom:document.getElementById('bd938-finish').getBoundingClientRect().bottom})")
    check('Open systems panel fits mobile and leaves a visible game area',fit['w']<=fit['vw'] and fit['canvasH']>=130 and fit['finishBottom']<=845,fit)
    b.shot('systems-mobile-320');errors()

    open_case('ebb')
    wait_state("s.session.river.stuck?.kind==='stake'",45)
    pinned=state()['session']['river'];time.sleep(1)
    held=state()['session']['river']
    check('Real tide creates one contact episode, not per-frame damage',pinned['components']==held['components'] and pinned['eventCounts'].get('StakeImpact')==held['eventCounts'].get('StakeImpact'),{'before':pinned['eventCounts'],'after':held['eventCounts']})
    check('Hidden-stake warning and draft data are visible', 'MẮC CỌC' in b.evaluate("document.getElementById('bd938-river-alert').textContent") and held['readings']['waterY']>0.05)
    b.shot('ebb-pinned-desktop')
    panel();b.click('[data-river-action="recover"]')
    wait_state("(s.session.river.eventCounts.Freed||0)>0",95)
    b.click('[data-river-action="anchor"]')
    wait_state('s.session.river.anchor')
    freed=state()['session']['river'];observations.append({'live_ebb_recovered':freed})
    check('Real-time crew work pulls vessel out without teleporting',freed['stuck'] is None and freed['eventCounts'].get('Freed')==1 and freed['z']>-17,freed)
    b.shot('ebb-recovered-desktop')
    b.click('#bd938-finish')
    check('Water simulation finishes through existing results UI',state()['state']=='RESULTS' and state()['activeLoops']==0)
    b.click('[data-dialog-action="0"]')
    wait("document.getElementById('bd938-root').dataset.state==='BRIEFING'")
    fresh=state()['session']['river']
    check('Sandbox replay resets damage, cargo and tide clock explicitly',fresh['components']['hull']==100 and fresh['tick']==0 and fresh['timber']==40 and fresh['scenarioId']=='ebb')
    b.click('[data-dialog-action="1"]')
    d=state()
    check('Water layer has no surviving loop/listener/GPU resource after exit',all(d[k]==0 for k in ['activeLoops','sessionListeners','renderers','geometries','materials','observers','canvases']))
    errors()
    check('No uncaught JavaScript exception in river UI scenarios',not exceptions,exceptions)
except Exception as exc:
    failure={'error':str(exc),'traceback':traceback.format_exc(),'events':b.events}
    print(failure['traceback'],flush=True)
    try:b.shot('river-ui-failure')
    except Exception:pass
finally:
    report={'date':'2026-11-02','checks':checks,'passed':sum(row['passed'] for row in checks),'total':len(checks),'failure':failure,'observations':observations,'browser':b.version,'physicalDeviceTested':False,'newGameFPSBenchmarked':False,'remoteBackendBlocked':True}
    (HERE/'river-ui-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    b.close()
raise SystemExit(1 if failure or any(not row['passed'] for row in checks) else 0)
