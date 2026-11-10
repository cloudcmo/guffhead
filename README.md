# Guffhead

The card game with the rude name, in the back room of The Guff's Head. https://guffhead.carlosfandango.net

Carl's brief (10 Nov 2026): his own version of the game to play asynchronously with friends, as with CountGuff and
Words and Guff, without the gaps between turns making it stilted. The five things that make that work:

1. **Forced moves are played for you.** Nothing will go (pick up), only one card will go, or you're down to blind
   face-down cards: done instantly, no waiting. About 30% of all goes.
   When you're live at the table, even a no-choice move waits for you to tap it (Carl, 10 Nov 2026); if you leave,
   it's played for you (by the next poll from anyone's phone, or the cron).
2. **GuffBot and Ms GuffBot fill seats** and play the moment it's their go.
3. **The catch-up.** Everything is an event; opening a game replays what happened since you last looked (skippable),
   with GuffBot's commentary on the big moments.
4. **Live play.** If two of you have the game open at once, the page polls every 1.5 s and it plays like a real game.
5. **The idle timer.** Leave your go longer than the table allows (12 hours by default) and GuffBot plays it for you,
   with Ms GuffBot's brain so nobody is punished for being busy. A cron every 15 minutes, and on opening a game.

**Only losing scores** (Carl, 10 Nov 2026). The last player holding cards is the Guffhead and gets a 💩, which lands
on their head and stays there, game after game between those same players, until someone else loses. The league
(`#/league`) counts 💩s in games with at least two people; games against just the house are practice.

## What came over from CountGuff and Words and Guff (10 Nov 2026, from the usability review)
- **Steady table**: the catch-up plays over the table (nothing below moves); tap it to jump on, Skip always there,
  faster when there's a queue. "Next" on the next player's box; bigger opponent cards; a cards-left race strip.
  The swap pre-picks your best three. Tab title "(1) Your go", the app badge, haptics on Android.
- **Social**: chat in a tab under your hand, a peek under the table with a red unread count, your five recent emoji on
  a quick row, emoji on their own shown big, throw an emoji at someone's go. "Nick is looking 👀" / "picking cards…"
  (gh_doing) in the game and the lobby. The welcome sheet for notifications and the Home Screen (three times at most).
  Nudge after 2 hours (`POST /api/games/:id/nudge`). "Your go v Nick" toast after each go.
- **Play feel**: double-tap a card to play it and its matching cards, or drag it onto the pile. Pick cards while you
  wait (played only when you tap Play, and only if they still go). The first few times you're about to spend a 10 or 2
  when an ordinary card would go, the button asks once. GuffBot's poses on big moments (`Jumper.pose`). Bad news lands
  with a bouncing emoji ("while you were away"). Biscuit the dog visits after a minute's stare.
- **Shorter page**: tabs under your hand (Chat, Log, Rules, Table); bottom navigation (Tables, 💩 League, Logbook,
  Record); house rules in two groups.
- **The occasion**: a chalkboard per game (`public/poster.js`), the lobby thumbnail and the end card with the result
  chalked on, shared as a picture. Rare-moment shares (four of a kind, out on a blind flip, a 12-card bonfire). The
  replay (`public/replay.js`, `#/replay/:id`): every hand face up, step or play through; the deal and drawn cards are
  recorded but hidden until the game ends. Fusses at the end (personal-best burn, out first in a row, clean streaks, the
  💩 hat-trick). The good-news stat line. The Logbook (`#/logbook`): friends can watch each other's finished games.
- **The 70s look**: GuffBot in a tweed flat cap; Ms GuffBot in a knotted hanky with a cigarette on the go. December:
  Santa hats, tinsel on the sign, snow, and a cracker on the end card.

## House rules (per game, set when dealing)
Defaults: a **2** goes on anything and resets the pile; a **10** goes on anything and burns the pile (the burner goes
again); **four of a kind** burns. You can play several of the same value at once (a pair of 6s on a 6 or lower); four the same, at once or built up
across goes, burns. Sound is off unless you switch it on. Optional: **7** reverses play (off by default), or 7 means the next player plays 7 or
lower; **8** skips the next player; **3** is invisible; picking up the pile any time; the idle timer (off, 4, 12, 24,
48 hours). The deal screen remembers your last choices on your phone.

## The look
The pub: 1970s wallpaper picked at random from flock damasks (claret, bottle green, midnight, mustard, aubergine) and
Panton-style rings and bubbles (`public/wallpaper.js`), the same for everyone at a table, a fresh one each visit to
the bar; a mahogany table, a beer mat for the pile, a swinging pub sign. Faces are CountGuff's (`cg_avatars`,
read only: change your face in CountGuff), figures in CountGuff's jumpers (`public/jumper.js`, `public/avatar.js`,
copied). Pam the landlady, Tony at the bar and Biscuit the pub dog drift through now and then (`public/lines.js`).
December: fairy lights and Santa hats, as every Guff game.

## Who can play
Logins are Words and Guff's: Carl, Nick, Steve and Kate use the names and PINs they already have, and see each other
as opponents. Private-league players log in with their league code.

## Code
- `public/build.js` the version (bump on every deploy): a phone on an older page gets a "tap to update" bar.
- `public/rules.js` the rules (shared by page and Worker): deal, the swap, plays, burns, the house rules, forced moves,
  what each player may see.
- `public/bot.js` GuffBot (lowest card first, with lapses) and Ms GuffBot (four-of-a-kind burns, saves her 10s for
  big piles, squeezes a player who's nearly out using the cards she hasn't seen). Tuned over thousands of games.
- `public/lines.js` commentary, the log's wording, the back room.
- `src/game.js` tables: run-on (house goes, forced moves), the idle timer, notifications, the 💩 (`reigningFor`,
  `wearer`), the league, storage.
- `src/index.js` routes, login, the cron. `src/people.js` reads logins, opponents and faces from Words and Guff and
  CountGuff tables (never writes). `src/push.js` notifications (copied from CountGuff).
- Data: `gh_` tables in the **wwg** D1 database (`schema.sql`).

## Notifications
Your go: once, until you've looked (however many goes pass meanwhile), saying the most notable thing that happened.
Game over: who's the Guffhead. Nobody at the table is notified. Guffhead has its own key pair (`tools/vapid.mjs`), so
players turn notifications on in the lobby.

## Tests
```
npm install
node test/rules.test.mjs && node test/bot.test.mjs 600 && node test/game.test.mjs
npm run db:local && npx wrangler dev --port 8799     # then, in another Terminal:
node test/worker.test.mjs && python3 test/visual.py && python3 test/visual_play.py
```

## Not done (yet)
Listing in the hub, guff bar and Friday email; a "Play Guffhead" box on other games' pages; replays you can scrub.
