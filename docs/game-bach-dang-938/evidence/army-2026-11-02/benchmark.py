from pathlib import Path
import importlib.util
import json
import platform

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('audit', HERE.parent / 'audit_capture.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
browser = audit.Browser()
try:
    browser.ws.settimeout(240)
    browser.navigate('game-bach-dang-938/tests/index.html')
    print('Running five simulation workloads; this is not an FPS measurement.', flush=True)
    result = browser.evaluate("import('/game-bach-dang-938/tests/army-tests.js').then(m=>m.benchmarkArmy())")
    result.update(browser=browser.version, platform=platform.platform(), processor=platform.processor(), physicalDeviceTested=False)
    (HERE/'army-benchmark.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    for row in result['results']:
        print(json.dumps({'friendly':row['friendly'], 'enemy':row['enemy'], 'metrics':row['metrics']}), flush=True)
    if any(row['uniqueIds'] != row['total'] or row['resurrected'] or not row['shots'] for row in result['results']):
        raise RuntimeError('Identity, mortality or active-combat invariant failed during stress test')
finally:
    browser.close()
