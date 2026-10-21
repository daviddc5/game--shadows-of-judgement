# Case Meter experiment

The current rules: one shared meter instead of the original eight stat bars.
Both single player and multiplayer use them (`CaseBattleScene`, with the server
running the same engine via `server/caseRoom.js`).

## Rules

- **One meter, 0–100, starts at 50.** The Detective wins at 100 (capture), the
  Vigilante wins at 0 (escape).
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
- **Rising stakes.** Every card gains +5 push per turn, so games end in about
  6 turns. After turn 12, whichever side the needle leans wins.

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

Current defaults: detective 50.2% / vigilante 49.7%, median game 7 turns,
about 8% decided by the turn-12 verdict. The simulator also reports how often
each card type is played and how often COUNTER, BAIT and AMBUSH pay off.
