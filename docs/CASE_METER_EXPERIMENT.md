# Case Meter experiment

The current rules: one shared meter instead of the original eight stat bars.
Both single player and multiplayer use them (`CaseBattleScene`, with the server
running the same engine via `server/caseRoom.js`).

## Rules

- **One meter, 0–200, starts at 100.** The Detective wins at 200 (capture), the
  Vigilante wins at 0 (escape). (It was 0–100 until the "longer games" change:
  a single uncountered Power card, 55 + stakes, covered the whole 50 to a win,
  so one guess often decided the case by turn 3.)
- **Simultaneous picks.** Both players choose a card or WAIT, then both reveal.
  Both cards land together and their pushes add up; the case ends if the net
  result reaches an end. (Card speed was removed: it only mattered on the final
  turn.)
- **Each special card beats one thing** (a mind-game loop):

  | Card | Does | Beats | Loses to |
  | --- | --- | --- | --- |
  | POWER | Big push | Ordinary cards | COUNTER |
  | COUNTER | Cancels POWER (its energy is still spent) and pushes; fizzles otherwise | POWER | BAIT |
  | BAIT | Small push, big push if the opponent COUNTERs | COUNTER | Ordinary cards |
  | AMBUSH | Small push, big push if the opponent WAITs | WAIT | Ordinary cards |
- **Scarce, visible energy.** +2 per turn, max 10. WAIT gives +1 extra. Both
  players see each other's energy and recent card types, so 6+ banked energy
  signals a possible POWER card.
- **Clean card numbers.** Every push is a multiple of 5, and cards of the same
  type and cost push the same: Quick 10 (cost 1) and 15 (cost 2), Normal 20
  (cost 3) and 25 (cost 4), Power 55 (cost 6) and 75 (cost 8), Counter 20, Bait
  5 or 35 when it springs, Ambush 5 or 30. Playtesters found odd numbers like
  19 and 7 hard to add up.
- **Status effects.** A few cheaper cards trade push for an effect on the
  opponent, shown as a red tag by their energy:
  - **Shaken** (Press Conference, Anonymous Threat; cost 2, push 5): their
    Power cards cost +2 next turn.
  - **Cornered** (Lockdown, Blackmail; cost 3, push 10): they can't Wait next
    turn if they can afford any card.
  - **Heat** (Most Wanted, Smear Campaign; cost 3, push 10): the meter drifts
    10 your way at the start of each of the next 2 turns.
- **Character abilities.** Each character has one passive ability, always on
  and visible to both players as an outlined tag by their name:
  - **Hunch** (Deniz, Detective): his Counters and Baits cost 1 less.
  - **Patience** (Giovanni, Vigilante): Waiting saves +1 more energy (+4 in
    all instead of +3).
- **Rising stakes.** Every card gains +5 push per turn, so games end in about
  13 turns. After turn 20, whichever side the needle leans wins.

## Files

| File | What it holds |
| --- | --- |
| `src/case/cards.js` | Card lists for both sides |
| `src/case/rules.js` | Pure rules engine and tunable `RULES` |
| `src/case/ai.js` | AI that reads opponent energy and history |
| `src/case/rules.test.js` | Rules tests |
| `src/scenes/CaseBattleScene.js` | The battle screen and its effects |
| `scripts/simulate.mjs` | AI-vs-AI balance simulator |

## Balancing

`npm run simulate -- 10000` plays AI-vs-AI games and reports win rates and game
length. Pass rule overrides to try changes without editing code:

```
npm run simulate -- 10000 escalationFlat=2 energyPerTurn=1
```

Current defaults: detective 49.5% / vigilante 50.3%, median game 13 turns
(p10 8, p90 20), about 9% decided by the turn-20 verdict. Before the longer
games change (0–100 meter, turn-12 verdict): median 7 turns, p10 3. The simulator also reports how often
each card type is played and how often COUNTER, BAIT and AMBUSH pay off.
