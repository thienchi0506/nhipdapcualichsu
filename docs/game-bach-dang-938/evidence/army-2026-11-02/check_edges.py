"""Failure, cancellation, cleanup and navigation cases for the local game shell."""
from pathlib import Path
import base64
import importlib.util
import json
import time
import traceback

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('bd938_edge_audit', HERE.parent / 'audit_capture.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
audit.OUT = HERE
checks, observations, exceptions = [], [], []


def check(name, passed, data=None):
    checks.append({'name': name, 'passed': bool(passed), 'evidence': data})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)


def wait(expression, seconds=15):
    for _ in range(int(seconds*10)):
        if b.evaluate(expression): return
        time.sleep(.1)
    raise RuntimeError('Timed out: '+expression)


def state():
    return b.evaluate("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics())")


def scene():
    b.click('#bd938-next'); b.click('#bd938-load')
    wait("document.querySelector('#bd938-root').dataset.state==='BRIEFING'")
    b.click('[data-dialog-action="0"]')


def shot(name):
    data=b.call('Page.captureScreenshot', {'format':'png'})
    (HERE/(name+'.png')).write_bytes(base64.b64decode(data['data']))


def remember_errors():
    exceptions.extend(event for event in b.events if event.get('method') == 'Runtime.exceptionThrown')


blocked = ['*://identitytoolkit.googleapis.com/*','*://securetoken.googleapis.com/*','*://firestore.googleapis.com/*','*://firebasestorage.googleapis.com/*','*://firebaseinstallations.googleapis.com/*']
b=audit.Browser()
failure=None
try:
    # Independent RAF instrumentation: does not rely on the app's counters.
    b.call('Page.addScriptToEvaluateOnNewDocument', {'source': """(()=>{const pending=new Set(),raf=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);window.__bd938TestRAF=pending;window.requestAnimationFrame=fn=>{const id=raf(t=>{pending.delete(id);fn(t)});pending.add(id);return id};window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id)}})()"""})
    b.navigate('game-bach-dang-938/index.html')
    scene()
    b.evaluate("window.__bd938TestCanvas=document.getElementById('bd938-canvas')")
    check('Running scene has one independently counted RAF', b.evaluate('window.__bd938TestRAF.size===1'))
    b.click('#bd938-pause')
    check('Paused scene has no pending RAF', b.evaluate('window.__bd938TestRAF.size===0'))
    b.click('[data-dialog-action="2"]')
    time.sleep(.2)
    check('Disposed canvas WebGL context is lost', b.evaluate("(()=>{const c=window.__bd938TestCanvas;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl.isContextLost()})()"))
    handle=b.call('Runtime.evaluate', {'expression':'window.__bd938TestCanvas'})['result']['objectId']
    listeners=b.call('DOMDebugger.getEventListeners', {'objectId':handle})['listeners']
    check('Disposed canvas has no input or WebGL listeners', not listeners, [x['type'] for x in listeners])
    check('Disposed scene has no pending RAF', b.evaluate('window.__bd938TestRAF.size===0'))
    remember_errors()

    # Real network latency, then cancel with the visible UI.
    b.call('Network.setCacheDisabled', {'cacheDisabled':True})
    b.call('Network.emulateNetworkConditions', {'offline':False,'latency':1600,'downloadThroughput':2000000,'uploadThroughput':2000000})
    b.click('#bd938-next'); b.click('#bd938-load')
    wait("document.querySelector('#bd938-root').dataset.state==='LOAD'")
    progress=b.evaluate("({value:document.getElementById('bd938-progress').value,text:document.getElementById('bd938-loading-text').textContent})")
    check('Loading progress reflects incomplete network work', progress['value']==0, progress)
    shot('loading-real-latency')
    b.click('#bd938-cancel-load')
    time.sleep(2)
    current=state()
    check('Cancelled load cannot create late scene', current['state']=='SHELL' and current['renderers']==0 and current['canvases']==0 and current['activeLoops']==0 and current['activeLoads']==0, current)
    b.call('Network.emulateNetworkConditions', {'offline':False,'latency':0,'downloadThroughput':-1,'uploadThroughput':-1})
    remember_errors()

    b.call('Network.setBlockedURLs', {'urls':blocked+['*shell-scene.json*']})
    b.click('#bd938-next'); b.click('#bd938-load')
    wait("document.querySelector('#bd938-root').dataset.state==='ERROR'")
    check('Failed data request has usable error dialog and zero loop', state()['dialogOpen'] and state()['activeLoops']==0 and state()['canvases']==0)
    shot('load-error')
    b.call('Network.setBlockedURLs', {'urls':blocked})
    b.click('[data-dialog-action="0"]')
    wait("document.querySelector('#bd938-root').dataset.state==='BRIEFING'")
    b.click('[data-dialog-action="0"]')
    check('Retry after network failure creates one live session', state()['activeLoops']==1 and state()['renderers']==1)
    # Actual context loss, not an artificial win/phase fixture.
    b.evaluate("(()=>{const c=document.querySelector('canvas');const gl=c.getContext('webgl2')||c.getContext('webgl');gl.getExtension('WEBGL_lose_context').loseContext()})()")
    wait("document.querySelector('#bd938-root').dataset.state==='ERROR'")
    check('WebGL loss stops running scene and offers recovery', state()['activeLoops']==0 and state()['dialogOpen'])
    b.click('[data-dialog-action="0"]')
    wait("document.querySelector('#bd938-root').dataset.state==='BRIEFING'")
    check('WebGL recovery replaces old renderer without duplicate canvas', state()['renderers']==1 and state()['canvases']==1 and state()['activeLoops']==0)
    b.click('[data-dialog-action="0"]')
    # Rapid programmatic clicks exercise the same delegated UI handler.
    b.evaluate("document.getElementById('bd938-pause').click();document.getElementById('bd938-pause').click()")
    b.evaluate("document.querySelector('[data-dialog-action=\"1\"]').click();document.getElementById('bd938-load').click()")
    wait("document.querySelector('#bd938-root').dataset.state==='BRIEFING'")
    check('Repeated start/replay actions still create only one scene', state()['renderers']==1 and state()['canvases']==1 and state()['activeLoops']==0)
    b.click('[data-dialog-action="0"]')
    remember_errors()
    shot('final-scene-desktop')

    # Resize the live view to landscape; keep controls and popup available.
    b.call('Emulation.setDeviceMetricsOverride', {'width':844,'height':390,'deviceScaleFactor':1,'mobile':True})
    time.sleep(.25)
    fit=b.evaluate("({w:document.documentElement.scrollWidth,vw:innerWidth,buttons:[...document.querySelectorAll('#bd938-play button,#bd938-play a')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {w:r.width,h:r.height,b:r.bottom}})})")
    check('Landscape resize retains touch targets inside viewport', fit['w']<=fit['vw'] and all(x['w']>=44 and x['h']>=44 and x['b']<=391 for x in fit['buttons']),fit)
    shot('landscape-844x390')
    b.click('#bd938-pause')
    b.click('[data-dialog-action="2"]')
    # Persisted pageshow uses the same lifecycle hook as a bfcache return.
    b.evaluate("window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))")
    check('BFCache lifecycle guard returns to idle shell', state()['state']=='SHELL' and state()['activeLoops']==0 and state()['canvases']==0)
    remember_errors()

    # A real page navigation and browser Back are also exercised.
    b.navigate('game-bach-dang-938/index.html')
    scene(); b.click('[data-exit]')
    wait("location.pathname.endsWith('/trang-chinh.html')")
    history=b.call('Page.getNavigationHistory')
    entry=history['entries'][history['currentIndex']-1]
    b.call('Page.navigateToHistoryEntry', {'entryId':entry['id']})
    wait("!!document.querySelector('#bd938-root')")
    check('Actual browser Back does not resume a disposed battle', state()['state']=='SHELL' and state()['canvases']==0 and state()['activeLoops']==0)
    b.navigate('tang-thu-cac.html')
    b.click('#search')
    for key,code in [('w','KeyW'),('a','KeyA'),('s','KeyS'),('d','KeyD'),(' ','Space')]:
        b.call('Input.dispatchKeyEvent', {'type':'keyDown','key':key,'code':code,'text':key})
        b.call('Input.dispatchKeyEvent', {'type':'keyUp','key':key,'code':code})
    check('Website search receives WASD and Space after game exit', b.evaluate("document.getElementById('search').value==='wasd '"))
    remember_errors()

    denied=b.call('Page.addScriptToEvaluateOnNewDocument', {'source':"const originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='dcls.bd938.preferences.v1')throw new DOMException('Storage denied','SecurityError');return originalSetItem.call(this,k,v)}"})['identifier']
    b.navigate('game-bach-dang-938/index.html')
    b.click('[data-hero="H04"]')
    check('Denied preference storage gives clear fallback', b.evaluate("document.getElementById('bd938-preference-status').textContent.includes('không cho lưu')"))
    scene()
    check('Game starts when preferences cannot be persisted', state()['state']=='RUNNING' and state()['session']['heroId']=='H04')
    remember_errors()
    b.call('Page.removeScriptToEvaluateOnNewDocument', {'identifier':denied})
    b.navigate('game-bach-dang-938/index.html')
    # Failure to create WebGL is caught and exits cleanly.
    unavailable=b.call('Page.addScriptToEvaluateOnNewDocument', {'source':"const oldContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.startsWith('webgl')||type==='experimental-webgl')return null;return oldContext.call(this,type,...args)}"})['identifier']
    b.call('Page.reload'); time.sleep(.5)
    b.click('#bd938-next'); b.click('#bd938-load')
    wait("document.querySelector('#bd938-root').dataset.state==='ERROR'")
    check('Unavailable WebGL is handled without leaked renderer', state()['renderers']==0 and state()['activeLoops']==0 and state()['canvases']==0 and state()['dialogOpen'])
    b.click('[data-dialog-action="1"]')
    check('Unavailable WebGL still allows returning to choices', state()['state']=='SHELL')
    remember_errors()
    b.call('Page.removeScriptToEvaluateOnNewDocument', {'identifier':unavailable})
    check('No uncaught JavaScript exception in edge scenarios', not exceptions,exceptions)
except Exception as exc:
    failure={'error':str(exc),'traceback':traceback.format_exc(),'events':b.events}
    print(failure['traceback'],flush=True)
    try: shot('edge-failure')
    except Exception: pass
finally:
    report={'date':'2026-11-02','checks':checks,'passed':sum(x['passed'] for x in checks),'total':len(checks),'failure':failure,'exceptions':exceptions,'browser':b.version,'backendBlocked':True,'fixtures':'network latency/blocking, forced WebGL loss/unavailable, denied storage, synthetic blur/persisted pageshow; all clearly isolated'}
    (HERE/'edge-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    b.close()
raise SystemExit(1 if failure or any(not x['passed'] for x in checks) else 0)
