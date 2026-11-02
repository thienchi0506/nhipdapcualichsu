"""Failure fixture -> real camp confirmation -> retry -> controls -> reload.
Temporary browser profile; no production Firebase access or real accounts.
"""
from pathlib import Path
import importlib.util
import json
import time
import traceback

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('audit',HERE.parent/'audit_capture.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit);audit.OUT=HERE
b=audit.Browser();checks=[];failure=None
def check(name,passed,evidence=None):
    checks.append({'name':name,'passed':bool(passed),'evidence':evidence});print(('PASS ' if passed else 'FAIL ')+name,flush=True)
def wait(expression,seconds=20):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        if b.evaluate(expression):return
        time.sleep(.1)
    raise RuntimeError('Timed out: '+expression)
def state():return b.evaluate("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics())")
def key(code,key):
    for event in ['keyDown','keyUp']:b.call('Input.dispatchKeyEvent',{'type':event,'code':code,'key':key})
try:
    b.navigate('game-bach-dang-938/index.html',width=390,height=844)
    ids=b.evaluate("""(async()=>{
      const [{createRiverState},{createEncounter},{createArmy},{projectGame,captureGame,collectGameEvents},{recordFailedAttempt},{openSaveRepository}]=await Promise.all([
        import('/game-bach-dang-938/src/sim/vessel.js'),import('/game-bach-dang-938/src/sim/encounter.js'),import('/game-bach-dang-938/src/sim/army.js'),import('/game-bach-dang-938/src/save/game-state.js'),import('/game-bach-dang-938/src/save/attempt-resolution.js'),import('/game-bach-dang-938/src/save/repository.js')]);
      const river=await(await fetch('/game-bach-dang-938/data/river-config.json')).json(),character=await(await fetch('/game-bach-dang-938/data/character-config.json')).json();
      const game=createRiverState(river,{scenarioId:'combat'});game.combat=createEncounter(character,game,'H01');game.army=createArmy(game);game.combat.army=game.army;
      game.journalPending=[];game.combat.journalPending=[];game.army.journalPending=[];game.cargoKg=0;
      const people=game.army.people.filter(p=>p.team==='friendly');people[0].status='dead';people[0].health=0;people[0].wounds=1;people[1].z=-40;
      for(const actor of game.combat.actors.filter(a=>['mainHero','reserve'].includes(a.kind))){actor.health=0;actor.mode=actor.kind==='mainHero'?'wounded':'dead';actor.wounds=1;}
      game.combat.phase='failed_command';recordFailedAttempt(game,{campaignId:'ui-retry-campaign',attemptId:'attempt-ui-old'});
      const repo=await openSaveRepository(),scope={kind:'guest',id:'device'},lease=await repo.acquire(scope,'main','fixture-tab');
      await repo.commit({scope,slot:'main',owner:'fixture-tab',epoch:lease.epoch,expectedRevision:0,batchId:'seed-failed-ui',projection:projectGame(game,'ui-retry-campaign'),checkpoint:captureGame(game,{campaignId:'ui-retry-campaign',attemptId:'attempt-ui-old'}),events:collectGameEvents(game,'attempt-ui-old')});
      await repo.release(scope,'main','fixture-tab',lease.epoch);repo.close();return {dead:people[0].id,missing:people[1].id};
    })()""")
    b.evaluate("document.getElementById('bd938-save-mode').value='device'")
    for selector in ['#bd938-next','[data-quality="economy"]','#bd938-load']:b.click(selector)
    wait("document.getElementById('bd938-root').dataset.state==='BRIEFING'");b.click('[data-dialog-action="0"]')
    wait("document.getElementById('bd938-root').dataset.state==='RESULTS'")
    check('A failed saved attempt offers the actual camp retry flow',b.evaluate("""document.querySelector('[data-dialog-action="0"]').textContent.includes('Về trại')"""))
    b.click('[data-dialog-action="0"]')
    check('Camp confirmation explains losses and treatment before committing',b.evaluate("document.getElementById('bd938-dialog-title').textContent.includes('Kết toán')&&document.getElementById('bd938-dialog-content').textContent.includes('mất tích')"))
    fit=b.evaluate("(()=>{const r=document.getElementById('bd938-dialog').getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,scroll:document.documentElement.scrollWidth}})()")
    check('Camp confirmation fits the 390px emulated viewport',fit['left']>=0 and fit['right']<=fit['width']+1 and fit['scroll']<=fit['width']+1,fit)
    b.shot('camp-confirmation-390');b.click('#bd938-dialog-close')
    check('The camp close button returns to the result screen',b.evaluate("document.getElementById('bd938-dialog-title').textContent.includes('Không còn')"))
    b.click('[data-dialog-action="0"]');b.click('[data-dialog-action="0"]')
    wait("document.getElementById('bd938-root').dataset.state==='BRIEFING'")
    current=state()['session'];hero=next(p for p in current['combat']['actors'] if p['id']=='H01');army={p['id']:p for p in current['army']['people']}
    check('Confirmed retry starts a playable attempt with reduced hero health',current['combat']['phase']=='active' and hero['health']==70 and hero['stamina']==85 and current['seconds']==0)
    check('Real retry UI preserves dead and missing people and discarded cargo',army[ids['dead']]['status']=='dead' and army[ids['missing']]['status']=='missing' and current['river']['cargoKg']==0)
    b.click('[data-dialog-action="0"]');wait("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics().session?.tick>2)")
    b.click('#bd938-canvas');key('Space',' ')
    wait("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics().session?.river?.anchor===true)")
    before=state()['session']['tick'];b.click('#bd938-pause');b.click('[data-dialog-action="1"]')
    wait("document.getElementById('bd938-root').dataset.state==='BRIEFING'")
    check('Pause reload flushes the latest movement tick',state()['session']['tick']>=before,{'before':before,'after':state()['session']['tick']})
    b.click('[data-dialog-action="0"]');b.click('#bd938-canvas');key('Space',' ')
    wait("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics().session?.river?.anchor===false)")
    check('The first action after reload is not discarded as an old action ID',state()['session']['river']['anchor'] is False)
    b.shot('retry-playable-390');check('No uncaught browser errors or storage fault in the retry flow',not state()['lastFault'] and not [e for e in b.events if e.get('method')=='Runtime.exceptionThrown'])
except Exception as error:
    failure={'error':str(error),'traceback':traceback.format_exc()};print(failure['traceback'],flush=True)
    try:failure['state']=state();b.shot('retry-ui-failure')
    except Exception:pass
finally:
    result={'checks':checks,'passed':sum(c['passed'] for c in checks),'total':len(checks),'failure':failure,'browser':b.version,'fixtureSeeded':True,'realDevice':False,'productionBackendBlocked':True}
    (HERE/'retry-ui.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');b.close()
raise SystemExit(1 if failure or any(not c['passed'] for c in checks) else 0)
