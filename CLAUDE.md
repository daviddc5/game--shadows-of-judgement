# Shadows of Judgment

1v1 Detective vs Vigilante card duel in Phaser 3 + Vite, with a Socket.IO
multiplayer server in `server/` and Cloud Run deploys via Harness.

**Read [docs/DIRECTION.md](docs/DIRECTION.md) first.** It holds the design
decisions, the reasons behind them, and the roadmap. Current rules are in
[docs/CASE_METER_EXPERIMENT.md](docs/CASE_METER_EXPERIMENT.md).

## Two rulesets live side by side

- **New (single player):** `src/case/` (cards, rules engine, AI) and
  `src/scenes/CaseBattleScene.js`. One shared Case meter, simultaneous picks,
  POWER / COUNTER / BAIT / AMBUSH loop. All new work goes here.
- **Old (multiplayer only):** `src/scenes/BattleScene.js`, `src/data/`,
  `src/logic/`, `server/`. Eight-stat rules. Don't extend; it is replaced when
  multiplayer is ported.

`src/case/rules.js` is pure logic with no Phaser, so rules can be tested and
simulated headlessly. Tunable numbers live in its `RULES` object and the card
lists in `src/case/cards.js`.

## Commands

- `npm run dev`: dev server on http://localhost:5173
- `npm test`: Vitest unit tests (`src/**/*.test.js`)
- `npm run simulate -- 10000 [rule=value ...]`: AI-vs-AI balance report (win
  rates, game length, play and payoff rates per card type). Use it before and
  after any rules or card-number change.
- `npm run build`: production build

## Checking changes in the real game

With the dev server running: `npm i --no-save playwright`, then
`node scripts/playtest.mjs [Detective|Vigilante] [outDir]` plays a full match
headlessly, saves screenshots, and prints the result and any page errors. In a
Claude Code cloud container, set `CHROMIUM_PATH=/opt/pw-browsers/chromium`.
Dev builds expose `window.__game` and `window.__caseScene` for this.

## Working style the owner prefers

- Simpler rules with more reads, not more stats.
- Experiment on a branch; `main` is what's deployed.
- Show balance numbers from the simulator and screenshots from a real playthrough
  rather than just describing changes.
