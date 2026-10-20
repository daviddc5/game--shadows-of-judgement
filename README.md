# ⚖️ Shadows of Judgment

> *A simultaneous turn-based card duel of reading, bluffing, and prediction.*

🎮 **[Play Now → shadows-of-judgment-517895523663.europe-west1.run.app](https://shadows-of-judgment-517895523663.europe-west1.run.app/)**

---

## 🕹️ What Is This?

**Shadows of Judgment** is a 1v1 card duel built in **Phaser 3**. A Detective and a Vigilante fight over a single shared meter: **the Case**. Both players pick their card **at the same time**, then both cards land together.

It's less about luck and more about reading your opponent. They've been saving energy: is a POWER card coming, or is it bait?

---

## ⚡ Core Gameplay

- **One shared meter, 0–100, starting at 50.** The Detective pushes it to 100 to **capture**; the Vigilante drags it to 0 to **escape**.
- Both players pick a card (or **WAIT**) in secret, then both reveal. Their pushes add up and the needle moves.
- **Energy is scarce and visible:** +2 per turn (max 10). WAIT banks +1 extra. You can always see your opponent's energy and what they played recently.
- **Stakes rise every turn:** every card pushes harder. If nobody wins by turn 12, the needle decides the verdict.

### 🃏 The mind-game loop

Each special card beats exactly one thing:

| Card | What it does | Beats | Loses to |
|------|--------------|-------|----------|
| 🟡 **POWER** | Huge push | Ordinary cards | COUNTER |
| 🔴 **COUNTER** | Cancels a POWER card and pushes; fizzles otherwise | POWER | BAIT |
| 🟣 **BAIT** | Big push if they COUNTER, small otherwise | COUNTER | Ordinary cards |
| 🟠 **AMBUSH** | Big push if they WAIT, small otherwise | WAIT | Ordinary cards |

🔵 **QUICK** and 🟢 **NORMAL** cards are plain pushes: reliable when you can't read your opponent.

---

## 👥 Characters

| | Wins at | Plays like |
|---|---|---|
| 🔍 **Independent Detective** | Case reaches **100** (capture) | Builds the case, sets stakeouts |
| ⚔️ **Vigilante** | Case reaches **0** (escape) | Misdirection, rumours, public spectacle |

---

## 🎮 Game Modes

| Mode | Description |
|------|-------------|
| 🎮 **Single Player** | Duel an AI that reads your energy and recent plays |
| 🌐 **Multiplayer** | Real-time 1v1 online via WebSockets; the server runs the rules |

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Game Engine | [Phaser 3](https://phaser.io/) |
| Frontend | JavaScript + Vite |
| Rules | Pure JS engine in `src/case/`, shared by client and server |
| Multiplayer | Socket.IO (Node.js server) |
| Hosting | Google Cloud Run |
| Art Style | Pixel-art portraits, noir UI |

---

## 🚀 Running Locally

### Prerequisites
- Node.js 20+
- npm

### Install & Run

```bash
# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Start the dev server (frontend)
npm run dev

# In a separate terminal: start the game server (needed for multiplayer)
npm run server:dev
```

The game will be available at `http://localhost:5173`.

### Tests and balance

```bash
npm test                      # rules engine + multiplayer room tests
npm run simulate -- 10000     # AI-vs-AI balance report
```

---

## 📦 Deployment

The game is deployed to **Google Cloud Run**. See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for full setup instructions.

Harness CI validates changes by installing dependencies, running the test suite, building the Vite client, and publishing a versioned container image to Artifact Registry.

```bash
# Deploy to Cloud Run
npm run deploy
```

---

## 📁 Project Structure

```
├── src/
│   ├── case/           # Rules engine, cards, AI (pure JS, also used by the server)
│   ├── scenes/         # Phaser scenes (Title, Menu, Lobbies, CaseBattleScene, How to Play)
│   └── network/        # Multiplayer networking (Socket.IO client)
├── server/
│   ├── index.js        # Express + Socket.IO server
│   ├── socketHandlers.js
│   └── caseRoom.js     # Multiplayer rooms on top of the rules engine
├── scripts/
│   ├── simulate.mjs    # AI-vs-AI balance simulator
│   └── playtest.mjs    # Headless playthrough with screenshots
├── public/assets/      # Fonts and portraits
└── docs/               # Design direction, rules, deployment
```

---

## 📖 Documentation

- [DIRECTION.md](docs/DIRECTION.md) — Design decisions, why they were made, and the roadmap
- [CASE_METER_EXPERIMENT.md](docs/CASE_METER_EXPERIMENT.md) — Current rules and balancing
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — Google Cloud Run deployment guide
- [OBJECTIVES.md](docs/OBJECTIVES.md) — Harness CI/CD and UX objectives
- [GDD.md](docs/GDD.md) and [UX_IMPROVEMENTS.md](docs/UX_IMPROVEMENTS.md) — The original design and the feedback that led to the redesign (historical)
- [design-notes/](docs/design-notes/) — Character art prompts and open design ideas

### Redesign Artifacts

- [docs/redesign/Shadows of Judgment Redesign.dc.html](docs/redesign/Shadows%20of%20Judgment%20Redesign.dc.html) — Interactive redesign prototype
- [docs/redesign/support.js](docs/redesign/support.js) — Runtime dependency used by the redesign prototype
- [docs/redesign/github.md](docs/redesign/github.md) — Redesign implementation notes and source mapping
- [docs/redesign/screenshots/hud.png](docs/redesign/screenshots/hud.png) — HUD screenshot reference
- [docs/redesign/assets/](docs/redesign/assets/) — Supporting assets used by the redesign files

---

## 🗺️ Roadmap

See [DIRECTION.md](docs/DIRECTION.md) for the reasoning behind each step.

**Shipped**
- [x] Simultaneous card system with energy management
- [x] One shared Case meter (replaced eight stat bars)
- [x] POWER / COUNTER / BAIT / AMBUSH mind-game loop
- [x] AI opponent that reads public information
- [x] Online multiplayer on the same rules engine
- [x] Card flips, screen shake, particles, reactive portraits
- [x] Cloud Run deployment

**Next**
- [ ] Three districts mode (choose a card *and* where to play it)
- [ ] Unified visual style across menus and battle, sound effects
- [ ] Replace the bundled font and placeholder art

**Later**
- [ ] Selectable characters with one passive ability each, then full teams
- [ ] Single-player campaign of escalating cases
- [ ] PWA / mobile app (Capacitor)
- [ ] Auth + database (match history, leaderboard, profiles)
- [ ] Move multiplayer state out of process memory (unblocks max-instances>1)
- [ ] Ranked mode, best-of-3, turn timer

---

## 📄 License

ISC
