from pathlib import Path
import importlib.util
import json

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('audit', HERE.parent / 'audit_capture.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
browser = audit.Browser()
try:
    browser.navigate('game-bach-dang-938/tests/index.html')
    result = browser.evaluate("import('/game-bach-dang-938/tests/army-tests.js').then(m=>m.runArmyTests())")
    (HERE/'army-core.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'passed':result['passed'], 'total':result['total'], 'failed':[x['name'] for x in result['checks'] if not x['passed']]}), flush=True)
finally:
    browser.close()
raise SystemExit(0 if result['passed'] == result['total'] else 1)
