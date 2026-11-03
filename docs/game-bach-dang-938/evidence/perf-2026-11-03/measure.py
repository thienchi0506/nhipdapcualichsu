"""Identical cold/warm, real route and stress workloads before/after changes."""
from pathlib import Path
import sys,json,time,traceback
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent;audit.OUT=HERE
label=sys.argv[1];b=Browser();out={'label':label,'browser':b.version,'conditions':'localhost; isolated profile; SwiftShader; DPR1; production backend blocked','loads':[],'cycles':[]}
def save(): (HERE/(label+'.json')).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sample(ms=6000):
 return b.evaluate("""new Promise(resolve=>{const values=[];let begin=null,last=null;const until=MS;function f(now){if(begin===null)begin=now;if(last!==null)values.push(now-last);last=now;if(now-begin<until)requestAnimationFrame(f);else{values.sort((a,b)=>a-b);const n=values.length;resolve({samples:n,p50Ms:values[Math.floor(n*.5)],p95Ms:values[Math.floor(n*.95)],p99Ms:values[Math.floor(n*.99)],maxMs:values[n-1],over50ms:values.filter(x=>x>50).length});}}requestAnimationFrame(f);})""".replace('MS',str(ms)))
try:
 b.call('Performance.enable');b.call('Network.clearBrowserCache')
 b.navigate('game-bach-dang-938/index.html')
 out['navigation']=b.evaluate("performance.getEntriesByType('navigation')[0].toJSON()")
 b.click('#bd938-next');b.click('[data-quality="economy"]')
 b.evaluate("window.__loadTimes=[];window.__loadStart=0;new MutationObserver(()=>{const s=document.getElementById('bd938-root').dataset.state;if(s==='LOAD')window.__loadStart=performance.now();if(s==='BRIEFING'&&window.__loadStart){window.__loadTimes.push(performance.now()-window.__loadStart);window.__loadStart=0;}}).observe(document.getElementById('bd938-root'),{attributes:true,attributeFilter:['data-state']})")
 for i in range(6):
  b.click('#bd938-load');ws(b,"s.state==='BRIEFING'",40)
  out['loads']=b.evaluate('window.__loadTimes')
  b.click('[data-dialog-action="0"]');ws(b,'s.session.tick>5')
  if i==0:
   out['frame']=sample();out['render']=state(b)['session']['scene'];out['heapPlaying']=b.call('Performance.getMetrics');b.shot(label+'-normal')
  b.click('#bd938-pause');b.click('[data-dialog-action="2"]')
  out['cycles'].append({'cycle':i+1,'ownership':state(b),'heap':b.call('Performance.getMetrics')})
  b.click('#bd938-next');save();print(label+' cycle '+str(i+1),flush=True)
 out['resources']=b.evaluate("performance.getEntriesByType('resource').map(r=>({url:r.name.split('/').slice(-2).join('/'),duration:r.duration,transfer:r.transferSize,encoded:r.encodedBodySize}))")
 b.navigate('game-bach-dang-938/tests/performance.html')
 out['stress']=[]
 for count in [50,100,200,400,480]:
  # HTML module exports are exposed by an explicit local fixture loader below.
  r=b.evaluate(f"window.runVisualBenchmark({count},8)")
  out['stress'].append(r);save();print(label+' stress '+str(count),flush=True)
 out['stressDisposed']=b.evaluate('window.benchmarkOwnership()')
 out['exceptions']=errors(b)
except Exception as exc:
 out['failure']={'error':str(exc),'traceback':traceback.format_exc()};print(out['failure']['traceback'],flush=True)
finally:save();b.close()
