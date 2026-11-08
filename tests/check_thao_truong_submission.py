"""Headless submission regression; temporary profile, Firebase/network writes blocked.

Run from the repository root: python tests/check_thao_truong_submission.py
Uses the repository's existing Chromium audit helper and websocket-client.
"""
import importlib.util
import json
import sys
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.stdout.reconfigure(encoding='utf-8')
spec = importlib.util.spec_from_file_location(
    'submission_browser', ROOT / 'docs/game-bach-dang-938/evidence/audit_capture.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def copyfile(self, source, output):
        try:
            super().copyfile(source, output)
        except (ConnectionResetError, BrokenPipeError):
            pass


server = None
browser = None
try:
    try:
        server = ThreadingHTTPServer(
            ('127.0.0.1', 8765), partial(Handler, directory=str(ROOT)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
    except OSError:
        pass  # An existing repository server can be reused.

    browser = audit.Browser()
    browser.call('Network.setBlockedURLs', {'urls': ['https://*']})
    browser.navigate('thao-truong.html')
    assert browser.evaluate("typeof startExam === 'function'"), 'Exam did not initialize'

    def wait_for(expression):
        deadline = time.monotonic() + 8
        while time.monotonic() < deadline:
            if browser.evaluate(expression):
                return
            time.sleep(.1)
        raise AssertionError('Timed out: ' + expression)

    def start(exam_id, width=1365, height=900):
        browser.call('Emulation.setDeviceMetricsOverride', {
            'width': width, 'height': height, 'deviceScaleFactor': 1,
            'mobile': width < 760})
        browser.evaluate('startExam(' + json.dumps(exam_id) + ", 'practice')")

    def submit(expected_score):
        browser.click('#btn-sidebar-submit' if browser.evaluate('innerWidth >= 760')
                      else '#btn-mobile-submit')
        browser.click('#btn-modal-confirm')
        wait_for("isSubmitted && getComputedStyle($('result-summary-box')).display !== 'none'")
        result = browser.evaluate("""({
            submitted: isSubmitted,
            visible: getComputedStyle($('result-summary-box')).display !== 'none',
            score: $('res-score').textContent,
            time: $('res-stat-time').textContent,
            notice: $('submission-error-notice')?.style.display || 'none',
            peace: localStorage.getItem('dcls_peaceScore')
        })""")
        assert result['submitted'] and result['visible'], result
        assert float(result['score']) == expected_score, result
        assert result['notice'] == 'none', result
        before = result['peace']
        browser.evaluate('executeSubmitExam(); executeSubmitExam()')
        assert browser.evaluate("localStorage.getItem('dcls_peaceScore')") == before
        print('PASS', json.dumps(result, ensure_ascii=False), flush=True)
        return result

    start('de-01')
    submit(0.0)  # Previously froze with ReferenceError before rendering anything.

    browser.click('#btn-retake-exam')
    wait_for('!isSubmitted')
    retake = browser.evaluate("({submitted:isSubmitted,answers:userAnswersP1,result:getComputedStyle($('result-summary-box')).display})")
    assert not retake['submitted'] and all(a is None for a in retake['answers']) and retake['result'] == 'none', {
        'retake': retake, 'errors': [e for e in browser.events if e['method']=='Runtime.exceptionThrown']}
    print('PASS retake resets submission and answers', flush=True)

    start('de-01')
    browser.evaluate("""selectP1Option(0, currentExam.part1[0].ans ?? currentExam.part1[0].answer);
        const firstStatement = currentExam.part2[0].statements[0];
        selectP2Statement(0, firstStatement.letter.toLowerCase(), firstStatement.isTrue);
        clearInterval(timerInterval); elapsedSeconds = 65; timerSeconds = 2635;""")
    result = submit(0.47)  # 1/22 MCQ + 1 correct statement in 1/2 passages.
    assert '1 phút 05 giây' in result['time'], result

    for grade, width in [(12, 1365), (11, 390), (10, 390)]:
        exam_id = browser.evaluate("EXAMS_DATA.find(e => " +
            ("e.id === 'de-01'" if grade == 12 else
             "e.id.startsWith('de-" + str(grade) + "-') && e.part1?.length && e.part2?.length") + ').id')
        start(exam_id, width, 844 if width == 390 else 900)
        browser.evaluate("""currentExam.part1.forEach((q,i)=>selectP1Option(i,q.ans ?? q.answer));
            currentExam.part2.forEach((p,i)=>p.statements.forEach(s=>selectP2Statement(i,s.letter.toLowerCase(),s.isTrue)));""")
        submit(10.0)
        print('PASS grade', grade, 'viewport', width, flush=True)

    start('de-01')
    browser.evaluate('window.alert = () => {}; timerSeconds = 1;')
    wait_for("isSubmitted && getComputedStyle($('result-summary-box')).display !== 'none'")
    assert browser.evaluate("$('res-score').textContent") == '0.00'
    print('PASS automatic submission on timeout', flush=True)

    errors = [e['params']['exceptionDetails'] for e in browser.events
              if e['method'] == 'Runtime.exceptionThrown'
              and 'executeSubmitExam' in json.dumps(e)]
    assert not errors, errors
    print('PASS no uncaught submission exceptions', flush=True)
finally:
    if browser:
        browser.close()
    if server:
        server.shutdown()
