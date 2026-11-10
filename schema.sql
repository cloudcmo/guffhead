-- Guffhead's tables. They live in the Words and Guff database (wwg), beside players, memberships and CountGuff's
-- cg_ tables, which Guffhead reads for logins, opponents and faces and never writes to. Everything of Guffhead's
-- is prefixed gh_. Nothing here touches another game's table, and every statement is safe to run twice.
--
--   cd ~/code/guffhead && npx wrangler d1 execute wwg --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS gh_sessions (
  token      TEXT PRIMARY KEY,
  player_id  TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS gh_games (
  id         TEXT PRIMARY KEY,
  status     TEXT NOT NULL,            -- playing | finished
  turn       TEXT,                     -- who the table is waiting on, comma-separated
  state      TEXT NOT NULL,            -- the whole game as JSON (src/game.js, public/rules.js)
  ver        INTEGER NOT NULL,         -- bumped on every save, so two phones can't move at once
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS gh_games_updated ON gh_games (status, updated_at);

CREATE TABLE IF NOT EXISTS gh_game_players (
  game_id    TEXT NOT NULL,
  player_id  TEXT NOT NULL,
  seat       INTEGER NOT NULL,
  PRIMARY KEY (game_id, player_id)
);
CREATE INDEX IF NOT EXISTS gh_game_players_player ON gh_game_players (player_id);

CREATE TABLE IF NOT EXISTS gh_results (
  game_id     TEXT PRIMARY KEY,
  players     TEXT NOT NULL,           -- comma-separated, seat order
  loser       TEXT,                    -- the Guffhead
  practice    INTEGER NOT NULL,        -- 1 when the house played
  detail      TEXT NOT NULL,           -- JSON: finishing order, turns, burns, house rules
  finished_at INTEGER NOT NULL
);

-- Who has looked at each game, and when: presence for live play, and "already notified, hasn't looked since"
CREATE TABLE IF NOT EXISTS gh_seen (
  game_id    TEXT NOT NULL,
  player_id  TEXT NOT NULL,
  seq        INTEGER NOT NULL,         -- the last event they saw
  seen_at    INTEGER NOT NULL,         -- the last time their phone said it was at the table
  pushed_seq INTEGER NOT NULL,         -- the event we last notified them at
  PRIMARY KEY (game_id, player_id)
);

-- Notifications, one row per device
CREATE TABLE IF NOT EXISTS gh_push (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id   TEXT NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  ua          TEXT,
  created_at  INTEGER NOT NULL,
  last_ok     INTEGER
);
CREATE INDEX IF NOT EXISTS gh_push_player ON gh_push (player_id);

-- The table talk in a game
CREATE TABLE IF NOT EXISTS gh_chat (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id     TEXT NOT NULL,
  player_id   TEXT NOT NULL,
  text        TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS gh_chat_game ON gh_chat (game_id, id);

-- What someone at the table is doing right now ("Nick is picking cards…"), for a few seconds at a time
CREATE TABLE IF NOT EXISTS gh_doing (
  game_id    TEXT NOT NULL,
  player_id  TEXT NOT NULL,
  what       TEXT NOT NULL,            -- looking | picking
  at         INTEGER NOT NULL,
  PRIMARY KEY (game_id, player_id)
);

-- Guests: anyone a player has invited with a link (no PIN: their phone keeps a session). Never in the shared logins.
CREATE TABLE IF NOT EXISTS gh_guests (
  id         TEXT PRIMARY KEY,         -- gh-g-xxxxxxxx
  name       TEXT NOT NULL,
  host       TEXT NOT NULL,            -- who invited them
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS gh_guests_host ON gh_guests (host);

-- Invite links: one link, one guest, a week to use it
CREATE TABLE IF NOT EXISTS gh_invites (
  code       TEXT PRIMARY KEY,
  host       TEXT NOT NULL,
  bots       TEXT NOT NULL,            -- house players to seat too, comma-separated (may be empty)
  settings   TEXT NOT NULL,            -- the house rules, JSON
  created_at INTEGER NOT NULL,
  used_by    TEXT,                     -- who joined
  game_id    TEXT
);
