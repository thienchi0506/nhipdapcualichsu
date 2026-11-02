"""Reproduce final screenshots and layout/render checks; HTTP server :8765 required."""
from pathlib import Path
import importlib.util
import json
import time

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('visual_audit', HERE.parent/'audit_capture.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
audit.OUT = HERE
browser = audit.Browser()
checks = []


def check(name, condition, evidence=None):
    checks.append({'name':name,'passed':bool(condition),'evidence':evidence})
    print(name, condition, flush=True)


def wait(expression):
    for _ in range(150):
        if browser.evaluate(expression): return
        time.sleep(.1)
    raise RuntimeError(expression)


try:
    for width in [1365,390]:
        browser.navigate('trang-chinh.html',width,900 if width==1365 else 844)
        browser.evaluate("document.querySelector('.card--sa-ban').scrollIntoView({block:'center',behavior:'instant'})")
        fit=browser.evaluate("[...document.querySelectorAll('.card--sa-ban a')].map(e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width,h:r.height,overflow:e.scrollWidth>e.clientWidth+1}})")
        check('Homepage three entries fit '+str(width),all(row['x']>=0 and row['x']+row['w']<=width+1 and row['h']>=44 and not row['overflow'] for row in fit),fit)
        browser.shot('home-sa-ban-'+str(width))
        browser.click('#bd938-entry')
        wait("!!document.getElementById('bd938-root')")
        browser.click('[data-hero="H04"]')
        browser.shot('final-characters-'+str(width))
        browser.click('#bd938-next')
        browser.click('[data-quality="economy"]')
        browser.shot('quality-'+str(width))
        browser.click('#bd938-load')
        wait("document.getElementById('bd938-root').dataset.state==='BRIEFING'")
        browser.click('[data-dialog-action="0"]')
        time.sleep(.2)
        state=browser.evaluate("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics())")
        check('Final scene renders after color correction '+str(width),state['session']['scene']['drawCalls']>0 and state['renderers']==1 and state['session']['heroId']=='H04',state['session']['scene'])
        browser.shot('final-scene-'+str(width))
        check('No uncaught new game error '+str(width),not any(event.get('method')=='Runtime.exceptionThrown' for event in browser.events))
        browser.click('#bd938-pause')
        browser.click('[data-dialog-action="2"]')
        state=browser.evaluate("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics())")
        check('Final scene disposes all owned resources '+str(width),all(state[key]==0 for key in ['renderers','activeLoops','geometries','materials','observers','sessionListeners','canvases']))
finally:
    (HERE/'visual-checks.json').write_text(json.dumps({'checks':checks,'passed':sum(row['passed'] for row in checks),'total':len(checks),'fpsBenchmark':False},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    browser.close()
raise SystemExit(0 if len(checks)==8 and all(row['passed'] for row in checks) else 1)
