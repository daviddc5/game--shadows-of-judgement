> **Historical.** This describes the original eight-stat design. The game now
> uses one shared Case meter; see [DIRECTION.md](DIRECTION.md).

# UX & Engagement Improvements

## Context

LinkedIn feedback: the game concept is cool but it's **hard to understand and hard to engage with**. This document captures the diagnosis and planned improvements.

---

## Diagnosis

### 1. Eight bars on screen, but only four decide anything
Each player has their own four stats — `playerStats` and `opponentStats` are separate objects, each panel labelled from its own character. So there are eight bars on screen.

Of those eight, **only four can end the match**: each character's `winCondition` stat and their `loseCondition` stat. The remaining four have no win/lose role and only affect the rare deck-exhaustion tiebreak.

So the player is asked to track eight bars, half of which are almost decorative, with nothing on screen distinguishing the decisive ones. Most successful card games have 1-2 stats (health, mana). **This is the real "too many stats" problem, and no task in this document currently fixes it — see U29.**

### 2. Win/lose conditions are confusing
"Get your green stat to 100 but don't let your red stat hit 100" - and the opponent's conditions are *different*. Players must learn two rule sets.

### 2b. 🔴 The colours actively lie to the Detective
In `characters.js`, the Detective's `morale` stat is:
- labelled **"Team Morale"** — sounds like it belongs to the player
- coloured **green**, `isGreen: true`, commented *"want high"*
- listed in **`negativeStats`** — contradicting the line above it
- the Detective's **`loseCondition` at `>= 100`**

So a new Detective player sees a green bar called "Team Morale", correctly infers that green means push it up, pushes it up, and **loses the game**. `statColors.isGreen` feeds `isPositive` straight into the stat bars at `BattleScene.js:238-239`, so this renders exactly as described.

No amount of narration or tutorial fixes a UI that tells players to do the thing that kills them. **Fix this before anything else in this document.**

### 3. No learning-by-doing
The 5-page tutorial is a wall of text. Players must read and memorize rules before they can play. Successful games teach through guided first turns.

### 4. Card effects are opaque
Cards modify 4 stats simultaneously with different values. A card might do `+15 Investigation, -8 Public Pressure, +10 opponent Suspicion`. That's hard to evaluate at a glance.

### 5. No visual storytelling (HIGHEST PRIORITY)
The theme (detective vs vigilante) is cool but conveyed only through stat names and card text. There's no narrative arc or visual feedback that makes the theme *felt*.

### 6. Energy + speed + type system is a lot at once
Players need to understand energy costs, speed/priority, card types, AND stat effects all before their first turn.

---

## How to use this document

Every task is a checkbox with an ID (`U1`, `U2`, ...). Work top to bottom — the order is deliberate, not a preference. Phase 0 is a correctness fix; everything after it is wasted effort until it lands, because playtests before it measure the wrong problem.

### Instructions for the agent

When you finish a task in this file, update it in the same change:

1. Tick the box: `- [ ]` becomes `- [x]`.
2. Append the completion marker to that line: `✅ <YYYY-MM-DD> · <short commit sha>`.
3. If the work revealed the task was wrong, unnecessary, or already done, **do not silently tick it** — rewrite the line to say what was actually true, and note why.
4. If you discover new work, add it as a new `U<n>` under the right phase rather than expanding an existing task.
5. Never tick a box you have not verified. "The code looks right" is not verification — run it, or say plainly that you did not.
6. Keep the phase ordering intact. If something must jump the queue, move the line and say why in the commit message.
7. **Do not start a phase until the previous phase's test gate is fully ticked.** A gate is not paperwork — it is the only evidence the work did what it claimed.
8. Every gate re-runs `npm test`. A phase that breaks an earlier phase's tests is not finished.

Update the progress count in the phase headings as you go.

---

## Task List

#### 🔒 Gate B — baseline (do this before U0)

⚠️ *All of Gate B requires humans — the agent cannot run it.* The pre-fix build is tagged `baseline-pre-ux` (2026-08-14); `git checkout baseline-pre-ux` to run the baseline against the original.

Run the current build past five people who have never played, and **write the answers down**. Without this there is no way to prove any of the work below helped.

- [ ] **GB.1** — Mid-match screenshot, "who is winning?" Record how many of five get it right, and how long they take.
- [ ] **GB.2** — Let them play one match unaided. Record the turn number where attention visibly drops.
- [ ] **GB.3** — "Would you play again?" Record yes/no. This is the question the original feedback was about.
- [ ] **GB.4** — Record one sentence each on what confused them most.

### Phase 0 — Correctness (blocks everything) · 5/5 ✅

The UI currently instructs Detective players to do the thing that loses them the game. Nothing else in this document matters until this is fixed.

- [x] **U0** — Set up Vitest (`npm i -D vitest`, `"test": "vitest run"`). `GameLogic` is a static class with no Phaser dependency and `CardResolver` imports only `GameLogic`, so both test standalone with no mocking. There is currently no test infrastructure in the repo at all. *Doubles as the P14 Harness test gate — see [OBJECTIVES.md](OBJECTIVES.md).* ✅ 2026-08-14 · cf069af
- [x] **U1** — Fix the Detective's `morale` contradiction in `characters.js`: it is coloured green with `isGreen: true` ("want high"), listed in `negativeStats`, and is the `loseCondition` at `>= 100`. Decide which is true and make all three agree. ✅ 2026-08-14 · cf069af
- [x] **U2** — Audit the other seven stat label/colour pairs. **Outcome: no second bug.** I first reported one — that the Detective's `pressure` should be green — but that came from a wrong model in which the four stats were shared between players. They are not. The Detective's `pressure` has no role in either player's win or lose condition, so its colour is a design choice, not a correctness issue. Reverted. Only U1 was a real defect. ✅ 2026-08-14 · 75f2c8b
- [x] **U3** — ~~Relabel all four stats so the name says whose it is.~~ **Task was based on a false premise and has been reverted.** It assumed the two panels shared one set of stats, so labels had to disambiguate ownership. Each panel actually shows its own character's stats, so "Their Confidence" on your own panel is wrong. All eight labels restored to the originals. The real labelling problem is different and is now U29. ✅ 2026-08-14 · 75f2c8b
- [x] **U4** — Reconcile `GameLogic.checkWinConditions()` with the `winCondition`/`loseCondition` objects in `characters.js`. It currently hardcodes thresholds and returns the names `"Detective L"` and `"Kira"`, which also leaks the pre-pivot Death Note naming to the player. **Note:** this method turned out to be unused — `BattleScene` duplicates the win logic inline at 1938-1959, so live win detection was never affected by the wrong names. Duplication tracked as U28. ✅ 2026-08-14 · cf069af

#### 🔒 Gate 0 — the fix is real

- [x] **G0.1** — Unit tests cover every win and lose condition for both characters, driven from `characters.js` rather than hardcoded values. Red before U4, green after. ✅ 2026-08-14 · cf069af — 26 tests, `npm test`
- [ ] **G0.2** — ⚠️ *Human required — agent cannot verify.* Play a full match as the Detective. Confirm no bar rendered green causes a loss when filled.
- [ ] **G0.3** — ⚠️ *Human required.* Play a full match as the Vigilante. Same check.
- [ ] **G0.4** — ⚠️ *Human required.* Show the battle screen to one person who has not played. Ask: "point at the bars you want to go up." Their answer must match what actually wins. **This is the test that would have caught U1 originally.**

#### Follow-up raised during Phase 0

- [ ] **U29** — Distinguish the four decisive bars from the four that are near-decorative. Each character's `winCondition` and `loseCondition` stats end the match; the other two only affect the deck-exhaustion tiebreak, yet all eight render identically. Options: show only the decisive two per player, visually demote the other two, or give the inert two a real mechanical role. **This is diagnosis #1 and nothing else in this document addresses it.**

- [ ] **U28** — `BattleScene.js:1938-1959` duplicates the win/lose logic that `GameLogic.checkWinConditions()` implements, and only the BattleScene copy actually runs. Make BattleScene call GameLogic so there is one implementation, or delete the unused method. Two copies of a rule is how U1 survived.

### Phase 0.5 — Design pass (before building new UI) · 0/3

Narration, the momentum bar, and simplified cards all need somewhere to live. Build them into the current layout and then redesign, and each gets built twice.

*Claude can produce U5 and U6 as a page you look at and react to, rather than prose. Copy-paste prompts are in [Appendix — Design Prompts](#appendix--design-prompts). Claude can do layout, colour, type and spacing; it cannot produce the pixel-art portraits, which is why U7 is a decision rather than a deliverable.*

- [ ] **U5** — Agree one battle-screen layout at 750x1334 with deliberate space for the momentum bar, narration overlay, and compact stats. Mockup first, no code.
- [ ] **U6** — Define a named colour palette and type scale. "Green means good" becomes one rule applied once, instead of a per-stat decision that produced U1.
- [ ] **U7** — Decide the art direction. The pixel-art portraits and the flat-rectangle UI currently belong to two different games.

#### 🔒 Gate 0.5 — the design is buildable

- [ ] **G0.5.1** — Every Phase 1-4 element has a defined position in the mockup: momentum bar, narration overlay, compact stats, hand, staging area. Nothing gets "fitted in later".
- [ ] **G0.5.2** — Smallest text in the design is ≥24px in the 750-wide space.
- [ ] **G0.5.3** — Palette checked in a bright room and a dim one. Phones get used in both.

### Phase 1 — Touch and feel · 0/9

Addresses the "loses engagement" half of the feedback. Cheapest wins per hour of work, and every later change inherits the benefit.

- [ ] **U8** — Button press states: scale to ~0.95 on `pointerdown`, spring back on release. Buttons currently only swap `setBackgroundColor` on hover, so **on touch they give no feedback at all** — see `MenuScene.js:56-62`.
- [ ] **U9** — Replace hover-driven card preview with tap-to-preview → tap-to-confirm. `CardHand`'s `HOVER_LIFT`/`HOVER_SCALE` fire on finger-down then immediately fire `pointerdown`, so cards flash and misplay on touch.
- [ ] **U10** — Font size pass. Nothing below ~24px in the 750-wide design space; the canvas renders at roughly half scale on a phone, so current 10-14px labels land around 5-7pt.
- [ ] **U11** — Safe-area handling for notch and home indicator. 750x1334 is 0.5625; modern phones are ~0.46, so `Scale.FIT` letterboxes.
- [ ] **U12** — `SoundManager.js` plus preload in `BootScene`. There is currently **zero audio in the codebase**.
- [ ] **U13** — Core sounds: card select, card confirm, card reveal, a distinct counter/cancel sting, stat gain vs loss tones, win and lose stings. The counter is the most dramatic moment in the game and currently passes in silence.
- [ ] **U14** — One ambient loop with a mute toggle that persists.
- [ ] **U15** — Stat bar overshoot and settle. (Floating `+12`/`-8` numbers already exist and work — see Already Done.)
- [ ] **U16** — Time one full turn end to end and write the number down. Overlap the stacked `delayedCall`s (800 + 1000 + 1000 + 500 + 800, plus a 2000ms hold) and let a tap skip any resolution animation.

#### 🔒 Gate 1 — it feels responsive on a real device

**On an actual phone, not a desktop browser at a narrow window.** Nothing in this phase can be validated with a mouse.

- [ ] **G1.1** — Every button gives visible feedback within ~100ms of touch. Tap each one and watch.
- [ ] **G1.2** — A card cannot be played by a single accidental tap. Preview and confirm are distinct actions.
- [ ] **G1.3** — Read every label on the battle screen at arm's length without squinting.
- [ ] **G1.4** — Turn time measured end to end and compared against the U16 baseline. Write both numbers down.
- [ ] **G1.5** — Mute toggle survives a reload.
- [ ] **G1.6** — `npm test` green.

### Phase 2 — Comprehension · 0/3

- [ ] **U17** — `MomentumBar.js`: one horizontal tug-of-war bar showing who is ahead without needing to parse individual stats. `(playerWin - playerRisk) - (opponentWin - opponentRisk)`, animated each turn.
- [ ] **U18** — Simplified card effect display in `CardHand.js`: coloured arrows ("YOU: +++" / "FOE: --") on the face, full stat breakdown only in the enlarged view.
- [ ] **U19** — `GameOverScene` payoff: show the final momentum swing, one line on *why* they won or lost tied to the deciding stat, and make "play again" the default action with no character re-selection.

#### 🔒 Gate 2 — a stranger can tell who is winning

- [ ] **G2.1** — Show a mid-match screenshot to five people who have never played. Ask "who is winning?" **Target: 4 of 5 correct within 5 seconds.** Record the score; this is the headline metric.
- [ ] **G2.2** — Same five people, shown one card: "is this good for you or bad?" Correct without opening the detail view.
- [ ] **G2.3** — `npm test` green.

### Phase 3 — Storytelling · 0/4

- [ ] **U20** — Add a `playNarration` field to all 25 cards in `cards.js`.
- [ ] **U21** — `narration.js`: narrative generation for card plays and game events (win stat crossing 50, lose stat crossing 75, near-win at 90+, counter plays).
- [ ] **U22** — `NarrativeOverlay.js` plus screen effects wired into `CardResolver.js`: shake on power cards, red flash on counters, glow on large stat changes.
- [ ] **U23** — Turn `BattleLog` into a story log: short narrative sentences, colour-coded by impact, with turn context. Add entry transitions (currently 0 tweens).

#### 🔒 Gate 3 — the narration tells the truth

- [ ] **G3.1** — Read ten consecutive battle log entries aloud. They should form a story, not a list.
- [ ] **G3.2** — **No narration contradicts what mechanically happened.** The real risk here: dramatic text that says a move landed when it was countered. Check counters, cancels, and zero-effect plays specifically.
- [ ] **G3.3** — Screen effects do not obscure the cards or bars at the moment the player needs to read them.
- [ ] **G3.4** — `npm test` green.

### Phase 4 — Teaching · 0/2

- [ ] **U24** — `TutorialBattleScene.js`: guided first game, one concept per turn (select → energy → momentum → your stats → their stats → counters), predictable AI, skippable at any point.
- [ ] **U25** — "LEARN TO PLAY" button in `MenuScene`, register the scene in `config.js`.

#### 🔒 Gate 4 — a new player can learn it unaided

- [ ] **G4.1** — Someone who has never played completes the tutorial with no help from you. **Say nothing while they play.**
- [ ] **G4.2** — Afterwards they explain the rules back correctly: how to win, how to lose, what a counter does.
- [ ] **G4.3** — Tutorial is skippable at every step without leaving a broken state.
- [ ] **G4.4** — They answer yes to "would you play again?" — the question the original feedback was actually about.
- [ ] **G4.5** — `npm test` green.

### Phase 5 — Reasons to return (later) · 0/2

- [ ] **U26** — Persist matches played, win rate, longest streak locally.
- [ ] **U27** — Per-character win/loss tracking, to give a reason to try the other side.

---

#### 🔒 Gate 5 — progress persists

- [ ] **G5.1** — Record survives killing and reopening the app.
- [ ] **G5.2** — A corrupted or absent save does not crash the game.
- [ ] **G5.3** — `npm test` green.

---

## Already Done

Recorded so nobody rebuilds them:

- [x] **Floating stat-change numbers** — `StatBarGroup.showStatChange()` spawns coloured `+12`/`-8` text, floats and fades it, and correctly inverts colour for negative stats. Called on every stat update.
- [x] **Card resolution animation** — flip reveal, counter/cancel X, priority text, and glow layers are all tweened.
- [x] **Animated stat bar fill** — 300ms `Power2` ease on value change.
- [x] **Instructions screen** — `InstructionsScene.js` exists. Note this is the "wall of text" that U24 replaces, not a substitute for it.

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/data/narration.js` | Narrative text for all cards + game event narration |
| `src/ui/MomentumBar.js` | Tug-of-war progress indicator |
| `src/ui/NarrativeOverlay.js` | Dramatic text overlay during card resolution |
| `src/scenes/TutorialBattleScene.js` | Interactive tutorial scene |
| `src/audio/SoundManager.js` | Central sound playback + mute toggle |

## Files to Modify

| File | Changes |
|------|---------|
| `src/data/cards.js` | Add `playNarration` to each card |
| `src/ui/CardHand.js` | Simplified effect display (arrows instead of numbers) |
| `src/ui/BattleLog.js` | Transform into narrative story log; add entry transitions |
| `src/ui/StatBarGroup.js` | Add overshoot/settle (floating numbers already implemented) |
| `src/logic/CardResolver.js` | Integrate narration generation + screen effects |
| `src/scenes/BattleScene.js` | Add momentum bar, narrative overlay, screen effects, tutorial hooks |
| `src/scenes/MenuScene.js` | Add "LEARN TO PLAY" tutorial button |
| `src/data/characters.js` | Fix contradictory `isGreen` values; relabel stats to say whose they are |
| `src/logic/GameLogic.js` | Read win/lose conditions from `characters.js` instead of hardcoding |
| `src/scenes/GameOverScene.js` | Show the deciding stat and why; default to "play again" |
| `src/scenes/BootScene.js` | Preload audio |

---

## Success Criteria

- A new player can understand who's winning within 5 seconds of looking at the screen (momentum bar)
- Card plays feel dramatic and tell a story (narration overlay + screen effects)
- A player can learn the game by playing the tutorial without reading any text walls
- Cards are easy to evaluate at a glance (simplified display with arrows)
- The detective vs vigilante theme is *felt*, not just read

## How to Test It

Testing is built into the phases as gates — see Gate B through Gate 5 in the task list above. The short version:

- **Gate B** establishes the baseline before any work starts.
- Each phase gate must be fully ticked before the next phase begins.
- **G2.1** (4 of 5 strangers name the leader within 5 seconds) is the headline metric.
- **G4.4** ("would you play again?") is the one the LinkedIn feedback was actually about.

Compare every score against the Gate B baseline. An improvement you cannot measure against a starting point is an opinion.

---

## Appendix — Task Detail

Fuller specifications for the tasks above. The `U` numbers in the task list are the source of truth for scope and ordering; this section is reference for *how*.

### Storytelling detail (U20-U23)

#### U21 · Turn-by-Turn Narration
- Replace generic battle log with narrative text that tells a story
- Each card play triggers a dramatic description of what happened
- Examples:
  - Detective plays "Surveillance Sweep": *"The Detective deploys surveillance cameras across the city, watching the shadows for the Vigilante's next move."*
  - Vigilante plays "Righteous Act": *"The Vigilante strikes down a notorious crime lord. The public cheers - but the Detective takes note."*
  - Counter cancels: *"The Detective anticipated this move! The Vigilante's plan crumbles before it even begins."*

#### U21 · Narrative Event System
- Key moments trigger story beats:
  - Win stat crosses 50: *"The tide is turning! The Detective's investigation is gaining momentum."*
  - Lose stat crosses 75: *"Danger! The Vigilante's identity is nearly exposed!"*
  - Near win (90+): *"The endgame approaches. One more push could decide everything."*
  - Counter play: dramatic counter-narration
  - Big power card: special dramatic text

#### U22 · Screen Effects During Card Resolution
- Screen shake on power cards
- Color flash on counters (red flash for cancellation)
- Glow/pulse effects on stat bars when they change significantly
- Camera zoom on dramatic moments
- Particle-like effects (using Phaser rectangles/circles) for big plays

#### U20 · Card Flavor Text
- Add `playNarration` field to every card in `cards.js`
- Each card gets a unique narrative description of what happens when played
- Shown in the narration overlay during resolution

### Comprehension detail (U17-U19, U24-U25)

#### U17 · Momentum / Tug-of-War Bar
- A single horizontal bar at the center of the battle screen
- Shows who is winning at a glance without needing to understand individual stats
- Left side = player winning (blue), right side = opponent winning (red)
- Calculation: `(playerWinProgress - playerLoseRisk) - (opponentWinProgress - opponentLoseRisk)`
- Updates with smooth animation each turn
- Labels: player name on left, opponent name on right, "ADVANTAGE" indicator

#### U18 · Simplified Card Effect Display
- Replace raw stat numbers on cards with intuitive visual summary
- Show colored arrows: green up-arrows for beneficial effects, red down-arrows for harmful
- Compact format on card face: "YOU: +++" / "FOE: --" (arrow count = impact strength)
- Full stat breakdown only shown in the enlarged card view (tap to see details)
- Card "power rating" indicator (1-5 stars or simple strength label)

#### U23 · Better Battle Log (Story-Driven)
- Transform the existing `BattleLog` from plain text into a narrative story log
- Each entry is a short story sentence, not "Player played: Card Name"
- Color-coded by impact: green for good news, red for threats, gold for dramatic moments
- Show turn number context

#### U24 · Interactive Tutorial (Guided First Game)
- New "LEARN TO PLAY" button on the main menu
- Launches a special tutorial battle with step-by-step guidance
- Tutorial flow (one concept per turn):
  1. **Turn 1**: "This is your hand. Tap a card to select it." (highlight cards, dim everything else)
  2. **Turn 2**: "See the energy cost? You need enough energy to play." (highlight energy display)
  3. **Turn 3**: "Watch the momentum bar - it shows who's winning." (highlight momentum bar)
  4. **Turn 4**: "Your green stats are good. Push them up!" (highlight player stats)
  5. **Turn 5**: "The opponent's red stats hurt them. Push those up too!" (highlight opponent stats)
  6. **Turn 6**: "Counter cards cancel the opponent's move! Try it." (give counter card)
  7. Free play for remaining turns with occasional tips
- AI plays slowly and predictably during tutorial
- Tutorial can be skipped at any time

---

### Game feel detail (U8-U16)

The current diagnosis is entirely about *comprehension*. "Loses engagement" is a separate failure: a player can understand the game perfectly and still be bored. These are the cheapest fixes per unit of engagement.

#### U12-U14 · Sound — there is none at all
`grep` finds zero audio in the codebase. No card sound, no hit, no music. Silence reads as "unfinished prototype" faster than any visual problem, and this is the highest impact-per-hour item in the document.
- Card select, card confirm, card reveal
- Distinct counter/cancel sting — the most dramatic moment in the game currently passes in silence
- Stat gain vs stat loss tones
- Win and lose stings
- One ambient loop, with a mute toggle

#### U8-U9, U15 · Juice — uneven, and worst where it matters on mobile
There are 16 tweens across the UI, and they are not spread evenly.

Already good, leave alone:
- Card resolution: flip reveal, counter/cancel X, priority text, glow layers (6 tweens)
- Stat bars: animated fill plus floating `+12` / `-8` numbers with correct colour inversion for negative stats — `StatBarGroup.showStatChange()`, called on every update

Missing entirely:
- **Buttons have no press state.** They swap `setBackgroundColor` on hover and nothing else. See `MenuScene.js:56-62`.
- `BattleLog` — 0 tweens, entries appear instantly
- `StatsModal` — 0 tweens, pops in with no transition

**The real problem: roughly 9 of the 16 tweens are hover-driven** — the card lift in `CardHand`, the border flash, every button colour swap. `pointerover` does not meaningfully exist on touch, so **on a phone most of this feedback never plays at all.** Tapping a button produces no visual response until the scene changes, which reads as an unresponsive control and causes double-taps.

Fix in this order:
1. Button press states — scale down ~0.95 on `pointerdown`, spring back on release. Works on both input types.
2. Card tap feedback that does not depend on hover — shares a root cause with the touch interaction redesign
3. Stat bar overshoot and settle
4. Portrait reaction on big swings

#### U16 · Turn pacing
`BattleScene.js` has stacked `delayedCall`s of 800ms, 1000ms, 1000ms, 500ms, 800ms and a 2000ms hold. Add those up across a turn and the player spends several seconds per turn watching nothing happen.
- Time one full turn end to end and write the number down before changing anything.
- Overlap animations instead of queueing them.
- Let a tap skip any resolution animation. Returning players should never be forced to sit through a sequence they have seen fifty times.

#### First thirty seconds · The first thirty seconds
Before the tutorial can teach anything, the player has to still be there.
- Count taps from load to first card played. Every one before the first meaningful decision is a place to lose someone.
- The title screen should state what the game *is* in one line, not just offer buttons.
- Consider dropping the player straight into a match against the AI, with character select offered afterwards.

#### U19 · Win/lose payoff
The match ends and a screen appears. Ending is the moment that decides whether a player starts a second match:
- Show the final momentum swing, not just the result
- One line on *why* they won or lost, tied to the stat that ended it
- "Play again" as the default focused action, on the same character, with no re-selection

---

---

## Appendix — Design Prompts

Copy-paste prompts for the Phase 0.5 design pass. Each is self-contained — no need to explain the game first.

### Shared context (paste at the top of any of these)

```
I'm designing the battle screen for a 1v1 simultaneous card game called
Shadows of Judgment. Detective vs Vigilante, noir tone, pixel-art character
portraits, built in Phaser 3.

Canvas: 750x1334 portrait, Phaser Scale.FIT, centred. It renders at roughly
half scale on a phone (~390pt wide), so every size below is in the 750-wide
design space:
- minimum body text 24px (renders ~12pt)
- minimum touch target 90px (renders ~47pt)
- assume a notch and a home indicator; keep 80px clear top and bottom

There are only FOUR underlying stats, shared by both players. Each character
relabels them, and the label states whose it is:
  Detective sees: Your Evidence / Their Confidence / Their Support / Heat On Them
  Vigilante sees: Evidence On You / Your Confidence / Your Support / Heat On You
Green = rising it helps you. Red = rising it hurts you. First stat to 100 ends
the match.

Elements that must fit on the battle screen:
- opponent portrait + their four stat bars + their energy
- a central staging area showing two face-down cards that flip and resolve
- a momentum bar showing who is ahead at a glance
- a narration overlay for dramatic text during resolution
- player portrait + four stat bars + energy
- a confirm button that appears on card select
- a hand of up to 5 cards
```

### Redesign prompt — use this once the game is deployed

Open the live game, take screenshots of the battle screen as **both** characters (mid-match, bars part-filled), and attach them with this prompt.

```
I need you to redesign the battle screen of my card game. Screenshots of the
current version attached.

THE GAME
1v1 simultaneous card battle, Detective vs Vigilante, noir tone. Both players
pick a card face-down, they flip together, and resolve by priority. Phaser 3,
canvas 750x1334 portrait, Scale.FIT centred.

THE SIZING TRAP
The canvas renders at roughly half scale on a phone (~390pt wide). Every number
below is in the 750-wide design space:
- minimum body text 24px (renders ~12pt)
- minimum touch target 90px (renders ~47pt)
- keep 80px clear top and bottom for notch and home indicator
Current labels are 10-14px, which lands around 5-7pt on a real phone. Unreadable.

THE CORE PROBLEM — read this carefully, it is the actual brief
There are EIGHT stat bars on screen: the player has four, the opponent has four.
But only FOUR of the eight can end the match:
- each character's win stat (theirs reaching 100 wins them the game)
- each character's lose stat (theirs reaching 100 loses them the game)
The other four have no win/lose role. They only matter in a rare
deck-exhaustion tiebreak.

Right now all eight bars render identically, so a new player has no way to tell
which four matter. Feedback from real players is that the game is hard to
understand and they disengage. This is my main suspect.

I want the redesign to make the decisive stats unmissable and the rest clearly
secondary — or argue that the secondary four should be cut from the screen
entirely.

ALSO MUST FIT
- both character portraits (detailed pixel art)
- energy counter per player (0-10)
- central staging area: two face-down cards that flip and resolve
- a momentum bar showing who is ahead at a glance
- a narration overlay for dramatic text during resolution
- hand of up to 5 cards, 180x260 each, currently overlapping in a fan
- a confirm button that appears when a card is selected

COLOUR RULE
Green means "this helps me", red means "this hurts me" — ONE rule, applied once.
A real bug in this game had a stat coloured green while filling it lost you the
match, because the colour was decided per-stat in a data file. Also make it
colour-blind safe: pair every colour with a second cue.

STYLE PROBLEM
The portraits are detailed pixel art. The UI is flat rectangles with plain
borders. They look like two different games. Reconcile them, assuming I cannot
commission new portraits.

DELIVERABLE
A single self-contained HTML page I can open, showing three genuinely different
layouts drawn to scale at 750x1334, side by side, each region labelled with its
pixel dimensions. Include the palette and a type scale with no step below 24px.

For each layout give me one sentence on what it prioritises and what it gives up.
Make them three different bets about what matters most — not three variations of
one idea.

Then tell me which you would ship and why.
```

### U5 — Battle screen layout

```
[paste shared context]

Give me three distinct layout options for this screen as a single self-contained
HTML page I can open — drawn to scale at 750x1334, side by side, with each region
labelled and its pixel dimensions annotated.

Optimise for: a new player can tell who is winning within 5 seconds, and can read
every label at arm's length on a phone.

For each option, give me one sentence on what it prioritises and what it sacrifices.
Don't give me three variations of the same idea — make them genuinely different bets
about what matters most.
```

### U6 — Palette and type scale

```
[paste shared context]

Define a colour palette and type scale as a self-contained HTML page showing
swatches and specimens.

Requirements:
- dark, noir, high contrast — this gets played on phones in bright rooms
- "green means good, red means bad" must be ONE rule with one green and one red,
  not a per-element choice. A previous bug had one stat coloured green while
  filling it lost you the game, because the colour was decided per stat in a
  data file.
- colour-blind safe: green vs red must stay distinguishable, so pair every
  colour with a second cue (icon, arrow direction, or position)
- a type scale with no step below 24px, and named roles (stat label, card name,
  card body, narration, button)
- show every colour against the intended background, with contrast ratios
```

### U7 — Art direction

```
[paste shared context]

My problem: the character portraits are detailed pixel art, but the UI is flat
rectangles with plain borders. They look like two different games.

Give me three ways to reconcile them, ranked by how much work each is, assuming
I cannot commission new portraits. For each, describe concretely what changes
about the UI — borders, edges, textures, corners, typography — and show a small
HTML mockup of a single card and a single stat bar in that style.
```

### U18 — Card face (Phase 2, but visual)

```
[paste shared context]

Redesign the card face. Current problem: each card modifies up to four stats with
raw numbers like "+15 Investigation, -8 Public Pressure, +10 opponent Suspicion",
which nobody can evaluate at a glance mid-turn.

Card is 180x260 in the 750-wide space. Cards overlap in a fan with only ~140px of
each visible, so the left strip has to carry identity on its own.

Design a face that answers "is this good for me, and how strong?" in under a
second, with the full breakdown available only on tap-to-enlarge. Show it as HTML
at real size, including how a row of five overlapping cards reads.
```

### Portraits (extends `design-notes/CharacterDesignNotes.MD`)

The existing generation prompts for the two portraits are in that file — reuse them verbatim for style consistency. To add expressions for the winning/losing states in U19, append to the existing prompt rather than writing a new one:

```
[paste the existing prompt from CharacterDesignNotes.MD]

...same character, same style, same lighting, same framing.
Change only the expression to: <winning / losing / desperate>.
```

