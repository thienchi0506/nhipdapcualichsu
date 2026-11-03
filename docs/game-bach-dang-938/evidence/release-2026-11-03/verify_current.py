"""Re-run current code and independent requirements probes. No production writes."""
from pathlib import Path
import sys, json, time, traceback, subprocess, hashlib
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
sys.path.insert(0, str(HERE.parent/'ux-2026-11-02'))
from review_common import Browser, audit, wait, ws, state, start, key, errors
audit.OUT = HERE
report = {'head': subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT).decode().strip(),
          'date':'2026-11-03', 'productionBlocked':True, 'suites':[], 'probes':[]}
def write(): (HERE/'current-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def probe(name, fn):
    item={'name':name}; report['probes'].append(item)
    try: item['evidence']=fn(); print('OBSERVED '+name,flush=True)
    except Exception as e:
        item['error']=str(e); item['traceback']=traceback.format_exc(); print('HARNESS/TEST ERROR '+name+' '+str(e)[:200],flush=True)
    write()
b=Browser();report['browser']=b.version
try:
    b.navigate('game-bach-dang-938/index.html')
    for module, export in [('river-tests','runRiverTests'),('character-tests','runCharacterTests'),('army-tests','runArmyTests'),('save-tests','runSaveTests'),('retry-tests','runRetryTests'),('session-save-tests','runSessionSaveTests')]:
        result=b.evaluate(f"import('/game-bach-dang-938/tests/{module}.js').then(m=>m.{export}())")
        report['suites'].append({'module':module,**result});write();print(f'{module}: {result["passed"]}/{result["total"]}',flush=True)
    probe('Independent terminal-state / retreat / save fixture', lambda: b.evaluate("import('/docs/game-bach-dang-938/evidence/release-2026-11-03/requirements-probes.js').then(m=>m.run())"))
    def homepage():
        b.navigate('trang-chinh.html');time.sleep(3)
        return b.evaluate("({links:[...document.querySelectorAll('.card--sa-ban a')].map(a=>({label:a.textContent,href:a.getAttribute('href')})),newRequests:performance.getEntriesByType('resource').filter(r=>r.name.includes('/game-bach-dang-938/')),newPrefixedElements:document.querySelectorAll('[id^=bd938]').length,newModules:[...document.scripts].filter(s=>s.src.includes('game-bach-dang-938')).length})")
    probe('Homepage does not load the new game',homepage)
    def lifecycle():
        rounds=[]
        for i,(w,h) in enumerate([(1365,900),(360,800),(390,844),(430,932),(844,390)]):
            start(b,w,h);begin=state(b)
            key(b,'KeyW','w','keyDown');time.sleep(.4)
            # Browser dispatch of blur exercises the registered boundary, not real OS switching.
            b.evaluate("window.dispatchEvent(new Event('blur'))")
            ws(b,"s.state==='PAUSED'");a=state(b);time.sleep(.3);c=state(b)
            key(b,'KeyW','w','keyUp');b.click('[data-dialog-action="0"]')
            b.call('Emulation.setDeviceMetricsOverride',{'width':h,'height':w,'deviceScaleFactor':1,'mobile':w<760})
            time.sleep(.3)
            resized=b.evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth,canvas:[...document.querySelectorAll('canvas')].map(c=>({w:c.width,h:c.height,rect:c.getBoundingClientRect().toJSON()}))})")
            b.call('Emulation.setDeviceMetricsOverride',{'width':w,'height':h,'deviceScaleFactor':1,'mobile':w<760})
            b.click('#bd938-pause');b.shot('pause-'+str(w));b.click('[data-dialog-action="2"]')
            clean=state(b);time.sleep(.4);after=state(b)
            rounds.append({'size':[w,h],'pausedTickStable':a['session']['tick']==c['session']['tick'],'resized':resized,'cleanup':{k:after[k] for k in ['state','activeLoops','sessionListeners','observers','renderers','geometries','materials','canvases']},'sessionsCreated':after['sessionsCreated'],'sessionsDisposed':after['sessionsDisposed'],'fault':after['lastFault']})
        return rounds
    probe('Repeated start, focus-loss, resize, exit',lifecycle)
    def prefix():
        b.call('Page.navigate',{'url':'http://127.0.0.1:8767/nhipdapcualichsu/trang-chinh.html'})
        wait(b,"location.pathname.includes('/nhipdapcualichsu/')&&document.readyState==='complete'",30);time.sleep(.6)
        b.click('.card--sa-ban a[href="game-bach-dang-938/index.html"]')
        wait(b,"!!document.getElementById('bd938-next')&&document.readyState==='complete'",30)
        b.click('#bd938-next');b.click('[data-quality="economy"]');b.click('#bd938-load')
        wait(b,"document.getElementById('bd938-root').dataset.state==='BRIEFING'",30)
        b.click('[data-dialog-action="0"]');time.sleep(.5);b.shot('pages-prefixed-game')
        data=b.evaluate("({url:location.href,state:document.getElementById('bd938-root').dataset.state,resources:performance.getEntriesByType('resource').map(r=>r.name)})")
        b.click('#bd938-pause');b.click('[data-dialog-action="3"]')
        wait(b,"location.pathname.endsWith('/trang-chinh.html')&&document.readyState==='complete'",30)
        data['returnUrl']=b.evaluate('location.href');data['responses404']=[r for r in b.responses if r['status']==404 and '127.0.0.1:8767' in r['url']]
        return data
    probe('Strict project-prefix entry, rendering and return',prefix)
    report['exceptions']=errors(b)
finally: write();b.close()
