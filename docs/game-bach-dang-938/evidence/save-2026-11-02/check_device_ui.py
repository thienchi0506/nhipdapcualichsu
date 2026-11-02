"""Local opt-in save and restore through the production game UI in a temp profile."""
from pathlib import Path
import importlib.util
import json
import time
import traceback

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('audit',HERE.parent/'audit_capture.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit);audit.OUT=HERE
b=audit.Browser();checks=[];failure=None
def check(name,ok,evidence=None):
    checks.append({'name':name,'passed':bool(ok),'evidence':evidence});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
def wait(expr,seconds=20):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
        if b.evaluate(expr):return
        time.sleep(.1)
    raise RuntimeError('Timed out: '+expr)
def state():return b.evaluate("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics())")
def start():
    b.evaluate("for(const [id,v] of [['bd938-scenario','harbor'],['bd938-save-mode','device']]){let e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))}")
    for sel in ['#bd938-next','[data-quality="economy"]','#bd938-load']:b.click(sel)
    wait("document.getElementById('bd938-root').dataset.state==='BRIEFING'")
    b.click('[data-dialog-action="0"]')
    wait("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics().session?.tick>2)")
try:
    b.navigate('game-bach-dang-938/index.html');start()
    wait("document.getElementById('bd938-save-status').textContent.includes('Đã lưu cục bộ')")
    check('Device mode shows an acknowledged local save',state()['session']['river']['cargoKg']==600)
    b.click('#bd938-canvas')
    for typ in ['keyDown','keyUp']:b.call('Input.dispatchKeyEvent',{'type':typ,'code':'KeyX','key':'x'})
    wait("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics().session?.river?.cargoKg===0)")
    before=state()['session']
    saved_tick=b.evaluate("""(async()=>{const {openSaveRepository}=await import('/game-bach-dang-938/src/save/repository.js');const r=await openSaveRepository();try{return (await r.read({kind:'guest',id:'device'},'main')).checkpoint.tick;}finally{r.close();}})()""")
    b.click('#bd938-pause')
    check('Saved mode labels replay honestly as a checkpoint',b.evaluate("document.querySelector('[data-dialog-action=\"1\"]').textContent.includes('mốc')"))
    b.click('[data-dialog-action="1"]');wait("document.getElementById('bd938-root').dataset.state==='BRIEFING'")
    restored=state()['session'];check('Reloading restores the committed cargo loss and checkpoint tick',restored['river']['cargoKg']==0 and restored['tick']>=saved_tick,{'visibleBeforePause':before['tick'],'committedTick':saved_tick,'after':restored['tick']})
    b.click('[data-dialog-action="0"]');wait("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics().session?.tick>2)")
    b.click('#bd938-pause');b.click('[data-dialog-action="2"]');wait("document.getElementById('bd938-root').dataset.state==='SHELL'")
    b.navigate('game-bach-dang-938/index.html');start()
    check('Returning in the same browser profile restores the same loss',state()['session']['river']['cargoKg']==0)
    b.shot('device-save-status')
    check('No uncaught browser errors during local save flow',not [e for e in b.events if e.get('method')=='Runtime.exceptionThrown'] and not state()['lastFault'])
    # Separate profile: seed a clearly labelled casualty fixture, then load it
    # through the real UI; no game state is mutated after the page starts.
    b.close();b=audit.Browser();b.navigate('game-bach-dang-938/index.html')
    soldier_id=b.evaluate("""(async()=>{
      const [{createRiverState},{createEncounter},{createArmy},{projectGame,captureGame},{openSaveRepository}]=await Promise.all([
        import('/game-bach-dang-938/src/sim/vessel.js'),import('/game-bach-dang-938/src/sim/encounter.js'),import('/game-bach-dang-938/src/sim/army.js'),import('/game-bach-dang-938/src/save/game-state.js'),import('/game-bach-dang-938/src/save/repository.js')]);
      const river=await(await fetch('/game-bach-dang-938/data/river-config.json')).json(),character=await(await fetch('/game-bach-dang-938/data/character-config.json')).json();
      const game=createRiverState(river,{scenarioId:'combat'});game.combat=createEncounter(character,game,'H01');game.army=createArmy(game);game.combat.army=game.army;
      const soldier=game.army.people.find(p=>p.team==='friendly');soldier.status='dead';soldier.health=0;soldier.wounds=1;soldier.history.push({tick:0,type:'died-fixture'});
      const repo=await openSaveRepository(),scope={kind:'guest',id:'device'},lease=await repo.acquire(scope,'main','fixture-tab');
      await repo.commit({scope,slot:'main',owner:'fixture-tab',epoch:lease.epoch,expectedRevision:0,batchId:'seed-fixture',projection:projectGame(game,'fixture-campaign'),checkpoint:captureGame(game,{campaignId:'fixture-campaign',attemptId:'fixture-attempt'}),events:[{id:'fixture-death',type:'DeathRecorded',soldierId:soldier.id}]});
      await repo.release(scope,'main','fixture-tab',lease.epoch);repo.close();return soldier.id;
    })()""")
    b.evaluate("document.getElementById('bd938-save-mode').value='device'")
    for sel in ['#bd938-next','[data-quality="economy"]','#bd938-load']:b.click(sel)
    wait("document.getElementById('bd938-root').dataset.state==='BRIEFING'")
    casualty=next(p for p in state()['session']['army']['people'] if p['id']==soldier_id)
    check('A committed casualty fixture stays dead when opened in the real game UI',casualty['status']=='dead' and casualty['health']==0,{'id':soldier_id,'status':casualty['status']})
    b.click('[data-dialog-action="0"]');wait("import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>m.getDiagnostics().session?.tick>30)")
    current=state();casualty=next(p for p in current['session']['army']['people'] if p['id']==soldier_id)
    check('Combat session continues from the saved casualty without a storage fault',casualty['status']=='dead' and current['state']=='RUNNING' and not current['lastFault'])
except Exception as exc:
    failure={'error':str(exc),'traceback':traceback.format_exc()};print(failure['traceback'],flush=True)
    try:failure['state']=state();b.shot('device-save-failure')
    except Exception:pass
finally:
    result={'checks':checks,'passed':sum(x['passed'] for x in checks),'total':len(checks),'failure':failure,'browser':b.version,'actualPlaythrough':True,'productionBackendBlocked':True}
    (HERE/'device-ui.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');b.close()
raise SystemExit(1 if failure or any(not x['passed'] for x in checks) else 0)
