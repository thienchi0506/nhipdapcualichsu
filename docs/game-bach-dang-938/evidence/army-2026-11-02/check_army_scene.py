from pathlib import Path
import importlib.util
import json

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('audit', HERE.parent/'audit_capture.py')
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)
browser=audit.Browser()
try:
    browser.navigate('game-bach-dang-938/tests/index.html')
    result=browser.evaluate("import('/game-bach-dang-938/tests/army-scene-tests.js').then(m=>m.runArmySceneTest())")
    (HERE/'army-scene.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result),flush=True)
finally:
    browser.close()
raise SystemExit(0 if result['passed'] else 1)
