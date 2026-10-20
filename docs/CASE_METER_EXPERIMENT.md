# Case Meter experiment

An experimental ruleset that replaces the eight stat bars with one shared meter.
Single player uses it (`CaseBattleScene`); multiplayer still runs the original
`BattleScene` and server rules.

## Rules

- **One meter, 0–100, starts at 50.** The Detective wins at 100 (capture), the
  Vigilante wins at 0 (escape).
- **Simultaneous picks.** Both players choose a card or WAIT, then both reveal.
  Both cards land together and their pushes add up; the case ends if the net
  result reaches an end. (Card speed was removed: it only mattered on the final
  turn.)
- **COUNTER only stops POWER.** It cancels the POWER card (its energy is still
  spent) and pushes for its owner. Against anything else it fizzles.
- **Scarce, visible energy.** +2 per turn, max 10. WAIT gives +1 extra. Both
  players see each other's energy and recent card types, so 6+ banked energy
  signals a possible POWER card.
- **Rising stakes.** Every card gains +4 push per turn, so games end in about
  8 turns. After turn 12, whichever side the needle leans wins.

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

Current defaults: detective 50.1% / vigilante 49.6%, median game 8 turns,
about 13% decided by the turn-12 verdict.
