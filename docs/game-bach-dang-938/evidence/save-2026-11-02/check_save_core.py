from pathlib import Path
import importlib.util
import json

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('audit',HERE.parent/'audit_capture.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
browser=audit.Browser()
try:
    browser.navigate('game-bach-dang-938/tests/index.html')
    core=browser.evaluate("import('/game-bach-dang-938/tests/save-tests.js').then(m=>m.runSaveTests())")
    barrier=browser.evaluate("import('/game-bach-dang-938/tests/session-save-tests.js').then(m=>m.runSessionSaveTests())")
    raw=browser.call('Runtime.evaluate',{'expression':"import('/game-bach-dang-938/tests/save-tabs-tests.js').then(m=>m.runSaveTabTests())",'userGesture':True,'awaitPromise':True,'returnByValue':True})
    if raw.get('exceptionDetails'):raise RuntimeError(raw['exceptionDetails'])
    tabs=raw['result']['value']
    retry=browser.evaluate("import('/game-bach-dang-938/tests/retry-tests.js').then(m=>m.runRetryTests())")
    result={'core':core,'barrier':barrier,'tabs':tabs,'retry':retry,'passed':core['passed']+barrier['passed']+tabs['passed']+retry['passed'],'total':core['total']+barrier['total']+tabs['total']+retry['total'],'browser':browser.version}
    (HERE/'save-core.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'passed':result['passed'],'total':result['total']}),flush=True)
finally:browser.close()
raise SystemExit(0 if result['passed']==result['total'] else 1)
