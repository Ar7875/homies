"""Local static server that disables caching, so edits always show up on reload."""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    root = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCacheHandler, directory=root)
    print(f"Serving {root} at http://localhost:{port}", flush=True)
    http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
