#!/usr/bin/env python3
"""Serve the working tree locally. --lan allows a phone on the same network."""
import argparse, functools, http.server, pathlib, socket
from urllib.parse import unquote, urlsplit

ROOT=pathlib.Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--lan',action='store_true')
parser.add_argument('--port',type=int,default=8765)
args=parser.parse_args()

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path=unquote(urlsplit(self.path).path)
        parts=path.strip('/').split('/')
        allowed={'index.html','preview.html','app.js','styles.css','manifest.webmanifest','assets','data','core','game','board','audio','storage','analysis','ui'}
        if any(p.startswith('.') for p in parts) or (parts[0] and parts[0] not in allowed):
            self.send_error(404);return
        super().do_GET()
    def do_HEAD(self):
        self.send_error(405)
    def list_directory(self,path):
        self.send_error(404)
        return None
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()

class Server(http.server.ThreadingHTTPServer):
    request_queue_size=128

with Server(('0.0.0.0' if args.lan else '127.0.0.1',args.port),functools.partial(Handler,directory=str(ROOT))) as server:
    print(f'PC: http://127.0.0.1:{args.port}/index.html',flush=True)
    if args.lan:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if not ip.startswith('127.'):
                print(f'LAN: http://{ip}:{args.port}/preview.html',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
