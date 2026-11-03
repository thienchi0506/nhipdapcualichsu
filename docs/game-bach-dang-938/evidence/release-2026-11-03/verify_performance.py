"""Fresh short measurement, no optimization or gameplay changes."""
from pathlib import Path
import sys,json,time,traceback
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'ux-2026-11-02'))
from review_common import *
HERE=Path(__file__).resolve().parent;audit.OUT=HERE;b=Browser();out={'conditions':'Chrome headless + SwiftShader; localhost; DPR1; short synthetic workload, not real hardware FPS certification'}
def save(): (HERE/'performance-current.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
try:
 b.navigate('game-bach-dang-938/index.html');out['rendererSelection']=b.evaluate("import('/game-bach-dang-938/tests/army-scene-tests.js').then(m=>m.runArmySceneTest())")
 b.navigate('game-bach-dang-938/tests/performance.html');wait(b,"typeof runVisualBenchmark==='function'",30)
 out['stress']=[]
 for count in [50,100,200,400,480]:
  out['stress'].append(b.evaluate(f'runVisualBenchmark({count},8)'));save();print('Stress '+str(count),flush=True)
 out['disposed']=b.evaluate('benchmarkOwnership()');out['exceptions']=errors(b)
except Exception as e:out['error']=str(e);out['traceback']=traceback.format_exc()
finally:save();b.close()
