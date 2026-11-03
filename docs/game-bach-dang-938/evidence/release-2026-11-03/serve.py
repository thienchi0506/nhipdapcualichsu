"""Local review only; second origin rejects paths outside the Pages prefix."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import threading

ROOT = Path(__file__).resolve().parents[4]
class Handler(SimpleHTTPRequestHandler):
    prefix = ''
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        if self.prefix:
            if not self.path.startswith(self.prefix):
                self.send_error(404, 'Outside project prefix'); return
            self.path = self.path[len(self.prefix)-1:]
        super().do_GET()
    def log_message(self, *args): pass

class Pages(Handler): prefix = '/nhipdapcualichsu/'
servers = [ThreadingHTTPServer(('127.0.0.1', 8765), Handler),
           ThreadingHTTPServer(('127.0.0.1', 8767), Pages)]
for server in servers:
    threading.Thread(target=server.serve_forever, daemon=True).start()
print('Review servers: root 8765; strict GitHub Pages prefix 8767', flush=True)
try:
    threading.Event().wait()
except KeyboardInterrupt:
    for server in servers: server.shutdown(); server.server_close()
