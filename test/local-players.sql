-- A local stand-in for the Words and Guff and CountGuff tables Guffhead reads (never run remotely).
CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT NOT NULL, pin_hash TEXT, is_admin INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS leagues (id INTEGER PRIMARY KEY, code TEXT, name TEXT);
CREATE TABLE IF NOT EXISTS memberships (league_id INTEGER, player_id TEXT, sort INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS cg_players (id TEXT PRIMARY KEY, name TEXT NOT NULL, pin_hash TEXT NOT NULL, via TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS cg_links (a TEXT NOT NULL, b TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (a, b));
CREATE TABLE IF NOT EXISTS cg_avatars (player_id TEXT PRIMARY KEY, look TEXT NOT NULL, updated_at INTEGER NOT NULL);
-- PINs: carl 1234, nick 2345, steve 3456, kate 4567 (sha256 of "id:pin")
INSERT OR REPLACE INTO players (id, name, pin_hash) VALUES
  ('carl', 'Carl', '4ded27fa0cff59699a8a269c60c2c915baf20580dbfbe784179125b0d94aa3da'),
  ('nick', 'Nick', 'dd7284d7f0b73aabaef84a0616087507f89efe5713f4adc06b6266891a77a54a'),
  ('steve', 'Steve', 'd54a5234664c2f4c1e45947b00ebe2d15dfc040994dee98e6757510f694e3df7'),
  ('kate', 'Kate', '8d3d8029df76f156f7330bac1f2c0f84a78a8e850de07c68e47fdc40dbfc3f5a'),
  ('guffbot', 'GuffBot', NULL);
INSERT OR REPLACE INTO leagues (id, code, name) VALUES (1, 'GUFF', 'Guff');
INSERT OR REPLACE INTO memberships (league_id, player_id) VALUES (1, 'carl'), (1, 'nick'), (1, 'steve'), (1, 'kate');
INSERT OR REPLACE INTO cg_avatars (player_id, look, updated_at) VALUES ('nick', '{"face":"oval","skin":"olive","hair":"quiff","hairColour":"greyblack","beard":"tache","glasses":"sun","eyes":"brown","mouth":"grin","cheeks":"none","earrings":"none","hat":"none","hatColour":"navy","drink":"port","snack":"twiglets"}', 1);
