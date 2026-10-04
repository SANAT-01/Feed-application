#!/usr/bin/env python3
"""fanout-worker — consumes fan-out jobs and writes into follower feeds.

One job per new post (BRPOP on the Redis list queue:fanout, processed SERIALLY —
one worker, one job at a time, exactly like the whiteboard version):

  * normal author  -> fan-out on write: LPUSH the post into feed:<follower> for
        EVERY follower, one write per follower, with progress logs:
            FANOUT post:107 start -> 200000 followers
            FANOUT post:107 60000/200000 (12.3s)
            FANOUT post:107 done: 200000 writes in 41.0s
        A 200,000-follower author therefore blocks the queue for the whole storm —
        that's the fail moment.

  * celebrity author with HYBRID_ENABLED=true -> no fan-out at all. The post goes
        to ONE list (celebposts:<celeb>) and readers pull it at read time:
            CELEBRITY POST post:108 by starlet — skipped fan-out (200000 followers), stored for read-time pull

Feed entries are "<post_id>|<author_id>|<text>" strings, trimmed to the newest 100.
"""
import json
import os
import time

from common import Redis, pg_query_rows, pg_query_scalar

HYBRID_ENABLED = os.environ.get("HYBRID_ENABLED", "false").lower() == "true"
PROGRESS_EVERY = 20000


def process(r, job):
    pid, author, text = job["post_id"], job["author"], job["text"]
    entry = "%d|%d|%s" % (pid, author, text)
    row = pg_query_rows("SELECT name, is_celebrity FROM users WHERE id = %d" % author)
    if not row:
        print("SKIP post:%d — unknown author user:%d" % (pid, author), flush=True)
        return
    name, is_celebrity = row[0][0], row[0][1] == "t"
    n_followers = int(pg_query_scalar("SELECT count(*) FROM follows WHERE followee_id = %d" % author))

    if is_celebrity and HYBRID_ENABLED:
        r.cmd("LPUSH", "celebposts:%d" % author, entry)
        r.cmd("LTRIM", "celebposts:%d" % author, 0, 99)
        print("CELEBRITY POST post:%d by %s — skipped fan-out (%d followers), stored for read-time pull"
              % (pid, name, n_followers), flush=True)
        return

    followers = pg_query_rows("SELECT follower_id FROM follows WHERE followee_id = %d" % author)
    print("FANOUT post:%d start -> %d followers" % (pid, len(followers)), flush=True)
    t0 = time.time()
    done = 0
    for row_f in followers:
        r.cmd("LPUSH", "feed:%s" % row_f[0], entry)
        done += 1
        if done % PROGRESS_EVERY == 0:
            print("FANOUT post:%d %d/%d (%.1fs)" % (pid, done, len(followers), time.time() - t0), flush=True)
    print("FANOUT post:%d done: %d writes in %.1fs" % (pid, done, time.time() - t0), flush=True)


def main():
    r = Redis()
    print("fanout-worker: ready (hybrid %s)" % ("ON" if HYBRID_ENABLED else "OFF"), flush=True)
    while True:
        try:
            # BRPOP timeout must stay under the socket's 5s timeout, or an idle
            # queue reads as a connection error.
            res = r.cmd("BRPOP", "queue:fanout", 3)
        except Exception as e:
            print("fanout-worker: waiting for redis (%s)" % e, flush=True)
            time.sleep(2)
            continue
        if res is None:
            continue
        try:
            job = json.loads(res[1])
            process(r, job)
        except Exception as e:
            print("fanout-worker: job failed (%s)" % e, flush=True)


if __name__ == "__main__":
    main()
