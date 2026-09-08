# ⚖️ Shadows of Judgment

> *A simultaneous turn-based card strategy game of deduction, deception, and prediction.*

🎮 **[Play Now → shadows-of-judgment-517895523663.europe-west1.run.app](https://shadows-of-judgment-517895523663.europe-west1.run.app/)**

---

## 🕹️ What Is This?

**Shadows of Judgment** is a 1v1 card battle game built in **Phaser 3** where both players select their cards **at the same time** — then reveal and resolve them based on speed and priority.

It's less about luck and more about reading your opponent. Can you predict what they'll play and counter it?

---

## ⚡ Core Gameplay

- Both players pick a card **simultaneously** and hit **CONFIRM**
- Cards resolve in **priority order** — faster cards go first
- Manage your **energy** (starts at 1, gains +1 per turn, max 10) to afford bigger plays
- First to hit their **win condition** wins the duel

### 🃏 Card Types

| Type | Priority | Energy | Effect |
|------|----------|--------|--------|
| 🔴 **COUNTER** | 10 (fastest) | 2–3 | Cancels opponent's slow cards |
| 🔵 **QUICK** | 7–9 | 3–4 | Fast but moderate stat gains |
| 🟢 **NORMAL** | 4–6 | 4–5 | Balanced stats and effects |
| 🟡 **POWER** | 1–3 (slowest) | 6–10 | Devastating but easy to counter |

**The Rock-Paper-Scissors dynamic:**
- COUNTER beats POWER
- QUICK beats COUNTER (resolves before it can be cancelled)
- POWER beats QUICK (massive value vs. chip damage)

---

## 👥 Characters

### 🔍 Independent Detective
- **Win:** Reach 100 **Evidence**
- **Lose:** **Morale** drops to 0
- Playstyle: Methodical, evidence-building, disruption

### ⚔️ Vigilante
- **Win:** Reach 100 **Justice Influence**
- **Lose:** **Suspicion** reaches 100
- Playstyle: Aggressive influence, misdirection, public manipulation

---

## 🎮 Game Modes

| Mode | Description |
|------|-------------|
| 🎮 **Single Player** | Duel against the AI |
| 🌐 **Multiplayer** | Real-time 1v1 online via WebSockets |

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Game Engine | [Phaser 3](https://phaser.io/) |
| Frontend | JavaScript + Vite |
| Multiplayer | Socket.IO (Node.js server) |
| Hosting | Google Cloud Run |
| Art Style | Pixel art, dark minimal UI |

---

## 🚀 Running Locally

### Prerequisites
- Node.js 20+
- npm

### Install & Run

```bash
# Clone the repo
git clone <repo-url>
cd Game2

# Install frontend dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Start the dev server (frontend)
npm run dev

# In a separate terminal — start the game server
npm run server:dev
```

The game will be available at `http://localhost:5173`

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
│   ├── scenes/         # Phaser scenes (Title, Menu, Battle, etc.)
│   ├── logic/          # Game logic (CardResolver, GameLogic, AIController)
│   ├── ui/             # UI components (CardHand, StatBarGroup, BattleLog)
│   ├── data/           # Card and character definitions
│   └── network/        # Multiplayer networking (Socket.IO)
├── server/
│   ├── index.js        # Express + Socket.IO server
│   └── socketHandlers.js
├── assets/             # Fonts, portraits, images
└── GDD.md              # Full Game Design Document
```

---

## 📖 Documentation

- [GDD.md](docs/GDD.md) — Full Game Design Document (mechanics, cards, roadmap)
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — Google Cloud Run deployment guide
- [OBJECTIVES.md](docs/OBJECTIVES.md) — Harness CI/CD and UX objectives
- [UX_IMPROVEMENTS.md](docs/UX_IMPROVEMENTS.md) — Engagement diagnosis and plan
- [design-notes/](docs/design-notes/) — Character art prompts and open design ideas

### Redesign Artifacts

- [docs/redesign/Shadows of Judgment Redesign.dc.html](docs/redesign/Shadows%20of%20Judgment%20Redesign.dc.html) — Interactive redesign prototype
- [docs/redesign/support.js](docs/redesign/support.js) — Runtime dependency used by the redesign prototype
- [docs/redesign/github.md](docs/redesign/github.md) — Redesign implementation notes and source mapping
- [docs/redesign/screenshots/hud.png](docs/redesign/screenshots/hud.png) — HUD screenshot reference
- [docs/redesign/assets/](docs/redesign/assets/) — Supporting assets used by the redesign files

---

## 🗺️ Roadmap

**Shipped**
- [x] Core simultaneous card system
- [x] Energy management + speed/priority resolution
- [x] AI opponent
- [x] Online multiplayer (WebSockets)
- [x] Cloud Run deployment
- [x] Instructions screen

**Next — understandability** (see [docs/UX_IMPROVEMENTS.md](docs/UX_IMPROVEMENTS.md))
- [ ] Turn-by-turn narration + card flavor text
- [ ] Momentum bar (who's winning at a glance)
- [ ] Simplified card effect display
- [ ] Story-driven battle log
- [ ] Interactive guided tutorial

**Next — delivery** (see [docs/OBJECTIVES.md](docs/OBJECTIVES.md))
- [ ] Harness CI pipeline with test gate
- [ ] Immutable image tags + approval gate + rollback

**Later — content**
- [ ] More characters (4–6 total), unlock system
- [ ] More cards per character, combos, rarity
- [ ] Deck building + deck/discard visualisation
- [ ] Story mode with progression

**Later — polish**
- [ ] Sound effects, background music, music selection
- [ ] Particle effects, screen shake, animated backgrounds
- [ ] Character expression switching on winning/losing
- [ ] Original sprite art (replace AI-generated placeholders)
- [ ] Settings menu

**Later — platform & accounts**
- [ ] PWA (installable, offline, fullscreen)
- [ ] Mobile app (Capacitor)
- [ ] Auth + database (match history, leaderboard, profiles)
- [ ] Move multiplayer state out of process memory (unblocks max-instances>1)
- [ ] Ranked mode, best-of-3, turn timer

---

## 📄 License

ISC
