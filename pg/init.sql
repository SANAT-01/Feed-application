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

-- Demo seed data: three normal users and one celebrity, so the hybrid
-- push/pull split (README §6.2) is visible immediately in the UI.
-- All four log in with the password "password123".
INSERT INTO users (username, password_hash, is_celebrity) VALUES
  ('alice',   crypt('password123', gen_salt('bf')), false),
  ('bob',     crypt('password123', gen_salt('bf')), false),
  ('carol',   crypt('password123', gen_salt('bf')), false),
  ('starlet', crypt('password123', gen_salt('bf')), true);

-- alice and bob follow the celebrity, and each other.
INSERT INTO follows (follower_id, followee_id)
SELECT a.id, b.id FROM users a, users b
WHERE (a.username, b.username) IN (
  ('alice', 'bob'),
  ('alice', 'starlet'),
  ('bob',   'starlet'),
  ('bob',   'alice'),
  ('carol', 'alice'),
  ('carol', 'starlet')
);
