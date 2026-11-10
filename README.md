# Guffhead

The card game with the rude name, in the back room of The Guff's Head. https://guffhead.carlosfandango.net

Carl's brief (10 Nov 2026): his own version of the game to play asynchronously with friends, as with CountGuff and
Words and Guff, without the gaps between turns making it stilted. The five things that make that work:

1. **Forced moves are played for you.** Nothing will go (pick up), only one card will go, or you're down to blind
   face-down cards: done instantly, no waiting. About 30% of all goes.
2. **GuffBot and Ms GuffBot fill seats** and play the moment it's their go.
3. **The catch-up.** Everything is an event; opening a game replays what happened since you last looked (skippable),
   with GuffBot's commentary on the big moments.
4. **Live play.** If two of you have the game open at once, the page polls every 1.5 s and it plays like a real game.
5. **The idle timer.** Leave your go longer than the table allows (12 hours by default) and GuffBot plays it for you,
   with Ms GuffBot's brain so nobody is punished for being busy. A cron every 15 minutes, and on opening a game.

**Only losing scores** (Carl, 10 Nov 2026). The last player holding cards is the Guffhead and gets a 💩, which lands
on their head and stays there, game after game between those same players, until someone else loses. The league
(`#/league`) counts 💩s in games with at least two people; games against just the house are practice.

## House rules (per game, set when dealing)
Defaults: a **2** goes on anything and resets the pile; a **10** goes on anything and burns the pile (the burner goes
again); **four of a kind** burns. Optional: **7** reverses play (off by default), or 7 means the next player plays 7 or
lower; **8** skips the next player; **3** is invisible; picking up the pile any time; the idle timer (off, 4, 12, 24,
48 hours). The deal screen remembers your last choices on your phone.

## The look
The pub: carpet, a mahogany table, a beer mat for the pile, a swinging pub sign. Faces are CountGuff's (`cg_avatars`,
read only: change your face in CountGuff), figures in CountGuff's jumpers (`public/jumper.js`, `public/avatar.js`,
copied). Pam the landlady, Tony at the bar and Biscuit the pub dog drift through now and then (`public/lines.js`).
December: fairy lights and Santa hats, as every Guff game.

## Who can play
Logins are Words and Guff's: Carl, Nick, Steve and Kate use the names and PINs they already have, and see each other
as opponents. Private-league players log in with their league code.

## Code
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
