#!/usr/bin/env python3
"""feedapp API — post + read the feed (Python standard library only, no pip deps).

Endpoints:
  POST /post          -> body: "<author_id> <text...>". Stores the post in Postgres,
                         then enqueues a fan-out job (Redis list queue:fanout) and
                         returns IMMEDIATELY — the write path never waits for the
                         fan-out to finish.
  GET  /feed/<uid>    -> the user's precomputed feed (Redis list feed:<uid>), newest
                         first. With HYBRID_ENABLED=true, celebrity posts are pulled
                         at READ time from celebposts:<celeb> and merged in — the
                         response reports how many items came from each path.
  GET  /queue         -> {"fanout_queue_depth": N} — jobs waiting for the worker.
  GET  /health        -> {"ok": true}

Feed entries are stored as "<post_id>|<author_id>|<text>" strings.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from common import Redis, pg_query_rows, pg_query_scalar, sql_quote

HYBRID_ENABLED = os.environ.get("HYBRID_ENABLED", "false").lower() == "true"


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _json(self, code, obj):
        data = (json.dumps(obj) + "\n").encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/post":
            self._json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length).decode().strip()
        parts = body.split(None, 1)
        if len(parts) < 2 or not parts[0].isdigit():
            self._json(400, {"error": 'body must be "<author_id> <text>"'})
            return
        author, text = int(parts[0]), parts[1]
        r = Redis()
        try:
            name = pg_query_scalar("SELECT name FROM users WHERE id = %d" % author)
            if name is None:
                self._json(404, {"error": "no such user"})
                return
            pid = int(pg_query_scalar("SELECT nextval('post_ids')"))
            pg_query_scalar(
                "INSERT INTO posts (id, author_id, body) VALUES (%d, %d, %s) RETURNING id"
                % (pid, author, sql_quote(text))
            )
            r.cmd("LPUSH", "queue:fanout", json.dumps({"post_id": pid, "author": author, "text": text}))
            depth = r.cmd("LLEN", "queue:fanout")
        except Exception as e:
            print("ERROR post: %s" % e, flush=True)
            self._json(503, {"error": "backend unavailable"})
            return
        finally:
            r.close()
        print("POST post:%d by %s (user:%d) -> fan-out queued (depth %s)" % (pid, name, author, depth), flush=True)
        self._json(201, {"post_id": pid, "author": name, "fanout": "queued"})

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path.startswith("/feed/"):
            uid = path.rsplit("/", 1)[-1]
            if uid.isdigit():
                self.feed(int(uid))
            else:
                self._json(400, {"error": "bad user id"})
        elif path == "/queue":
            r = Redis()
            try:
                depth = r.cmd("LLEN", "queue:fanout")
            except Exception:
                depth = None
            finally:
                r.close()
            self._json(200, {"fanout_queue_depth": depth})
        elif path == "/health":
            self._json(200, {"ok": True})
        else:
            self._json(404, {"error": "not found"})

    def feed(self, uid):
        r = Redis()
        try:
            entries = r.cmd("LRANGE", "feed:%d" % uid, 0, 9) or []
            precomputed = len(entries)
            pulled = 0
            if HYBRID_ENABLED:
                celebs = pg_query_rows(
                    "SELECT f.followee_id FROM follows f JOIN users u ON u.id = f.followee_id "
                    "WHERE f.follower_id = %d AND u.is_celebrity" % uid
                )
                for row in celebs:
                    celeb_items = r.cmd("LRANGE", "celebposts:%s" % row[0], 0, 9) or []
                    pulled += len(celeb_items)
                    entries.extend(celeb_items)
        except Exception as e:
            print("ERROR feed user:%d: %s" % (uid, e), flush=True)
            self._json(503, {"error": "backend unavailable"})
            return
        finally:
            r.close()
        items = []
        for e in entries:
            pid, author, text = e.split("|", 2)
            items.append({"post_id": int(pid), "author_id": int(author), "text": text})
        items.sort(key=lambda i: i["post_id"], reverse=True)
        items = items[:10]
        self._json(200, {
            "user": uid,
            "feed": items,
            "precomputed": precomputed,
            "pulled_on_read": pulled,
            "hybrid": HYBRID_ENABLED,
        })

    def log_message(self, *_):
        pass  # our own log lines above are the interesting ones


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
