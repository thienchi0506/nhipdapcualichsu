"""Isolated UI/lifecycle checks. Requires local HTTP server on 127.0.0.1:8765.
No credentials or remote writes. Old audit Browser blocks Firebase backends.
"""
from pathlib import Path
import base64
import hashlib
import importlib.util
import json
import time
import traceback

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
spec = importlib.util.spec_from_file_location('bd938_audit', HERE.parent / 'audit_capture.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
audit.OUT = HERE

checks, observations = [], []


def check(name, condition, evidence=None):
    item = {'name': name, 'passed': bool(condition)}
    if evidence is not None:
        item['evidence'] = evidence
    checks.append(item)
    print(('PASS ' if condition else 'FAIL ') + name, flush=True)


def wait_for(browser, expression, seconds=15):
    for _ in range(int(seconds * 10)):
        if browser.evaluate(expression):
            return
        time.sleep(.1)
    raise RuntimeError('Timed out: ' + expression)


def state(browser):
    return browser.evaluate("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics())")


def shot(browser, name):
    result = browser.call('Page.captureScreenshot', {'format': 'png'})
    (HERE / (name + '.png')).write_bytes(base64.b64decode(result['data']))


def open_demo(browser, hero='H01', quality='economy'):
    browser.click(f'[data-hero="{hero}"]')
    browser.click('#bd938-next')
    browser.click(f'[data-quality="{quality}"]')
    browser.click('#bd938-load')
    wait_for(browser, "document.querySelector('#bd938-root').dataset.state==='BRIEFING'")
    before = state(browser)
    check('Briefing has scene and no simulation loop', before['canvases'] == 1 and before['activeLoops'] == 0 and before['session']['scene']['drawCalls'] > 0)
    browser.click('[data-dialog-action="0"]')
    wait_for(browser, "document.querySelector('#bd938-root').dataset.state==='RUNNING'")
    return state(browser)


browser = audit.Browser()
failure = None
try:
    browser.navigate('trang-chinh.html')
    links = browser.evaluate("[...document.querySelectorAll('.card--sa-ban a')].map(e=>({href:e.getAttribute('href'),text:e.innerText}))")
    check('Homepage has both old hrefs and one new href', [item['href'] for item in links] == ['sa-ban.html', 'sa-ban-3d.html', 'game-bach-dang-938/index.html'], links)
    time.sleep(.5)
    requests = browser.evaluate("performance.getEntriesByType('resource').filter(r=>r.name.includes('/game-bach-dang-938/')).map(r=>r.name)")
    check('Homepage does not request new game code/assets', requests == [], requests)
    browser.click('#bd938-entry')
    wait_for(browser, "!!document.querySelector('#bd938-root')")
    check('Actual new entry opens dedicated game', '/game-bach-dang-938/index.html' in browser.evaluate('location.pathname'))
    check('Shell has no canvas/renderer/loop', state(browser)['canvases'] == 0 and state(browser)['renderers'] == 0 and state(browser)['activeLoops'] == 0)
    check('Shell has not fetched Three.js', not browser.evaluate("performance.getEntriesByType('resource').some(r=>r.name.includes('three.module.js'))"))
    shot(browser, 'characters-desktop')

    initial = open_demo(browser, 'H03', 'balanced')
    check('Selected hero and quality used', initial['session']['heroId'] == 'H03' and initial['preferences']['quality'] == 'balanced')
    time.sleep(.3)
    check('Exactly one running loop', state(browser)['activeLoops'] == 1 and state(browser)['session']['frames'] > 0)
    shot(browser, 'scene-desktop')
    browser.click('#bd938-canvas')
    before = state(browser)['session']
    browser.call('Input.dispatchKeyEvent', {'type': 'keyDown', 'key': 'w', 'code': 'KeyW'})
    time.sleep(.4)
    browser.call('Input.dispatchKeyEvent', {'type': 'keyUp', 'key': 'w', 'code': 'KeyW'})
    after = state(browser)['session']
    check('Focused canvas WASD moves boat', after['z'] < before['z'], {'before': before['z'], 'after': after['z']})
    browser.click('#bd938-camera')
    check('Camera toggle switches to follow', state(browser)['session']['scene']['mode'] == 'follow')
    browser.click('#bd938-pause')
    paused = state(browser)
    time.sleep(.5)
    check('Pause stops tick and RAF', paused['activeLoops'] == 0 and state(browser)['session']['tick'] == paused['session']['tick'])
    shot(browser, 'pause-desktop')
    browser.click('[data-dialog-action="0"]')
    check('Resume starts one loop', state(browser)['activeLoops'] == 1)
    browser.click('#bd938-finish')
    check('Finish shows result with stopped scene', state(browser)['state'] == 'RESULTS' and state(browser)['activeLoops'] == 0)
    shot(browser, 'result-desktop')
    browser.click('[data-dialog-action="0"]')
    wait_for(browser, "document.querySelector('#bd938-root').dataset.state==='BRIEFING'")
    replay = state(browser)
    check('Replay creates one fresh scene at tick zero', replay['session']['tick'] == 0 and replay['canvases'] == 1 and replay['renderers'] == 1 and replay['sessionsDisposed'] == 1)
    browser.click('[data-dialog-action="0"]')
    browser.click('#bd938-pause')
    browser.click('[data-dialog-action="2"]')
    disposed = state(browser)
    check('Back to choices frees all session resources', all(disposed[key] == 0 for key in ['canvases','activeLoops','renderers','geometries','materials','observers','sessionListeners']), disposed)
    for index in range(5):
        open_demo(browser, ['H01','H02','H03','H04','H01'][index])
        browser.click('#bd938-pause')
        browser.click('[data-dialog-action="2"]')
        current = state(browser)
        check(f'Open/close cycle {index+1} has zero residual resources', all(current[k] == 0 for k in ['canvases','activeLoops','renderers','geometries','materials','observers','sessionListeners']))
    observations.append({'cycles': state(browser)})

    for width in [320, 360, 375, 390, 430]:
        browser.navigate('game-bach-dang-938/index.html', width, 844)
        check(f'Choices fit {width}px', browser.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        current = open_demo(browser, 'H02', 'economy')
        fit = browser.evaluate("(()=>{const buttons=[...document.querySelectorAll('#bd938-play button,#bd938-play a')].filter(e=>e.getBoundingClientRect().width>0);return {width:document.documentElement.scrollWidth,viewport:innerWidth,buttons:buttons.map(e=>({id:e.id,label:e.getAttribute('aria-label')||e.innerText,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,bottom:e.getBoundingClientRect().bottom})),canvas:{w:document.querySelector('canvas').width,h:document.querySelector('canvas').height,rect:document.querySelector('canvas').getBoundingClientRect().toJSON()}}})()")
        check(f'Play fits {width}px and buttons are touchable', fit['width'] <= width and all(item['w'] >= 44 and item['h'] >= 44 and item['bottom'] <= 845 for item in fit['buttons']), fit)
        button = browser.evaluate("document.querySelector('[data-move=forward]').getBoundingClientRect().toJSON()")
        before = state(browser)['session']['z']
        x, y = button['x'] + button['width']/2, button['y'] + button['height']/2
        browser.call('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
        time.sleep(1.2)
        browser.call('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        check(f'Touch steers boat at {width}px', state(browser)['session']['z'] < before)
        shot(browser, f'scene-{width}')
        browser.click('#bd938-pause')
        rect = browser.evaluate("document.querySelector('#bd938-dialog').getBoundingClientRect().toJSON()")
        check(f'Pause dialog fits {width}px', rect['x'] >= 0 and rect['y'] >= 0 and rect['x']+rect['width'] <= width+1 and rect['y']+rect['height'] <= 845, rect)
        browser.click('[data-dialog-action="2"]')
        browser.call('Page.reload')
        time.sleep(.5)
        check(f'Quality preference survives reload {width}px', state(browser)['preferences']['quality'] == 'economy' and state(browser)['preferences']['hero'] == 'H02')
    browser.navigate('game-bach-dang-938/index.html', 1365, 900)
    open_demo(browser)
    browser.evaluate("window.dispatchEvent(new Event('blur'))")
    check('Window blur pauses without auto-resume', state(browser)['state'] == 'PAUSED' and state(browser)['activeLoops'] == 0)
    browser.click('[data-dialog-action="0"]')
    browser.click('[data-exit]')
    wait_for(browser, "location.pathname.endsWith('/trang-chinh.html')")
    check('Exit returns to actual Sa Ban card', browser.evaluate("location.hash==='#khu-vuc' && !!document.querySelector('#bd938-entry')"))
    browser.click('.card--sa-ban a[href="sa-ban.html"]')
    wait_for(browser, "location.pathname.endsWith('/sa-ban.html')")
    check('Old 2D entry remains its own document', browser.evaluate("!!document.getElementById('lobby-screen') && !document.getElementById('bd938-root')"))
    browser.navigate('trang-chinh.html')
    browser.click('.card--sa-ban a[href="sa-ban-3d.html"]')
    wait_for(browser, "location.pathname.endsWith('/sa-ban-3d.html')")
    check('Old 3D entry remains its own document', browser.evaluate("!!document.getElementById('lobby-3d-modal') && !document.getElementById('bd938-root')"))
    browser.navigate('tang-thu-cac.html')
    check('Library navigation loads without new game payload', browser.evaluate("document.readyState==='complete' && !performance.getEntriesByType('resource').some(r=>r.name.includes('/game-bach-dang-938/'))"))
    browser.navigate('thao-truong.html')
    check('Exam navigation loads without new game payload', browser.evaluate("document.readyState==='complete' && !performance.getEntriesByType('resource').some(r=>r.name.includes('/game-bach-dang-938/'))"))
except Exception as exc:
    failure = {'error':str(exc),'traceback':traceback.format_exc(),'browserEvents':browser.events}
    print(failure['traceback'], flush=True)
    try: shot(browser, 'failure')
    except Exception: pass
finally:
    report = {'date':'2026-11-02','browser':browser.version,'checks':checks,'passed':sum(x['passed'] for x in checks),'total':len(checks),'failure':failure,'observations':observations,'backendBlocked':True,'physicalDeviceTested':False,'fpsBenchmark':False}
    (HERE/'browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    browser.close()
raise SystemExit(1 if failure or any(not item['passed'] for item in checks) else 0)
