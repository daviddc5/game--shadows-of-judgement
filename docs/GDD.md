> **Historical.** This describes the original eight-stat design. The game now
> uses one shared Case meter; see [DIRECTION.md](DIRECTION.md).

# 🎮 **GAME DESIGN DOCUMENT (GDD)**

## **Title:** *Shadows of Judgment* (working title)

## **Genre:** Simultaneous turn-based card strategy (1v1)

## **Unique Hook:** Both players select cards simultaneously - predict your opponent's move and counter it!

## **Art Style:** Pixel art, dark minimal UI

## **Engine:** Phaser 3

## **Platform:** Mobile App (iOS & Android via Capacitor), Web

## **Design Philosophy:** Mobile-first native app, optimized for phones and tablets (750x1334 base resolution, scales to all devices)

---

# 1. **High-Level Concept**

A tense, strategic duel between **Independent Detective** and **Vigilante**.

**Core Innovation:** Unlike traditional turn-based card games, both players **select their cards simultaneously**, then reveal and resolve them based on card speed/priority. This creates mind games - will they play aggressive? Defensive? Can you predict and counter?

Players manage **energy resources** (like mana) to play cards, forcing strategic decisions each turn.

The first player to max out their winning stat OR reduce opponent's morale to 0 **wins**.

---

# 2. **Player Roles**

### **Play as Independent Detective**

Goal: Build evidence to expose the vigilante.

Stats:
* **Evidence (positive):** reach 100 to win
* **Morale (negative):** reach 0 and Detective loses

### **Play as Vigilante**

Goal: Gain public support while avoiding capture.

Stats:
* **Justice Influence (positive):** reach 100 to win
* **Suspicion (negative):** reach 100 and Vigilante loses

---

# 3. **Stats Overview**

Each character has 4 stats (0-100 range):

### **Detective**

| Stat     | Type     | Win/Loss Condition        |
| -------- | -------- | ------------------------- |
| Evidence | Positive | Win at 100                |
| Morale   | Shared   | Lose if reduced to 0      |

### **Vigilante**

| Stat              | Type     | Win/Loss Condition        |
| ----------------- | -------- | ------------------------- |
| Justice Influence | Positive | Win at 100                |
| Suspicion         | Negative | Lose at 100               |

---

# 4. **Core Loop (MVP) - SIMULTANEOUS TURN SYSTEM**

### **Turn Flow:**

1. **Start of Turn**
   - Both players gain +1 energy (max 10)
   - Both draw 2 cards (max hand size: 10)

2. **Selection Phase**
   - Player selects 1 card from hand (highlights selected card)
   - Must have enough energy to play card
   - Click "CONFIRM" button to lock in choice
   - AI simultaneously selects card (hidden)

3. **Reveal Phase**
   - Both cards flip face-up in center of screen
   - Cards resolve in **priority order** (see Card Types below)

4. **Resolution Phase**
   - Higher priority card resolves first
   - Energy costs are deducted
   - Stat changes applied
   - Battle log updates with effects

5. **Check Win Conditions**
   - Any stat at 100 or 0? → Game ends
   - Otherwise, next turn begins

---

# 5. **Energy System**

**Core Resource Management:**

- Players start each game with **1 energy**
- Gain **+1 energy per turn** (max 10)
- Cards cost energy to play (1-10 energy)
- Can only play cards you can afford
- Cards you can't afford are grayed out in hand

**Strategic Depth:**
- Save energy for powerful late-game cards?
- Play multiple weak cards early?
- Predict opponent's energy and counter their big move?

---

# 6. **Card Types & Priority System**

Cards resolve in **priority order** (highest priority goes first):

### **COUNTER Cards (Priority 10)** 🔴
- **Speed:** 10
- **Energy Cost:** 2-3
- **Effect:** Can cancel opponent's card
- **Visual:** Red border
- **Example:** "Interrupt Evidence" - Cancel opponent's card if Speed ≤ 6

### **QUICK Cards (Priority 7-9)** 🔵
- **Speed:** 7-9
- **Energy Cost:** 3-4
- **Effect:** Fast but weak stat changes (+10 to +20)
- **Visual:** Blue border
- **Example:** "Quick Investigation" - +15 Evidence

### **NORMAL Cards (Priority 4-6)** 🟢
- **Speed:** 4-6
- **Energy Cost:** 4-5
- **Effect:** Balanced stat changes (+20 to +30)
- **Visual:** Green border
- **Example:** "Gather Evidence" - +25 Evidence, -5 Morale

### **POWER Cards (Priority 1-3)** 🟡
- **Speed:** 1-3
- **Energy Cost:** 6-10
- **Effect:** Devastating stat changes (+40 to +60)
- **Visual:** Gold border
- **Example:** "Ultimate Case" - +50 Evidence, but costs 8 energy

**Rock-Paper-Scissors Dynamic:**
- COUNTER beats POWER (cancels slow cards)
- QUICK beats COUNTER (resolves first, can't be countered after)
- POWER beats QUICK (massive damage vs chip damage)
- Creates mind games and prediction gameplay

---

# 7. **Sample Cards**

Each card has:
* **name**
* **cardType** (counter/quick/normal/power)
* **speed** (1-10)
* **energyCost** (1-10)
* **description**
* **stat effects**

### **Detective Cards**

| Name               | Type    | Speed | Cost | Effect                          |
| ------------------ | ------- | ----- | ---- | ------------------------------- |
| Data Cross-Match   | NORMAL  | 5     | 4    | +25 Evidence                    |
| Logical Trap       | QUICK   | 8     | 3    | +15 Evidence, +10 Suspicion     |
| Counter Evidence   | COUNTER | 10    | 3    | Cancel opponent if Speed ≤ 6    |
| Ultimate Case      | POWER   | 2     | 8    | +50 Evidence                    |
| Press Interview    | NORMAL  | 6     | 4    | +20 Evidence, -10 Suspicion     |

### **Vigilante Cards**

| Name               | Type    | Speed | Cost | Effect                          |
| ------------------ | ------- | ----- | ---- | ------------------------------- |
| Righteous Act      | NORMAL  | 5     | 5    | +30 Justice Influence           |
| Quick Strike       | QUICK   | 9     | 3    | +15 Justice, +10 Evidence       |
| Block Investigation| COUNTER | 10    | 2    | Cancel opponent if Speed ≤ 5    |
| Divine Judgment    | POWER   | 1     | 9    | +60 Justice Influence           |
| Media Manipulation | NORMAL  | 4     | 4    | -20 Suspicion                   |

**MVP Target:** 15-20 cards per character

---

# 8. **AI Design**

### **MVP AI**
* Considers available energy
* Picks card it can afford
* Attempts to predict player's likely move based on their energy
* Prioritizes cards that advance win condition

---

# 9. **Visual Design**

### **Layout (750x1334 mobile)**

```
┌─────────────────────────────────────────┐
│  [Player Portrait]  [Energy: 5/10]      │
│   Y: 150                                 │
│                                          │
│  [Player Stats] [Opponent Stats]        │
│   Y: 350                                 │
│                                          │
│  ┌──────────┐      ┌──────────┐        │
│  │ SELECTED │      │ SELECTED │        │
│  │  CARD    │  VS  │   CARD   │        │  ← Cards appear here during reveal
│  │ (yours)  │      │ (enemy)  │        │
│  └──────────┘      └──────────┘        │
│   Y: 500                                 │
│                                          │
│  [Battle Log]                            │
│   Y: 600                                 │
│                                          │
│  [Your Hand - 5 cards]                   │
│   Y: 950                                 │
│  [CONFIRM PLAY] button when card picked  │
└─────────────────────────────────────────┘
```

### **Pixel Art**
* Character portraits: 200x200+ (AI-generated pixel art)
* 3 expressions per character: neutral, winning, losing
* Cards: Poker-style with colored borders by type

### **Color Coding**
* 🔴 Red border = COUNTER cards
* 🔵 Blue border = QUICK cards  
* 🟢 Green border = NORMAL cards
* 🟡 Gold border = POWER cards

### **Tone**
* Dark, strategic, tense
* Mind games aesthetic
* Minimal but polished

---

# 10. **Screens**

### **Title Screen**
* Game logo
* "Start Game" button
* Settings button (future)

### **Character Select**
* Choose Detective or Vigilante
* Shows character portrait and brief description
* Explains win conditions

### **Battle Screen** (main gameplay)
* Both character portraits face each other (Y: 150)
* Stat bars below each character (Y: 350)
* Energy counter above player portrait
* Battle log in middle (Y: 600)
* Player's hand at bottom (Y: 950)
* "CONFIRM PLAY" button appears when card selected
* Selected cards appear face-down in center during reveal phase

### **Win/Lose Screen**
* Character portrait (winning or losing expression)
* Victory/defeat message
* Stats summary
* "Play Again" / "Main Menu" buttons

---

# 11. **MVP Scope Summary**

### **Core Features (Must Have):**
✅ Simultaneous card selection with CONFIRM button
✅ Energy system (1-10, +1 per turn)
✅ Card types with priority (Counter/Quick/Normal/Power)
✅ 2 playable characters (Detective, Vigilante)
✅ 15 cards per character
✅ Smart AI that considers energy and predictions
✅ Visual reveal phase showing both cards
✅ Battle log tracking all actions
✅ Win/loss conditions

### **Polish Features (Nice to Have):**
- Floating stat change numbers
- Card draw animations
- Portrait expression changes
- Screen shake on big moves
- Sound effects

### **Post-MVP:**
- More characters (4-6 total)
- Deck building (30-card custom decks)
- Local multiplayer (pass-and-play)
- Online multiplayer
- Story mode
- Card collection system

---

# 12. **What Makes This Unique**

1. **Simultaneous Play** - Not turn-based like Hearthstone, both players act at once
2. **Priority System** - Speed-based resolution creates rock-paper-scissors dynamics
3. **Energy Management** - Forces strategic planning and prediction
4. **Mind Games** - Success depends on reading opponent's likely move
5. **No RNG in gameplay** - Card draws are random, but execution is pure strategy

**Closest comparisons:** 
- Yu-Gi-Oh (card types and priority chains)
- Hearthstone (energy/mana system)  
- Rock-Paper-Scissors (prediction mechanics)

**But unique in combination** - no other card game has simultaneous energy-based priority resolution.

---

# 13. **Monetization (Future)**

### **Kickstarter Tiers:**
- $5: Supporter (name in credits)
- $25: Design a card
- $150: Your character becomes playable (limited slots)
- $500: Design a boss character
- $1000: Full story chapter featuring your character

### **Post-Launch:**
- Free base game (2 characters, 30 cards each)
- $5 per additional character DLC
- $10 "Full Collection" unlock
- Cosmetic card backs/portraits
* "Play Again" button

---

# 9. **Technical Stack**

### **Engine:** Phaser 3

### **Language:** JavaScript

### **Art Tools:**

* Piskel (recommended)
* Aseprite (optional)
* AI for generating base pixel art

### **Deployment:**

* Web browser
* Mobile via Capacitor

---

# 10. **MVP Scope**

The FIRST version must contain only:

✔ One duel
✔ Choose L or Kira
✔ Static pixel art portraits
✔ 4 bars
✔ 10–14 cards
✔ Simple AI
✔ Win/loss
✔ Basic UI layout

DO **NOT** include (yet):

✘ animations
✘ deckbuilding
✘ story
✘ sounds
✘ progression
✘ events

Finish the core first.

---

# 11. **Future Add-Ons (Optional)**

* Sprite animations
* Better AI
* Special abilities
* Story missions
* Different backgrounds
* Rare cards
* "Duel of Wits" mechanic (predictions)
* Multiplayer (later)

---

# 12. **Development Roadmap**

## **Phase 1: Project Setup**
- Initialize Phaser 3 project
- Set up basic project structure
- Create placeholder assets

## **Phase 2: Core Systems**
- Implement stat bar system (4 bars)
- Create card data structure
- Build card rendering system

## **Phase 3: Game Logic**
- Implement turn system
- Add card playing mechanics
- Create win/loss condition checks

## **Phase 4: AI Implementation**
- Build basic random AI
- Add weighted decision-making

## **Phase 5: UI & Screens**
- Character selection screen
- Battle screen layout
- Win/Lose screen

## **Phase 6: Art & Polish**
- Create pixel art portraits
- Design card visuals
- Add UI styling

## **Phase 7: Testing & Balance**
- Playtest card balance
- Adjust stat values
- Bug fixes

---

# 13. **Card Database (Complete List)**

## **L's Deck (7 cards)**

| Card Name          | Evidence | Public Pressure | Kira's Justice | Kira's Suspicion | Description                        |
| ------------------ | -------- | --------------- | -------------- | ---------------- | ---------------------------------- |
| Data Cross-Match   | +10      | 0               | 0              | 0                | Analyze patterns in the data       |
| Logical Trap       | +8       | 0               | 0              | +4               | Set a clever trap for Kira         |
| Press Interview    | 0        | -10             | 0              | 0                | Calm public fears through media    |
| Surveillance Sweep | +6       | 0               | 0              | 0                | Monitor suspects intensively       |
| Interrogation      | +5       | 0               | 0              | +3               | Question a key witness             |
| Task Force Rally   | +4       | -6              | 0              | 0                | Boost team morale                  |
| Public Statement   | 0        | -8              | 0              | 0                | Address the public directly        |

## **Kira's Deck (7 cards)**

| Card Name          | Evidence | Public Pressure | Kira's Justice | Kira's Suspicion | Description                        |
| ------------------ | -------- | --------------- | -------------- | ---------------- | ---------------------------------- |
| Righteous Act      | 0        | 0               | +12            | 0                | Execute a major criminal           |
| Eliminate Witness  | -10      | 0               | 0              | +6               | Remove someone who knows too much  |
| Media Manipulation | 0        | 0               | 0              | -12              | Control the narrative              |
| Intimidation       | -6       | 0               | 0              | 0                | Threaten those investigating       |
| Strategic Kill     | 0        | +8              | +6             | 0                | Make a calculated move             |
| Cover Tracks       | 0        | 0               | 0              | -8               | Hide your involvement              |
| Mass Judgment      | 0        | +6              | +10            | +4               | Execute multiple criminals at once |

---

# ⭐ **This is your official, complete GDD**

This document serves as the single source of truth for *Shadows of Judgment*.
All development decisions should reference this document.

---

**Document Version:** 1.0
**Last Updated:** December 12, 2025
**Status:** Ready for Development
