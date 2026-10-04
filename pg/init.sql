-- Seed the feedapp database. Runs automatically the first time the postgres
-- container initializes (see docker-compose.yml volumes).

-- pgcrypto's crypt()/gen_salt('bf') IS bcrypt — used only to seed demo
-- passwords below. The API itself hashes/verifies with bcryptjs in Node;
-- both produce the same standard $2a$ hash format, so either side can
-- verify the other's hashes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id            serial PRIMARY KEY,
    username      text    NOT NULL UNIQUE,
    password_hash text    NOT NULL,
    is_celebrity  boolean NOT NULL DEFAULT false
);

CREATE TABLE follows (
    follower_id integer NOT NULL REFERENCES users(id),
    followee_id integer NOT NULL REFERENCES users(id),
    PRIMARY KEY (follower_id, followee_id)
);

CREATE INDEX follows_by_followee ON follows (followee_id);
CREATE INDEX follows_by_follower ON follows (follower_id);

CREATE TABLE posts (
    id         bigserial PRIMARY KEY,
    author_id  integer     NOT NULL REFERENCES users(id),
    body       text        NOT NULL,
    media_url  text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX posts_by_author ON posts (author_id, id DESC);

-- The outbox pattern (README §6.1): the post row and this row are written in
-- the SAME transaction by the API. The outbox-poller service turns pending
-- rows into Kafka messages, then flips them to done.
CREATE TABLE outbox (
    id         bigserial PRIMARY KEY,
    post_id    bigint      NOT NULL REFERENCES posts(id),
    status     text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX outbox_pending ON outbox (status, id) WHERE status = 'pending';

-- Demo seed data: 50 users total, so the app never feels empty on first
-- boot. All of them log in with the password "password123".
--
-- The original 4 (alice/bob/carol/starlet) keep their usernames so existing
-- login instructions/screenshots stay valid; 46 more are added around them.
INSERT INTO users (username, password_hash, is_celebrity) VALUES
  ('alice',   crypt('password123', gen_salt('bf')), false),
  ('bob',     crypt('password123', gen_salt('bf')), false),
  ('carol',   crypt('password123', gen_salt('bf')), false),
  ('starlet', crypt('password123', gen_salt('bf')), true),
  -- two more celebrities, so the hybrid push/pull split (README §6.2) has
  -- more than one example and isn't a special case of a single account.
  ('nova',    crypt('password123', gen_salt('bf')), true),
  ('zenith',  crypt('password123', gen_salt('bf')), true),
  -- five friend clusters (8 members each) — within a cluster everyone
  -- follows everyone, so each cluster is its own dense little social
  -- circle, same as a real "friend group" would look in the follows graph.
  ('mia',     crypt('password123', gen_salt('bf')), false), -- design cluster (+ alice, bob)
  ('liam',    crypt('password123', gen_salt('bf')), false),
  ('ava',     crypt('password123', gen_salt('bf')), false),
  ('noah',    crypt('password123', gen_salt('bf')), false),
  ('zoe',     crypt('password123', gen_salt('bf')), false),
  ('kyle',    crypt('password123', gen_salt('bf')), false),
  ('finn',    crypt('password123', gen_salt('bf')), false), -- gamers cluster (+ carol)
  ('grace',   crypt('password123', gen_salt('bf')), false),
  ('owen',    crypt('password123', gen_salt('bf')), false),
  ('ruby',    crypt('password123', gen_salt('bf')), false),
  ('jack',    crypt('password123', gen_salt('bf')), false),
  ('nora',    crypt('password123', gen_salt('bf')), false),
  ('leo',     crypt('password123', gen_salt('bf')), false),
  ('priya',   crypt('password123', gen_salt('bf')), false), -- foodies cluster
  ('omar',    crypt('password123', gen_salt('bf')), false),
  ('sofia',   crypt('password123', gen_salt('bf')), false),
  ('ethan',   crypt('password123', gen_salt('bf')), false),
  ('maya',    crypt('password123', gen_salt('bf')), false),
  ('diego',   crypt('password123', gen_salt('bf')), false),
  ('chloe',   crypt('password123', gen_salt('bf')), false),
  ('adam',    crypt('password123', gen_salt('bf')), false),
  ('zara',    crypt('password123', gen_salt('bf')), false), -- fitness cluster
  ('victor',  crypt('password123', gen_salt('bf')), false),
  ('elena',   crypt('password123', gen_salt('bf')), false),
  ('marcus',  crypt('password123', gen_salt('bf')), false),
  ('nina',    crypt('password123', gen_salt('bf')), false),
  ('felix',   crypt('password123', gen_salt('bf')), false),
  ('tara',    crypt('password123', gen_salt('bf')), false),
  ('ivan',    crypt('password123', gen_salt('bf')), false),
  ('yuki',    crypt('password123', gen_salt('bf')), false), -- travel cluster
  ('carlos',  crypt('password123', gen_salt('bf')), false),
  ('ingrid',  crypt('password123', gen_salt('bf')), false),
  ('tomas',   crypt('password123', gen_salt('bf')), false),
  ('lena',    crypt('password123', gen_salt('bf')), false),
  ('rafael',  crypt('password123', gen_salt('bf')), false),
  ('hana',    crypt('password123', gen_salt('bf')), false),
  ('oscar',   crypt('password123', gen_salt('bf')), false),
  -- a handful of "singles" — not in a dense cluster, just a few follows
  -- each, so the graph has some sparser, more organic-looking edges too.
  ('jordan',  crypt('password123', gen_salt('bf')), false),
  ('casey',   crypt('password123', gen_salt('bf')), false),
  ('drew',    crypt('password123', gen_salt('bf')), false),
  ('sage',    crypt('password123', gen_salt('bf')), false),
  ('blair',   crypt('password123', gen_salt('bf')), false),
  ('remy',    crypt('password123', gen_salt('bf')), false),
  ('phoenix', crypt('password123', gen_salt('bf')), false);

-- Cluster membership (not a real table — just a seed-time mapping used to
-- generate the mesh of follows below). Each username appears in exactly one
-- cluster; everyone in a cluster follows everyone else in it.
CREATE TEMPORARY TABLE cluster_map (username text, cluster text);
INSERT INTO cluster_map (username, cluster) VALUES
  ('alice', 'design'), ('bob', 'design'), ('mia', 'design'), ('liam', 'design'),
  ('ava', 'design'), ('noah', 'design'), ('zoe', 'design'), ('kyle', 'design'),
  ('carol', 'gamers'), ('finn', 'gamers'), ('grace', 'gamers'), ('owen', 'gamers'),
  ('ruby', 'gamers'), ('jack', 'gamers'), ('nora', 'gamers'), ('leo', 'gamers'),
  ('priya', 'foodies'), ('omar', 'foodies'), ('sofia', 'foodies'), ('ethan', 'foodies'),
  ('maya', 'foodies'), ('diego', 'foodies'), ('chloe', 'foodies'), ('adam', 'foodies'),
  ('zara', 'fitness'), ('victor', 'fitness'), ('elena', 'fitness'), ('marcus', 'fitness'),
  ('nina', 'fitness'), ('felix', 'fitness'), ('tara', 'fitness'), ('ivan', 'fitness'),
  ('yuki', 'travel'), ('carlos', 'travel'), ('ingrid', 'travel'), ('tomas', 'travel'),
  ('lena', 'travel'), ('rafael', 'travel'), ('hana', 'travel'), ('oscar', 'travel');

-- Full mesh within each cluster: everyone follows everyone else in the same
-- cluster (8 members -> 56 directed follow edges per cluster).
INSERT INTO follows (follower_id, followee_id)
SELECT ua.id, ub.id
FROM cluster_map ma
JOIN cluster_map mb ON ma.cluster = mb.cluster AND ma.username <> mb.username
JOIN users ua ON ua.username = ma.username
JOIN users ub ON ub.username = mb.username
ON CONFLICT DO NOTHING;

-- Singles: a few explicit follows each, reaching into different clusters,
-- instead of a dense mesh of their own.
INSERT INTO follows (follower_id, followee_id)
SELECT a.id, b.id FROM users a, users b
WHERE (a.username, b.username) IN (
  ('jordan',  'alice'), ('jordan',  'priya'),  ('jordan',  'zara'),
  ('casey',   'bob'),   ('casey',   'omar'),   ('casey',   'victor'),
  ('drew',    'carol'), ('drew',    'sofia'),  ('drew',    'elena'),
  ('sage',    'mia'),   ('sage',    'ethan'),  ('sage',    'marcus'),
  ('blair',   'finn'),  ('blair',   'maya'),   ('blair',   'nina'),
  ('remy',    'yuki'),  ('remy',    'diego'),  ('remy',    'felix'),
  ('phoenix', 'grace'), ('phoenix', 'chloe'),  ('phoenix', 'tara')
);

-- Every normal (non-celebrity) user follows every celebrity — this is what
-- makes the pull-model path (README §6.2) exercised for more than one
-- account, and covers alice/bob/carol -> starlet from the original seed too.
INSERT INTO follows (follower_id, followee_id)
SELECT u.id, c.id
FROM users u
JOIN users c ON c.is_celebrity = true
WHERE u.is_celebrity = false
ON CONFLICT DO NOTHING;

-- 5-10 posts per user, ~30% with an image (picsum.photos, seeded so the
-- same post always gets the same placeholder image across re-seeds). Posts
-- are inserted oldest-first so bigserial id order matches created_at order
-- — feed.ts sorts by id desc as a proxy for "newest first", so if id order
-- didn't match created_at order, cards could render out of chronological
-- order relative to their own timestamps.
--
-- Deliberately inserted into the outbox as 'pending', NOT 'done': this is
-- what actually exercises the real pipeline (outbox-poller -> Kafka ->
-- fanout-worker -> Redis feed lists) on first boot, instead of needing a
-- separate manual Redis-seeding step. See README §6.1 for the outbox
-- pattern this depends on, and the note on idempotency in
-- backend/fanout-worker/src/index.ts for why replaying this is always safe.
WITH caption_pool AS (
  SELECT ARRAY[
    'Coffee first, thoughts later ☕', 'Weekend adventures 🌄', 'New project in the works 👀',
    'Can''t stop listening to this song', 'Throwback to last summer', 'Just finished a great book 📚',
    'Who else is excited for the weekend?', 'Tried a new recipe tonight 🍝', 'Gym day = good day 💪',
    'Exploring the city today', 'Big news coming soon...', 'Movie night with friends 🎬',
    'Rainy days call for tea and a blanket', 'Finally finished that project!', 'Sunset views never disappoint 🌅',
    'New haircut, who dis?', 'Can we talk about how good this was', 'Working from a coffee shop today',
    'Missing the beach already 🏖️', 'Plot twist: I actually finished my to-do list today', 'Late night thoughts...',
    'Trying something new this week', 'Grateful for good friends and good food', 'Does anyone else love Mondays? just me? ok',
    'Road trip vibes 🚗'
  ] AS captions
),
-- Picking each user's post count in its own CTE, then correlating
-- generate_series against that column, matters: generate_series(1, 5 +
-- floor(random() * 6)::int) directly in a LATERAL cross join has nothing
-- of the outer row to correlate against, so Postgres evaluates that
-- random() call ONCE for the whole query and reuses it for every user
-- (despite the LATERAL keyword) — every user ends up with the exact same
-- post count instead of each getting their own 5-10 draw.
user_post_counts AS (
  SELECT id AS author_id, username, 5 + floor(random() * 6)::int AS post_count
  FROM users
),
raw AS (
  SELECT upc.author_id, upc.username,
         row_number() OVER (ORDER BY random()) AS rn
  FROM user_post_counts upc
  CROSS JOIN LATERAL generate_series(1, upc.post_count) AS gs
),
total AS (SELECT count(*) AS n FROM raw),
prepared AS (
  SELECT r.author_id,
         (SELECT captions[1 + floor(random() * array_length(captions, 1))::int] FROM caption_pool) AS body,
         CASE WHEN random() < 0.3
              THEN 'https://picsum.photos/seed/' || r.username || '-' || r.rn || '/800/600'
              ELSE NULL END AS media_url,
         now() - ((t.n - r.rn) * interval '7 minutes') AS created_at
  FROM raw r, total t
),
inserted AS (
  INSERT INTO posts (author_id, body, media_url, created_at)
  SELECT author_id, body, media_url, created_at FROM prepared ORDER BY created_at
  RETURNING id
)
INSERT INTO outbox (post_id, status)
SELECT id, 'pending' FROM inserted;
