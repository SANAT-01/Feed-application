-- Seed the feedapp database. Runs automatically the first time the pg container
-- initializes (as user "app" against database "feedapp").

CREATE SEQUENCE post_ids START 100;

CREATE TABLE users (
    id           integer PRIMARY KEY,
    name         text    NOT NULL,
    is_celebrity boolean NOT NULL DEFAULT false
);

-- starlet is the scaled-down celebrity: 200,000 followers. casey is a normal
-- user with 50. (A real celebrity has 100M+ — the shape of the problem is
-- identical, the lab just doesn't make you wait an hour for it.)
INSERT INTO users (id, name, is_celebrity) VALUES
  (1, 'starlet', true),
  (2, 'casey',   false);

CREATE TABLE posts (
    id        bigint  PRIMARY KEY,
    author_id integer NOT NULL REFERENCES users(id),
    body      text    NOT NULL
);

CREATE TABLE follows (
    follower_id integer NOT NULL,
    followee_id integer NOT NULL REFERENCES users(id),
    PRIMARY KEY (follower_id, followee_id)
);

-- Followers 1000..200999 follow starlet (200,000 of them).
INSERT INTO follows (follower_id, followee_id)
SELECT g, 1 FROM generate_series(1000, 200999) AS g;

-- Followers 1000..1049 also follow casey (50 of them) — so follower 1000 and
-- friends see both accounts in their feed.
INSERT INTO follows (follower_id, followee_id)
SELECT g, 2 FROM generate_series(1000, 1049) AS g;

CREATE INDEX follows_by_followee ON follows (followee_id);
CREATE INDEX follows_by_follower ON follows (follower_id);
