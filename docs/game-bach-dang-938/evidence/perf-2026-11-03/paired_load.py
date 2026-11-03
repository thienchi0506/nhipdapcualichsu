"""Alternate HEAD/reference and working-copy loads to expose timing variance.
Reference lives in an owned temporary directory, never overwrites running code.
"""
from pathlib import Path
import sys,io,tarfile,tempfile,subprocess,json,time,urllib.request
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent
owned=tempfile.TemporaryDirectory(prefix='bd938-perf-reference-');reference=Path(owned.name).resolve()
server=None;b=None;out=[]
try:
 raw=subprocess.check_output(['git','archive','HEAD','game-bach-dang-938','firebase-config.js'],cwd=ROOT)
 with tarfile.open(fileobj=io.BytesIO(raw)) as archive:
  if not all((reference/m.name).resolve().is_relative_to(reference) for m in archive.getmembers()):raise RuntimeError('Unsafe archive member')
  archive.extractall(reference,filter='data')
 server=subprocess.Popen([sys.executable,'-m','http.server','8766','--bind','127.0.0.1','--directory',str(reference)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
 for _ in range(30):
  try:urllib.request.urlopen('http://127.0.0.1:8766/game-bach-dang-938/index.html');break
  except Exception:time.sleep(.1)
 b=Browser()
 for pair in range(3):
  for label,port in ([('before',8766),('after',8765)] if pair%2==0 else [('after',8765),('before',8766)]):
   b.call('Network.clearBrowserCache');b.call('Page.navigate',{'url':'about:blank'});time.sleep(.1)
   b.call('Page.navigate',{'url':f'http://127.0.0.1:{port}/game-bach-dang-938/index.html'})
   wait(b,"document.readyState==='complete'&&!!document.getElementById('bd938-next')");time.sleep(.3)
   b.click('#bd938-next');b.click('[data-quality="economy"]')
   b.evaluate("window.__loadTimes=[];window.__loadStart=0;new MutationObserver(()=>{const s=document.getElementById('bd938-root').dataset.state;if(s==='LOAD')window.__loadStart=performance.now();if(s==='BRIEFING'&&window.__loadStart){window.__loadTimes.push(performance.now()-window.__loadStart);window.__loadStart=0;}}).observe(document.getElementById('bd938-root'),{attributes:true,attributeFilter:['data-state']})")
   for i in range(3):
    b.click('#bd938-load');ws(b,"s.state==='BRIEFING'",40);b.click('[data-dialog-action="0"]');ws(b,'s.session.tick>3')
    b.click('#bd938-pause');b.click('[data-dialog-action="2"]');b.click('#bd938-next')
   item={'pair':pair,'label':label,'loads':b.evaluate('window.__loadTimes')};out.append(item)
   (HERE/'paired-loads.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print(item,flush=True)
finally:
 if b:b.close()
 if server:server.terminate();server.wait(timeout=10)
 if reference.parent!=Path(tempfile.gettempdir()).resolve() or not reference.name.startswith('bd938-perf-reference-'):raise RuntimeError('Unowned cleanup target')
 owned.cleanup()
