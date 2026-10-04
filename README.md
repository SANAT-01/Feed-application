# News Feed — System Design Notes

A news feed is the general pattern behind LinkedIn's home feed, X's timeline, or Instagram's feed: an endless, sorted list of posts from accounts you follow. This document captures the full design walkthrough — requirements, scale, high-level design, the fan-out flows, and the bottlenecks/scaling follow-ups.

A rendered HLD architecture diagram for this design is published separately; this file is the detailed written reference.

---

## 1. Requirements

**Functional**
- Users can follow other accounts.
- Users can create posts (text, image, or video).
- Users can read a feed: newest post first, from only the accounts they follow (no ranking algorithm — pure reverse-chronological).

**Non-functional**
- Feed must load in **< 1 second**.
- A new post must reach followers' feeds within **a few seconds** (not minutes).
- An occasional **duplicate post after a refresh is acceptable** — this relaxation is what allows a much simpler, faster design later on.

**Explicitly out of scope:** a ranking/relevance algorithm (addressed only as a follow-up extension, see §6.3).

---

## 2. Back-of-envelope estimation

| Metric | Value |
|---|---|
| Daily active users (DAU) | 10,000,000 |
| Feed opens per user/day | 5 |
| Feed reads/day | 50,000,000 → **~600 reads/sec** avg |
| Posts per user/month | 3 |
| Posts/month | 30,000,000 → ~1M/day → **~12 writes/sec** avg |
| Read : Write ratio | **~50 : 1** |

**Conclusion: this is a read-heavy system.** Every design decision below optimizes the read path first, because that's where >98% of the traffic lives.

---

## 3. API surface

Two endpoints carry the whole design (likes/comments/follow endpoints exist in a real product but are out of scope here):

- **`POST /createPost`** — client sends post content; server persists it and returns a post ID.
- **`GET /feed`** — server returns the top 50 posts (newest first) from everyone the caller follows.

## 4. Data model

| Table | Shape | Access pattern |
|---|---|---|
| **Users** | user_id, name, profile, **is_celebrity flag** | point lookups |
| **Follows** | follower_id, followee_id | "who does X follow?" (feed building) **and** "who follows X?" (fan-out) — both directions matter, and the second one becomes the hottest query in the whole system once fan-out-on-write is introduced |
| **Posts** | post_id, author_id, content, timestamp | organized by author + time ("give me John's latest posts") |

At 10M users × ~200 follows each, the Follows table alone is ~2 billion rows.

---

## 5. High-Level Design

### 5.1 Naive approach: fan-out-on-read (rejected)

On every `GET /feed`:
1. Query Follows for who the user follows (e.g. 300 accounts).
2. Query Posts for recent posts from all 300 accounts.
3. Merge in memory, sort by time, return top 50.

**Why it fails at scale:** 600 reads/sec × (1 Follows query + ~300 Posts lookups) ≈ **180,000+ DB operations/sec**, 5× that at peak. Nearly all of this work is wasted — most users refresh and find almost nothing new, yet the entire feed is rebuilt from scratch every time. Adding read replicas just multiplies the same wasteful query; it doesn't remove the waste.

### 5.2 The fix: fan-out-on-write (precompute the feed)

Core idea: **build the feed when a post is written, not when it's read.** Don't rebuild from scratch — incrementally insert the one new post into every follower's already-built list.

- Each user has a small list (**Redis**, in-memory, for sub-second loads) holding **post IDs only**, newest on top, capped at **~500 entries**.
- A background worker takes every new post and pushes its ID onto the lists of all the author's followers.
- The source-of-truth tables (Users, Follows, Posts) don't change — they remain authoritative; Redis is a derived, rebuildable index.

Because feed lists store only post IDs, a **second cache** (post-content cache) stores the actual text/media so the same popular post isn't re-fetched from the DB for every one of its hundreds of readers.

**Read path (steady state):**
1. `GET /feed` → read the user's list from the feed-list cache (post IDs).
2. Fetch each post's content from the post-content cache.
3. On a cache miss, fall back to the Posts table and backfill the cache.
4. Return top 50.

This keeps both the read path and the write path cheap and bounded, which is what makes <1s loads and few-second propagation achievable at this scale.

---

## 6. Deep Dives

### 6.1 The Outbox Pattern (reliable fan-out trigger)

**Problem:** if "save the post" and "enqueue a fan-out job" are two separate writes to two separate systems (DB, then queue), a crash between them silently drops the fan-out — the post exists but nobody's feed gets it.

**Solution:** write both facts in **one database transaction**:
1. Insert the post into the Posts table.
2. Insert a row into an **Outbox table**: `{post_id, status: pending}`.

Both happen or neither does — atomicity guaranteed by the DB, no cross-system write.

A **background poller** periodically scans the Outbox for `pending` rows, publishes a ticket to a **queue** ("post 71 by John is new"), and flips the row to `done`.

A **worker** consumes the ticket:
1. Look up who follows the author (via the Follows table's "who follows X?" query).
2. Push the new post ID onto each follower's feed-list cache entry.
3. Acknowledge the ticket.

**Idempotency:** if a worker crashes after writing to follower lists but before acknowledging, another worker will redeliver the same ticket. Fix: before pushing, check whether the post ID is already present in that follower's list and skip if so. Any duplicate that still slips through is acceptable per the relaxed refresh requirement (§1).

### 6.2 The Celebrity Problem (hybrid fan-out)

**Problem:** if a celebrity with 100M followers posts, fanning out means writing the same post ID into 100M lists — an operation that can take minutes, much of it wasted on users who won't open the app for days.

**Solution: hybrid fan-out, split by follower count.**
- Threshold: **100,000 followers**. Accounts above it get `Users.is_celebrity = true`.
- **Normal accounts → fan-out-on-write (push).** Posting triggers the outbox → worker → push-to-follower-lists flow from §6.1.
- **Celebrity accounts → fan-out-on-read (pull).** Their posts are *not* pushed anywhere. Each celebrity gets **one shared Redis list** of their own recent post IDs.

`GET /feed` now does two things and merges the results:
1. Read the user's precomputed list (posts from normal accounts they follow).
2. Pull the small lists of each celebrity they follow.
3. Merge both streams, sort by time, return top 50.

**Rule of thumb:** normal accounts get **pushed**, celebrity accounts get **pulled**.

**Industry terms:**
- *Fan-out-on-read* = build the feed fresh at read time.
- *Fan-out-on-write* = precompute the feed at write time.
- The production design is a **hybrid** of both.

### 6.3 Media storage (images/video)

- Post rows never store binary media — only a **URL**.
- Actual media lives in **object storage (S3)**, served to clients through a **CDN** in front of it.
- The post-content cache also stores just the media URL, not the bytes — so heavy media never touches the hot path's memory budget.

### 6.4 Database choice & sharding

- **Posts table → Cassandra.** Write-once, (almost) never updated, always read by author+time — a textbook fit for a wide-column, time-ordered store. 30M posts/month, ~360M/year and growing forever means one machine can't hold it — the table is **sharded** across Cassandra nodes.
- **Users / Follows tables → relational DB.** Small rows, real relationships, bidirectional point lookups ("who does X follow" / "who follows X") — relational databases handle this shape well.

### 6.5 Optional extension: ranked (non-chronological) feed

If product wants relevance ranking instead of newest-first:
- **Unchanged:** the 3 source tables, the queue, the fan-out workers, the post-content cache.
- **New:** take the newest ~500 post IDs from the user's list, add in the celebrity candidates, and hand all of them to a separate **Scoring Service**. It scores each candidate (post age, likes/comments *right now*, how much the user interacts with that author) and the top 50 scores win.
- **Why this can't be precomputed:** a post's score depends on likes/comments that accumulate *after* it's posted — so scoring must happen at **read time**, and only over a bounded candidate set (a few hundred, not the whole list) to keep latency low.
- **Cost:** (1) scoring runs on every single feed load — extra compute + needs live like/comment counts; (2) the feed's order changes between refreshes as scores shift, which is fine given the duplicate-on-refresh relaxation, but if true de-duplication were required, you'd additionally need to track what the user has already seen.

---

## 7. Bottlenecks & Scaling

| Concern | Resolution |
|---|---|
| **Feed-list cache size** | ~500 post IDs × 8 bytes × 10M users ≈ **40 GB**. Must live entirely in a fast in-memory store (Redis) to hit the <1s read SLO. |
| **Post-content cache size** | 30M posts/month × ~1KB ≈ 30GB/month of new content; in practice the cache is capped with a fixed memory budget and relies on **LRU eviction** — recent posts are read far more often, so the hot set stays small. |
| **Don't build lists for everyone** | Lists/fan-out are maintained only for **active users** (e.g. active in the last 30 days). Inactive users' feeds are **built lazily** (fan-out-on-read, once) the moment they return — never wastefully pre-maintained while they're gone. |
| **Celebrity write storms** | Solved by the hybrid model (§6.2) — a celebrity's post is written to exactly one shared list, never fanned out to followers. |
| **Celebrity reads for power users** | A user following thousands of accounts, hundreds of them celebrities, must not trigger hundreds of DB queries per feed load. Fix: keep each celebrity's recent posts in **its own small cache list**, shared by every follower, so a power user's feed read is cheap cache lookups, not DB round-trips. A side effect: with 20,000 follows, a 500-entry personal list fills fast and older posts get evicted before being seen — acceptable, since only the top 50 are ever read anyway. |
| **Fan-out backlog / latency spike** | First, measure the actual lag (time from DB commit to landing in the last follower's list) before reacting. If a backlog builds: scale out worker nodes (costs money), **and** prioritize — push to followers who are currently active (open app in the last few minutes/hours) first, and deliver to everyone else in a second pass. A closed app doesn't notice a few extra minutes of delay. |
| **Viral / hot post** | A single viral post concentrates all read traffic from the post-content cache onto one node. Fix: **replicate that post across multiple cache instances/shards** so reads are spread, not absorbed by a single node. |
| **Unbounded data growth** | Posts accumulate forever (360M/year and climbing) — one machine can't hold the Posts table, so it's **sharded** (Cassandra, partitioned by author+time). |
| **Ranking cost (if added)** | Scoring must run per-request over a bounded candidate set (hundreds, not thousands) since scores depend on live like/comment counts that can't be precomputed — see §6.4. |

---

## 8. One-paragraph summary

A normal account's post and its outbox note are written together in one DB transaction; a poller turns the pending outbox row into a queue ticket; a worker consumes it and pushes the post ID into every follower's Redis feed list (capped at 500 entries each). Celebrity accounts skip this entirely — their posts live in one shared cache list, pulled and merged at read time. `GET /feed` reads the user's precomputed list, pulls in any followed celebrities' lists, fetches actual content from a second cache (falling back to a sharded Cassandra Posts table on a miss), and returns the newest 50. Inactive users get no precomputed list at all — their feed is built lazily on return. Viral posts get replicated across cache nodes; backlogged fan-out prioritizes currently-active followers first. The same design generalizes directly to Twitter, Instagram, or Facebook — it's the same problem under a different name.
