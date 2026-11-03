from pathlib import Path
import sys,json,time,traceback
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent
audit.OUT=HERE;b=Browser();out={};followup='--followup' in sys.argv
def save(): (HERE/('boundaries-followup.json' if followup else 'boundaries.json')).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def run(name,fn):
 if followup and name not in ['two_real_windows','durable_local_reload_and_offline']:return
 try:out[name]=fn();print('OBSERVED '+name,flush=True)
 except Exception as e:out[name]={'error':str(e),'traceback':traceback.format_exc()};print('ERROR '+name+': '+str(e)[:160],flush=True)
 save()
try:
 def tabs():
  b.navigate('game-bach-dang-938/index.html')
  b.evaluate("import('/game-bach-dang-938/tests/save-tabs-tests.js').then(m=>{window.__tabsModule=m;return true})")
  result=b.call('Runtime.evaluate',{'expression':'window.__tabsModule.runSaveTabTests()','awaitPromise':True,'returnByValue':True,'userGesture':True})
  if 'exceptionDetails' in result:raise RuntimeError(result['exceptionDetails'])
  return result['result']['value']
 run('two_real_windows',tabs)
 def local_save():
  b.navigate('game-bach-dang-938/index.html',390,844);select(b,'#bd938-save-mode',1)
  b.click('#bd938-next');b.click('[data-quality="economy"]');b.click('#bd938-load');ws(b,"s.state==='BRIEFING'",30)
  b.click('[data-dialog-action="0"]');ws(b,'s.session.tick>5')
  b.click('#bd938-systems summary');before=state(b)['session']['river']
  b.click('[data-river-action="unload"]');ws(b,f"s.session.river.cargoKg < {before['cargoKg']}")
  b.click('#bd938-systems-close');b.click('#bd938-pause');wait(b,"import('/game-bach-dang-938/src/app/bootstrap.js').then(m=>!m.getDiagnostics().session.saving)")
  reduced=state(b)['session']['river'];b.shot('local-save-paused')
  b.click('[data-dialog-action="1"]');ws(b,"s.state==='BRIEFING'",30)
  restored=state(b)['session']['river'];b.click('[data-dialog-action="0"]');ws(b,'s.session.tick>5')
  # Disconnect networking while the loaded local-save simulation is running.
  b.call('Network.emulateNetworkConditions',{'offline':True,'latency':0,'downloadThroughput':0,'uploadThroughput':0})
  a=state(b);time.sleep(2);c=state(b);b.click('#bd938-pause')
  paused=state(b);b.shot('offline-local-save')
  b.call('Network.emulateNetworkConditions',{'offline':False,'latency':0,'downloadThroughput':-1,'uploadThroughput':-1})
  b.click('[data-dialog-action="3"]');wait(b,"location.pathname.endsWith('/trang-chinh.html')&&document.readyState==='complete'",30)
  # Separate route suite covers the link. Direct re-navigation here isolates
  # persistence from the homepage's entrance animation/click timing.
  b.navigate('game-bach-dang-938/index.html',390,844)
  select(b,'#bd938-save-mode',1);b.click('#bd938-next');b.click('#bd938-load');ws(b,"s.state==='BRIEFING'",30)
  reopened=state(b)['session']['river'];b.shot('local-save-reopened')
  return {'before':before,'afterUnload':reduced,'restored':restored,'reopened':reopened,'sameCargoAfterReload':reduced['cargoKg']==restored['cargoKg']==reopened['cargoKg'],'offlineTicksAdvanced':c['session']['tick']>a['session']['tick'],'offlineFault':paused['lastFault']}
 run('durable_local_reload_and_offline',local_save)
 def library():
  b.navigate('tang-thu-cac.html');b.click('[data-grade="12"]');results=[]
  for i in range(3):
   b.click('.topic.open .study');time.sleep(.8)
   # Wait for the existing CSS opening animation before sampling the target.
   r=rect(b,'#close');x=r['x']+r['width']/2;y=r['y']+r['height']/2
   b.call('Input.dispatchMouseEvent',{'type':'mousePressed','x':x,'y':y,'button':'left','buttons':1,'clickCount':1});time.sleep(.12)
   b.call('Input.dispatchMouseEvent',{'type':'mouseReleased','x':x,'y':y,'button':'left','buttons':0,'clickCount':1});time.sleep(.3)
   closed=b.evaluate("!document.getElementById('modal').classList.contains('active')");results.append(closed)
   if not closed:break
  if all(results):
   b.click('#search');b.call('Input.insertText',{'text':'WASD Space'});value=b.evaluate("document.getElementById('search').value")
  else:value=None
  b.shot('library-stable-pointer');return {'closedOnFirstClick':results,'typed':value,'exceptions':errors(b)}
 run('library_stable_pointer_target',library)
 def login():
  b.navigate('dang-nhap.html');b.click('#btn-dang-nhap')
  empty=b.evaluate("({email:document.getElementById('login-email').validity.valueMissing,password:document.getElementById('login-password').validity.valueMissing,disabled:document.getElementById('btn-dang-nhap').disabled})")
  b.click('#login-email');b.call('Input.insertText',{'text':'audit@example.invalid'});b.click('#login-password');b.call('Input.insertText',{'text':'Demo-Only-123456'})
  b.click('.btn-toggle-password');shown=b.evaluate("document.getElementById('login-password').type==='text'")
  b.click('[data-tab="dang-ky"]');tab=b.evaluate("document.getElementById('tab-dang-ky').classList.contains('active')")
  b.shot('login-ui');return {'emptyValidation':empty,'passwordToggle':shown,'registrationTab':tab,'newGameResources':b.evaluate("performance.getEntriesByType('resource').filter(r=>r.name.includes('/game-bach-dang-938/')).map(r=>r.name)"),'note':'No real login submitted; separate emulator tests exercise authentication.'}
 run('original_login_ui',login)
 def missing_asset():
  b.navigate('game-bach-dang-938/index.html');b.call('Network.setBlockedURLs',{'urls':['*/game-bach-dang-938/data/river-config.json','*://firestore.googleapis.com/*','*://identitytoolkit.googleapis.com/*']})
  b.click('#bd938-next');b.click('#bd938-load');ws(b,"s.state==='ERROR'",30);failed=state(b);b.shot('missing-asset-error')
  b.click('[data-dialog-action="1"]');clean=state(b)
  return {'failureState':failed['state'],'cleanup':{k:clean[k] for k in ['state','activeLoops','activeLoads','sessionListeners','renderers','geometries','materials','canvases']}}
 run('missing_asset_recovery',missing_asset)
finally:save();b.close()
