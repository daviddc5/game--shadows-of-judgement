# Shadows of Judgment

1v1 Detective vs Vigilante card duel in Phaser 3 + Vite, with a Socket.IO
multiplayer server in `server/` and Cloud Run deploys via Harness.

**Read [docs/DIRECTION.md](docs/DIRECTION.md) first.** It holds the design
decisions, the reasons behind them, and the roadmap. Current rules are in
[docs/CASE_METER_EXPERIMENT.md](docs/CASE_METER_EXPERIMENT.md).

## Layout

- `src/case/`: cards, pure rules engine (`rules.js`, tunable `RULES`), and AI.
  No Phaser, so rules can be tested and simulated headlessly.
- `src/scenes/CaseBattleScene.js`: the battle screen for both modes. Single
  player runs the rules locally against the AI; online it sends choices to the
  server and animates the events it gets back.
- `server/caseRoom.js`: multiplayer rooms (matchmaking pairs, hidden-hand views,
  turn submission) on the same rules engine; `socketHandlers.js` is the thin
  Socket.IO layer. The server imports `../src/case/`, and the Dockerfile copies
  those files to keep that path working, so update it if `src/case` gains files
  the server needs.

## Commands

- `npm run dev`: dev server on http://localhost:5173
- `npm test`: Vitest unit tests (`src/` and `server/`)
- `npm run simulate -- 10000 [rule=value ...]`: AI-vs-AI balance report (win
  rates, game length, play and payoff rates per card type). Use it before and
  after any rules or card-number change.
- `npm run build`: production build
- `node scripts/make-sfx.mjs [name]`: rebuilds the sound effects in
  `public/assets/audio/sfx/` from their recipes (needs ffmpeg)

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
