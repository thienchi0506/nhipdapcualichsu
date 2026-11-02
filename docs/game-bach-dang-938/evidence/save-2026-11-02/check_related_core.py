from pathlib import Path
import importlib.util
import json

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('audit',HERE.parent/'audit_capture.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
b=audit.Browser()
try:
    b.navigate('game-bach-dang-938/tests/index.html')
    result={}
    for key,module,method in [('river','river-tests','runRiverTests'),('characters','character-tests','runCharacterTests'),('army','army-tests','runArmyTests')]:
        result[key]=b.evaluate(f"import('/game-bach-dang-938/tests/{module}.js').then(m=>m.{method}())")
    result['passed']=sum(v['passed'] for v in result.values());result['total']=sum(result[k]['total'] for k in ['river','characters','army'])
    (HERE/'related-core.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'passed':result['passed'],'total':result['total']}),flush=True)
finally:b.close()
raise SystemExit(0 if result['passed']==result['total'] else 1)
