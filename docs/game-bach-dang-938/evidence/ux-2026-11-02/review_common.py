"""Independent UX evidence helpers: browser input and read-only diagnostics.
No test fixtures, game state injection, live account or production writes.
"""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
spec = importlib.util.spec_from_file_location('ux_browser', HERE.parent / 'audit_capture.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
audit.OUT = HERE
Browser = audit.Browser


def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def fingerprints():
    paths = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT).decode('utf-8').split('\0')
    return {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in sorted(set(paths))
            if p and not p.startswith(('docs/', 'tools/')) and (ROOT / p).is_file()
            and Path(p).suffix in {'.html', '.css', '.js', '.json', '.rules', '.svg', '.glb', '.png', '.jpg'}}


def state(b):
    return b.evaluate("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics())")


def actor(s):
    return next(a for a in s['session']['combat']['actors'] if a['id'] == s['session']['combat']['controlledId'])


def wait(b, expression, seconds=20):
    until = time.monotonic() + seconds
    while time.monotonic() < until:
        if b.evaluate(expression):
            return True
        time.sleep(.1)
    raise RuntimeError('Timed out: ' + expression)


def ws(b, expression, seconds=20):
    return wait(b, "import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>{const s=m.getDiagnostics();const a=s.session?.combat?.actors.find(a=>a.id===s.session.combat.controlledId);return " + expression + '})', seconds)


def key(b, code, key, kind):
    b.call('Input.dispatchKeyEvent', {'type': kind, 'code': code, 'key': key})


def press(b, code, value):
    key(b, code, value, 'keyDown')
    key(b, code, value, 'keyUp')


def rect(b, selector):
    return b.evaluate('document.querySelector(' + json.dumps(selector) + ').getBoundingClientRect().toJSON()')


def touchpoint(b, selector, ident):
    r = rect(b, selector)
    return {'id': ident, 'x': r['x'] + r['width']/2, 'y': r['y'] + r['height']/2}


def layout(b):
    return b.evaluate("""(()=>{
      const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
      const info=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),x=r.x+r.width/2,y=r.y+r.height/2,t=document.elementFromPoint(x,y);return {tag:e.tagName,id:e.id,text:(e.innerText||e.getAttribute('aria-label')||e.value||'').trim().slice(0,160),rect:r.toJSON(),font:s.fontSize,lineHeight:s.lineHeight,hit:e===t||e.contains(t),inViewport:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}};
      return {viewport:[innerWidth,innerHeight],scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,scrollY,
        regions:[...document.querySelectorAll('#bd938-viewport,.bd938-river-hud,.bd938-character-hud,#bd938-river-alert,#bd938-map,#bd938-dialog,.bd938-controls,.bd938-toolbar')].filter(vis).map(info),
        actions:[...document.querySelectorAll('button,a,input,select,summary')].filter(vis).map(info),
        text:document.body.innerText,dialog:document.querySelector('dialog[open]')?.innerText||null};
    })()""")


def start(b, width=1365, height=900, hero='H01', quality='economy', begin=True):
    b.navigate('game-bach-dang-938/index.html', width, height)
    b.click('[data-hero="' + hero + '"]')
    b.click('#bd938-next')
    wait(b, "!document.getElementById('bd938-quality').hidden")
    b.click('[data-quality="' + quality + '"]')
    b.click('#bd938-load')
    ws(b, "s.state==='BRIEFING'", 30)
    if begin:
        b.click('[data-dialog-action="0"]')
        ws(b, "s.session?.tick>2")


def select(b, selector, index):
    """Choose a native select option by keyboard, not JS value injection."""
    b.click(selector)
    press(b, 'Home', 'Home')
    for _ in range(index):
        press(b, 'ArrowDown', 'ArrowDown')
    press(b, 'Enter', 'Enter')
    time.sleep(.2)


def errors(b):
    return [e for e in b.events if e.get('method') == 'Runtime.exceptionThrown']
