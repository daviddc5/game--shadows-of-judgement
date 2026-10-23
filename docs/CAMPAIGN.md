# Campaign mode

A single-player run of **cases** against the AI, chosen from the main menu
(Campaign). It teaches the game, gives the characters a story, and is the
natural home for rewards later. This is the plan; what exists so far is at
the end.

## Why

- New players need a guided first match. How to Play explains the rules, but
  people learn by playing. The tutorial is **Case 0**.
- The roadmap already lists "a single-player campaign of escalating cases with
  card rewards between fights" (DIRECTION.md, Later: variety).
- Each case is a reason to come back, and a place for the characters' inner
  thoughts to tell a story.

## What a case is

Every case is a normal match on the same rules engine, plus a few settings, so
no new rules are needed to make one:

- **Side and characters**: who you play, who you face.
- **Coaching tips**: one line per turn in the hint area (the tutorial uses
  these).
- **A twist** (later), one per case, from settings the rules already have:
  a different starting meter (you start losing), a fixed hand or deck, the
  opponent starting with more energy, a status effect from turn 1, fewer turns.
- **An opponent personality** (later): the AI leans one way (saves for Power,
  Counters a lot, loves traps), so each case is a different read.
- **A short story**: a line of briefing before, inner thoughts during, and a
  line after, in the voice of the characters (docs/CHARACTERS_PLAN.md).

## The tutorial (Case 0)

A guided first match as the Detective. Each turn's tip teaches one thing:

1. Tap a card, press Play card; both players choose at the same time.
2. The needle: push it to your end; the push number is on each card.
3. Energy and Wait: save up for something big.
4. Power and Counter.
5. Bait and Ambush.

Next steps for it:

- Script the first turns: fixed hands and opponent plays, so each lesson
  actually happens (a Counter that cancels your Power, a Bait that lands).
- Point at things: highlight the card, the needle or the energy pips while
  the tip talks about them.
- A friendlier AI for the first match.

## Progression

- Cases unlock in order; finishing one unlocks the next (saved on the device
  until there are accounts).
- Later, cases give rewards: points or packs (see COLLECTION_AND_SHOP.md),
  a new character, a cosmetic.

## Ideas for the first cases

- **The Harbour Fire**: start behind, the meter at 35. Claw it back.
- **The Missing Ledger**: the opponent opens with Heat on you.
- **The Masked Gala**: an opponent who loves traps (Bait and Ambush).

## Built so far

- **Campaign** button on the main menu, first.
- `src/case/campaign.js`: the cases as data (`CASES`): label, title, blurb,
  side, whether it's unlocked, the lessons for the briefing, and per-turn
  `tips`.
- `src/scenes/CampaignScene.js`: the list of cases as case files (locked ones
  stamped "Coming soon"), and a briefing page per case with Start.
- The battle takes `{ campaign: caseId }`: single player with the case's tips
  in the hint area; the result screen offers Play again and back to the
  Campaign.
- Only the tutorial is playable; the next three are placeholders.
