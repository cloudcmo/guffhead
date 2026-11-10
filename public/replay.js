// Guffhead: the replay of a finished game (Words and Guff's Guff Replay, for cards). Rebuilds the table at any step
// from the deal (the start event) and the events after it: every hand face up, so you can see who held what.
//
//   steps(events)            -> the events worth a step (plays, pick-ups, flips), in order
//   at(events, n)            -> the table after the first n steps: { seats: [{ id, hand, up, down, out }], pile, burned, draw, last }

import { sortCards } from "./rules.js";

const STEP = new Set(["play", "pickup", "flip"]);
export const canReplay = (events) => events.some((e) => e.k === "start" && e.deal);
export const steps = (events) => events.filter((e) => STEP.has(e.k));

export function at(events, n, settings) {
  const start = events.find((e) => e.k === "start" && e.deal);
  if (!start) return null;
  const seats = start.deal.map((p) => ({ id: p.id, hand: p.hand.slice(), up: p.up.slice(), down: p.down.slice(), out: 0 }));
  const by = Object.fromEntries(seats.map((p) => [p.id, p]));
  let pile = [], burned = 0, draw = start.draw ? start.draw.length : 0, done = 0, last = null;
  const take = (arr, cards) => { for (const c of cards) { const i = arr.indexOf(c); if (i >= 0) arr.splice(i, 1); } };
  for (const e of events) {
    if (e.seq <= start.seq) continue;
    if (STEP.has(e.k)) { if (done >= n) break; done++; last = e; }
    const p = by[e.p];
    if (e.k === "play") {
      take(p[e.from] || [], e.cards);
      pile.push(...e.cards);
      if (e.burn) { burned += pile.length; pile = []; }
    } else if (e.k === "flip") {
      take(p.down, [e.card]);
      if (!e.ok) pile.push(e.card);
    } else if (e.k === "pickup") {
      p.hand = sortCards(p.hand.concat(pile), settings); pile = [];
    } else if (e.k === "draw" && e.cards) {
      p.hand = sortCards(p.hand.concat(e.cards), settings); draw -= e.cards.length;
    } else if (e.k === "out") {
      p.out = e.place;
    }
  }
  return { seats, pile, burned, draw, last, step: done };
}
