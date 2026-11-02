"""Read-only source audit and isolated Chromium observations; never edits app files."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

import websocket

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent / 'audit-2026-11-01'
OUT.mkdir(parents=True, exist_ok=True)


def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT).decode('utf-8').strip()


def fingerprints():
    paths = git('ls-files').splitlines()
    return {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in paths
            if (ROOT / p).is_file() and Path(p).suffix in {'.html', '.js', '.css', '.rules', '.py', '.yml', '.yaml', '.json'}}


class Inventory(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts, self.links, self.assets, self.ids, self.canvases = [], [], [], [], []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            self.ids.append(a['id'])
        if tag == 'script' and a.get('src'):
            self.scripts.append(a['src'])
        if tag == 'a' and a.get('href'):
            self.links.append({'href': a['href'], 'onclick': a.get('onclick')})
        if tag == 'canvas':
            self.canvases.append(a)
        if tag in {'script', 'link', 'img', 'audio', 'video', 'source'}:
            value = a.get('src') or a.get('href')
            if value:
                self.assets.append({'tag': tag, 'url': value})


def source_audit():
    report = {'utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
              'git': {'head': git('rev-parse', 'HEAD'), 'branch': git('branch', '--show-current'),
                      'status': git('status', '--short'), 'remote': git('remote', 'get-url', 'origin'),
                      'recentCommits': git('log', '-5', '--format=%h %s')}, 'pages': {}, 'assets': []}
    for p in sorted(ROOT.glob('*.html')):
        text = p.read_text(encoding='utf-8')
        parser = Inventory()
        parser.feed(text)
        missing = []
        for a in parser.assets + parser.links:
            url = a.get('url', a.get('href', ''))
            u = urllib.parse.urlsplit(url)
            if u.scheme or u.netloc or not u.path or '${' in url or '{{' in url:
                continue
            local = ROOT / urllib.parse.unquote(u.path)
            if not local.exists():
                missing.append({'tag': a.get('tag', 'a'), 'url': url})
        storage = []
        for n, line in enumerate(text.splitlines(), 1):
            if re.search(r'(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)', line):
                storage.append({'line': n, 'keys': re.findall(r'(?:getItem|setItem|removeItem)\(\s*[\'\"]([^\'\"]+)', line),
                                'dynamicKey': not bool(re.search(r'(?:getItem|setItem|removeItem)\(\s*[\'\"]', line))})
        title = re.search(r'<title>(.*?)</title>', text, re.S | re.I)
        report['pages'][p.name] = {'bytes': p.stat().st_size, 'title': title.group(1) if title else None,
                                  'scripts': parser.scripts, 'assets': parser.assets, 'links': parser.links,
                                  'canvases': parser.canvases, 'storage': storage, 'missingLiteralPaths': missing,
                                  'functions': [{'name': m.group(1), 'line': text.count('\n', 0, m.start()) + 1}
                                                for m in re.finditer(r'\bfunction\s+(\w+)\s*\(', text)],
                                  'duplicateIds': sorted({i for i in parser.ids if parser.ids.count(i) > 1})}
    for p in sorted((ROOT / 'models').glob('*')):
        if p.is_file():
            report['assets'].append({'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size})
    write('source-inventory.json', report)
    write('runtime-hashes-before.json', fingerprints())
    return report


def release_audit():
    result = {}
    urls = {'pagesConfig': 'https://api.github.com/repos/thienchi0506/nhipdapcualichsu/pages',
            'workflows': 'https://api.github.com/repos/thienchi0506/nhipdapcualichsu/actions/workflows',
            'deployments': 'https://api.github.com/repos/thienchi0506/nhipdapcualichsu/deployments?per_page=3',
            'workflowRuns': 'https://api.github.com/repos/thienchi0506/nhipdapcualichsu/actions/runs?per_page=3',
            'deploymentStatus': 'https://api.github.com/repos/thienchi0506/nhipdapcualichsu/deployments/7472681981/statuses',
            'liveRoot': 'https://thienchi0506.github.io/nhipdapcualichsu/',
            'liveLegacy3d': 'https://thienchi0506.github.io/nhipdapcualichsu/sa-ban-3d.html'}
    for label, url in urls.items():
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'local-read-only-project-audit'})
            with urllib.request.urlopen(req, timeout=20) as response:
                body = response.read()
                item = {'url': url, 'status': response.status, 'finalUrl': response.url}
                if label.startswith('live'):
                    title = re.search(r'<title>(.*?)</title>', body.decode('utf-8'), re.I | re.S)
                    item.update(title=title.group(1) if title else None, sha256=hashlib.sha256(body).hexdigest())
                else:
                    data = json.loads(body)
                    if label == 'pagesConfig':
                        item['data'] = {k: data.get(k) for k in ['html_url', 'status', 'build_type', 'source', 'https_enforced']}
                    elif label == 'workflows':
                        item['data'] = {'total_count': data.get('total_count'), 'workflows': [{k: w.get(k) for k in ['name', 'path', 'state']} for w in data.get('workflows', [])]}
                    elif label == 'workflowRuns':
                        item['data'] = [{k: r.get(k) for k in ['name', 'path', 'head_branch', 'head_sha', 'event', 'status', 'conclusion', 'created_at']}
                                        for r in data.get('workflow_runs', [])]
                    elif label == 'deploymentStatus':
                        item['data'] = [{k: r.get(k) for k in ['state', 'environment', 'environment_url', 'created_at']} for r in data]
                    else:
                        item['data'] = [{k: d.get(k) for k in ['sha', 'ref', 'environment', 'created_at', 'statuses_url']} for d in data]
                result[label] = item
        except Exception as exc:
            result[label] = {'url': url, 'error': str(exc), 'status': getattr(exc, 'code', None)}
    write('release-observations.json', result)


class Browser:
    def __init__(self):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        self.profile = tempfile.mkdtemp(prefix='bd938-read-only-audit-')
        chrome = Path(os.environ.get('PROGRAMFILES', 'C:/Program Files')) / 'Google/Chrome/Application/chrome.exe'
        self.process = subprocess.Popen([str(chrome), '--headless=new', '--enable-unsafe-swiftshader',
            '--remote-allow-origins=*', f'--remote-debugging-port={port}', f'--user-data-dir={self.profile}',
            '--window-size=1365,900', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list'))
                break
            except Exception:
                time.sleep(.1)
        self.ws = websocket.create_connection(next(t for t in tabs if t['type'] == 'page')['webSocketDebuggerUrl'], timeout=45)
        self.counter, self.events, self.responses = 0, [], []
        self.call('Runtime.enable')
        self.call('Page.enable')
        self.call('Network.enable')
        self.call('Network.setBlockedURLs', {'urls': [
            '*://identitytoolkit.googleapis.com/*', '*://securetoken.googleapis.com/*',
            '*://firestore.googleapis.com/*', '*://firebasestorage.googleapis.com/*',
            '*://firebaseinstallations.googleapis.com/*', '*://www.google-analytics.com/*',
            '*://www.googletagmanager.com/*']})
        self.call('Page.addScriptToEvaluateOnNewDocument', {'source': "try{localStorage.setItem('giongDocBat','false')}catch(e){}"})
        self.version = self.call('Browser.getVersion')

    def call(self, method, params=None):
        self.counter += 1
        ident = self.counter
        self.ws.send(json.dumps({'id': ident, 'method': method, 'params': params or {}}))
        while True:
            message = json.loads(self.ws.recv())
            if message.get('method') in ['Runtime.exceptionThrown', 'Runtime.consoleAPICalled', 'Network.loadingFailed']:
                self.events.append(message)
            if message.get('method') == 'Network.responseReceived':
                r = message['params']['response']
                self.responses.append({'url': r['url'].split('?')[0], 'status': r['status'], 'type': message['params']['type']})
            if message.get('id') == ident:
                if 'error' in message:
                    raise RuntimeError(message['error'])
                return message.get('result', {})

    def evaluate(self, expression):
        result = self.call('Runtime.evaluate', {'expression': expression, 'awaitPromise': True, 'returnByValue': True})
        if 'exceptionDetails' in result:
            raise RuntimeError(result['exceptionDetails'])
        return result.get('result', {}).get('value')

    def navigate(self, page, width=1365, height=900):
        self.call('Emulation.setDeviceMetricsOverride', {'width': width, 'height': height, 'deviceScaleFactor': 1,
                  'mobile': width < 760, 'screenWidth': width, 'screenHeight': height})
        self.call('Emulation.setTouchEmulationEnabled', {'enabled': width < 760, 'maxTouchPoints': 1})
        self.call('Page.navigate', {'url': 'about:blank'})
        time.sleep(.1)
        self.events, self.responses = [], []
        self.call('Page.navigate', {'url': 'http://127.0.0.1:8765/' + page})
        for _ in range(100):
            time.sleep(.1)
            if self.evaluate("document.readyState==='complete'"):
                break
        time.sleep(.6)

    def snapshot(self):
        return self.evaluate("""(()=>{const visible=e=>{let r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
          return {url:location.href,title:document.title,viewport:[innerWidth,innerHeight],width:document.documentElement.scrollWidth,bodyClass:document.body.className,
          canvas:[...document.querySelectorAll('canvas')].map(e=>({id:e.id,w:e.width,h:e.height,visible:visible(e)})),
          actions:[...document.querySelectorAll('a,button,input,select')].filter(visible).slice(0,120).map(e=>({tag:e.tagName,id:e.id,text:(e.innerText||e.value||e.placeholder||'').trim().slice(0,130),href:e.getAttribute('href'),onclick:e.getAttribute('onclick'),type:e.type})),
          localStorageKeys:Object.keys(localStorage),sessionStorageKeys:Object.keys(sessionStorage),
          runtime:window.HistoryGame?.snapshot?.()||null,phase:typeof Game3D!=='undefined'?Game3D.combatPhase:typeof gameState!=='undefined'?gameState.hoiHienTai:null,
          text:document.body.innerText.slice(0,2200),resources:performance.getEntriesByType('resource').map(r=>({url:r.name.split('?')[0],duration:Math.round(r.duration),bytes:r.transferSize}))};})()""")

    def click(self, selector):
        rect = self.evaluate("""(()=>{const e=[...document.querySelectorAll(SELECTOR)].find(e=>{let r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'});if(!e)throw Error('No visible element: '+SELECTOR);e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});const r=e.getBoundingClientRect(),t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,hit:e===t||e.contains(t),text:e.innerText}})()""".replace('SELECTOR', json.dumps(selector)))
        if not rect['hit']:
            raise RuntimeError({'blockedClick': selector, 'rect': rect})
        for typ in ['mousePressed', 'mouseReleased']:
            self.call('Input.dispatchMouseEvent', {'type': typ, 'x': rect['x'], 'y': rect['y'], 'button': 'left', 'clickCount': 1})
        time.sleep(.35)
        return rect

    def shot(self, name):
        data = self.call('Page.captureScreenshot', {'format': 'png'})
        (OUT / (name + '.png')).write_bytes(base64.b64decode(data['data']))

    def close(self):
        self.ws.close()
        self.process.terminate()
        self.process.wait(timeout=10)


def probe(pages=None):
    browser = Browser()
    reports = []
    try:
        for width, height in [(1365, 900), (390, 844)]:
            for page in pages or ['index.html', 'trang-chinh.html', 'sa-ban.html', 'sa-ban-3d.html', 'thao-truong.html',
                                 'tang-thu-cac.html', 'dang-nhap.html', 'quan-anh-hoi.html', 'sanh-game.html', 'sa-ban-nhu-nguyet.html', 'tran-do-nhap-vai.html']:
                try:
                    browser.navigate(page, width, height)
                    report = browser.snapshot()
                    report.update(page=page, events=browser.events, responses=browser.responses)
                    if page == 'trang-chinh.html':
                        browser.evaluate("document.querySelector('.card--sa-ban').scrollIntoView({block:'center',behavior:'instant'})")
                    browser.shot(page.replace('.html', '') + '-' + str(width))
                    reports.append(report)
                    print(page, width, 'docWidth', report['width'], 'phase', report.get('phase'), flush=True)
                except Exception as exc:
                    reports.append({'page': page, 'viewport': [width, height], 'error': str(exc)})
                    print(page, width, 'ERROR', str(exc)[:160], flush=True)
        write('browser-pages' + ('-targeted' if pages else '') + '.json', {'browser': browser.version, 'remoteServicesBlocked': True, 'reports': reports})
    finally:
        browser.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', action='store_true')
    parser.add_argument('--release', action='store_true')
    parser.add_argument('--probe', action='store_true')
    parser.add_argument('--page', action='append')
    args = parser.parse_args()
    if args.source:
        source_audit()
    if args.release:
        release_audit()
    if args.probe:
        probe(args.page)
