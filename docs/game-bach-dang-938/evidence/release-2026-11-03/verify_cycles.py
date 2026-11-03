"""Same-document teardown, load failure/cancel and CPU-visible frame measurements."""
from pathlib import Path
import sys,json,time,traceback
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent;audit.OUT=HERE;b=Browser();out={'cycles':[]}
def save():(HERE/'cycles-current.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
try:
 b.call('Performance.enable');b.call('Network.clearBrowserCache');b.navigate('game-bach-dang-938/index.html')
 b.evaluate("window.__loads=[];let start=0;new MutationObserver(()=>{const s=document.getElementById('bd938-root').dataset.state;if(s==='LOAD')start=performance.now();if(s==='BRIEFING'&&start){window.__loads.push(performance.now()-start);start=0;}}).observe(document.getElementById('bd938-root'),{attributes:true,attributeFilter:['data-state']})")
 for i in range(5):
  b.click('#bd938-next');b.click('[data-quality="economy"]');b.click('#bd938-load');ws(b,"s.state==='BRIEFING'",30)
  b.click('[data-dialog-action="0"]');ws(b,'s.session.tick>6')
  if i==0:
   out['frame']=b.evaluate("new Promise(resolve=>{const v=[];let start=null,last=null;function f(t){start??=t;if(last!==null)v.push(t-last);last=t;if(t-start<4000)requestAnimationFrame(f);else{v.sort((a,b)=>a-b);resolve({p95:v[Math.floor(v.length*.95)],p99:v[Math.floor(v.length*.99)],max:v.at(-1),over50:v.filter(x=>x>50).length,n:v.length})}}requestAnimationFrame(f)})")
  b.click('#bd938-pause');b.click('[data-dialog-action="2"]');s=state(b)
  out['cycles'].append({'round':i+1,'diagnostics':s,'heap':b.call('Performance.getMetrics')});out['loadsMs']=b.evaluate('window.__loads');save()
 # Delayed transport creates a cancellable loading window; no app monkey patch.
 b.call('Network.emulateNetworkConditions',{'offline':False,'latency':2000,'downloadThroughput':65536,'uploadThroughput':65536});b.call('Network.setCacheDisabled',{'cacheDisabled':True})
 b.click('#bd938-next');b.click('#bd938-load');b.click('#bd938-cancel-load');time.sleep(3)
 out['cancelled']=state(b);b.shot('cancelled-load');out['exceptions']=errors(b)
 b.call('Network.emulateNetworkConditions',{'offline':False,'latency':0,'downloadThroughput':-1,'uploadThroughput':-1})
 out['renderConsistency']=b.evaluate("import('/docs/game-bach-dang-938/evidence/release-2026-11-03/requirements-probes.js').then(m=>m.renderConsistency())")
finally:save();b.close()
