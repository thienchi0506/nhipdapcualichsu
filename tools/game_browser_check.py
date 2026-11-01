"""Isolated Chromium smoke/benchmark. Does not sign in or write remote data."""
import argparse
import base64
import functools
import http.server
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import threading
import time
import urllib.request
import websocket

ROOT = Path(__file__).resolve().parents[1]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--seconds', type=int, default=5)
    parser.add_argument('--checks', action='store_true')
    parser.add_argument('--shot', action='store_true')
    args = parser.parse_args()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0)); debug = sock.getsockname()[1]
    profile = tempfile.mkdtemp(prefix='history-game-check-')
    chrome = Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Google/Chrome/Application/chrome.exe'
    process = subprocess.Popen([str(chrome), '--headless=new', '--enable-unsafe-swiftshader',
        '--remote-allow-origins=*', f'--remote-debugging-port={debug}', f'--user-data-dir={profile}',
        '--window-size=1365,900', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    errors = []; counter = 0
    try:
        for _ in range(100):
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{debug}/json/list'))
                break
            except Exception:
                time.sleep(.1)
        ws = websocket.create_connection(next(t for t in tabs if t['type']=='page')['webSocketDebuggerUrl'], timeout=60)
        def call(method, params=None):
            nonlocal counter
            counter += 1; ident = counter
            ws.send(json.dumps({'id':ident, 'method':method, 'params':params or {}}))
            while True:
                message = json.loads(ws.recv())
                if message.get('method') == 'Runtime.exceptionThrown':
                    errors.append(message['params']['exceptionDetails'].get('exception', {}).get('description', message['params']['exceptionDetails'].get('text')))
                if message.get('method') == 'Runtime.consoleAPICalled' and message['params'].get('type') == 'error':
                    description = ' '.join(str(a.get('value', a.get('description', ''))) for a in message['params']['args'])
                    if description not in errors: errors.append(description)
                if message.get('id') == ident:
                    if 'error' in message: raise RuntimeError(message['error'])
                    return message.get('result', {})
        def evaluate(expression):
            result = call('Runtime.evaluate', {'expression': expression, 'awaitPromise': True, 'returnByValue': True})
            if 'exceptionDetails' in result: raise RuntimeError(result['exceptionDetails'])
            return result.get('result', {}).get('value')
        call('Runtime.enable'); call('Page.enable')
        call('Page.addScriptToEvaluateOnNewDocument', {'source': "try { localStorage.setItem('giongDocBat','false'); } catch(e) {}"})
        reports = []
        cases = [
            ('2d-bach-dang', 'sa-ban.html#saban', ''),
            ('2d-nhu-nguyet', 'sa-ban.html#nhu-nguyet', ''),
            ('3d-bach-dang', 'sa-ban-3d.html', 'Game3D.cheDoGiongDoc=false; khoiDongChienTranHoi2();'),
            ('3d-nhu-nguyet', 'sa-ban-3d.html', 'Game3D.cheDoGiongDoc=false; chuyenSangChienDichNhuNguyet(); khoiDongChienTranNhuNguyetHoi2();')
        ]
        for name, page, setup in cases:
            errors.clear()
            call('Page.navigate', {'url':'about:blank'})
            time.sleep(.15)
            call('Page.navigate', {'url':f'http://127.0.0.1:{server.server_port}/{page}'})
            time.sleep(1)
            for _ in range(60):
                ready = evaluate("document.readyState === 'complete' && (typeof Game3D === 'undefined' || !!Game3D.renderer)")
                if ready: break
                time.sleep(.2)
            if setup: evaluate(setup)
            report = evaluate("""new Promise(resolve => {
                const frames=[]; let last=performance.now(), start=last;
                function sample(now) {
                    frames.push(now-last); last=now;
                    if(now-start < SECONDS*1000) { requestAnimationFrame(sample); return; }
                    frames.shift(); frames.sort((a,b)=>a-b);
                    const p=q=>frames[Math.min(frames.length-1,Math.floor(frames.length*q))];
                    let gpu=null, info=null;
                    if(typeof Game3D!=='undefined' && Game3D.renderer) {
                        const gl=Game3D.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
                        gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
                        info=JSON.parse(JSON.stringify(Game3D.renderer.info));
                    }
                    resolve({p50:p(.5),p95:p(.95),frames:frames.length,gpu,info,
                        viewport:[innerWidth,innerHeight,devicePixelRatio],
                        heap:performance.memory?.usedJSHeapSize,
                        runtime:window.HistoryGame?.snapshot() || null,
                        phase:typeof Game3D!=='undefined'?Game3D.combatPhase:gameState.hoiHienTai});
                } requestAnimationFrame(sample);
            })""".replace('SECONDS', str(args.seconds)))
            report.update(name=name, errors=list(errors))
            if args.checks:
                try:
                    report['checks'] = evaluate((ROOT/'tools/game_regression_checks.js').read_text(encoding='utf-8'))
                except Exception as error:
                    report['checks'] = {'error': str(error)}
                report['errors'] = list(errors)
            if args.shot:
                screenshot = call('Page.captureScreenshot', {'format':'png'})
                shot = Path(args.output).parent / (name+'.png'); shot.parent.mkdir(parents=True, exist_ok=True)
                shot.write_bytes(base64.b64decode(screenshot['data']))
            reports.append(report)
            print(name, 'p50=',round(report['p50'],2), 'p95=',round(report['p95'],2), 'errors=',len(report['errors']), flush=True)
        output=Path(args.output); output.parent.mkdir(parents=True,exist_ok=True)
        output.write_text(json.dumps({'browser':call('Browser.getVersion'),'reports':reports},ensure_ascii=False,indent=2),encoding='utf-8')
        ws.close()
    finally:
        process.terminate(); process.wait(timeout=10)
        server.shutdown(); server.server_close()

if __name__=='__main__': main()
