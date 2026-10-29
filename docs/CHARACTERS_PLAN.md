# Making the game feel full of characters

The owner's concern: games without many characters feel soulless, but
Pokémon-style teams add a lot of complexity and code. This is the plan for
adding character without teams. The guiding rule from
[DIRECTION.md](DIRECTION.md) still applies: each addition should give players
more to read, not more to calculate.

Agreed order, built one step at a time on a branch:

1. Characters think (inner thoughts)
2. Cards with status effects
3. Ally cards (character cards)

## 1. Characters think (done)

Short inner thoughts appear in a thought cloud beside the portraits during
battle, so the two leads feel like people with a rivalry. No rule changes.

They think rather than talk, Death Note style: the Detective doesn't know who
the Vigilante is, so direct banter didn't make sense (the owner's point: would
Kira say these things to L?). They think about each other instead.

- Lines are written per card type (Quick, Normal, Power, Counter, Bait,
  Ambush, Wait), not per card, so new cards need no new lines. They talk about
  the case and the chase, not the duel: the meter is "how close is the
  capture".
- Other moments: an opening thought each, a Counter that fizzles, being close to
  winning or losing (only when the chase just moved that way), and the result.
- At most one line per turn, ordinary cards only sometimes, and no line
  repeats in a match.
- Each character has their own voice. Deniz is young, clever and cheeky,
  with a trick up his sleeve and a sense of humour (the owner's reference:
  Jaden Yuki from Yu-Gi-Oh! GX). Giovanni is a smart, classy boss with only a hint of Italian (a word or two),
  calm and calculating (the owner's references: Giovanni from Pokémon, Kira
  from Death Note).
- Lines live in one data file, so adding a character means adding their lines.

## 2. Status effects (first three done)

Built: Shaken, Cornered and Heat, one card each per side (see
[CASE_METER_EXPERIMENT.md](CASE_METER_EXPERIMENT.md) for the numbers).
Wiretapped is left for later: it reveals part of a hidden hand, which needs
care in online play. Simulator (20,000 games): wins 49.9% / 49.9%, verdicts
6.1%, effects land in about 18% of plays.


Some cards trade push for a lingering effect, like status conditions in
Pokémon. Same-cost cards can then differ in push when the weaker one has an
effect, which gives back the variety of "same energy, different power" with a
reason behind it.

Keep it to about four effects. Each lasts 1–2 turns and is always shown as a
tag on the affected portrait, so both players can read it.

| Effect | What it does | Like |
| --- | --- | --- |
| Shaken | Their Power cards cost +2 next turn | Paralysis |
| Cornered | They can't Wait next turn | Trapped |
| Heat | The meter drifts 5 your way for 2 turns | Burn / poison |
| Wiretapped | You see one card in their hand | Foresight |

Example cards:

| Card | Cost | Push | Effect |
| --- | --- | --- | --- |
| Intimidate | 2 | 5 | Opponent is Shaken |
| Lockdown | 3 | 10 | Opponent is Cornered |
| Smear Campaign | 3 | 10 | Heat |
| Tap the Phone | 2 | 5 | Wiretapped |

Each one creates a read. For example, a Cornered opponent must play a card,
so Ambush is pointless and a Counter may be worth the risk. A Shaken opponent
is unlikely to play Power.

Check every new card with `npm run simulate` before playtesting.

## 2b. One passive ability per character (built)

Each character has one ability that is always on and that both players can
see (an outlined tag beside the name; explained on the rules' Abilities page
and on character select). Picked by the owner from options run in the
simulator (20,000 games each; no abilities is 49/51):

| Option | Detective / Vigilante wins |
| --- | --- |
| Patience alone (Waiting saves +1 more) | about +11 points for its side |
| Hunch, Counters only (cost 1 less) | about +7 |
| Quick Study (Quick cards push +5) | about +7 |
| Sleight of Hand (sprung traps push +10 more) | about +1.5 |
| Deep Pockets (Power costs 1 less) | about +25: far too strong |
| **Hunch (Counters and Baits cost 1 less) vs Patience** | **51.5 / 48.4 (50,000 games)** |

So Deniz has **Hunch** and Giovanni **Patience**. Both create reads: a
Deniz with 1 energy can still Counter, so a Power into him is riskier, and
Baiting Giovanni's Counters is cheap for Deniz. A waiting Giovanni banks
energy fast, so a Power from him is never far off.

`npm run simulate` plays each side's default character's ability; try others
with e.g. `detective=none vigilante=hunch`.

## 3. Ally cards

Most cards stay one-shot actions. A few are people who join your side and
stay on the board for 2–3 turns, shown as a small portrait next to your name.
While they are there, they give one ongoing bonus.

| Ally | Side | While in play |
| --- | --- | --- |
| Dr. Lin, forensic analyst | Detective | Your Normal cards push +5 |
| Reyes, informant | Detective | You see one random card in the opponent's hand each turn |
| Marco the Fixer | Vigilante | Your Waits save +1 extra energy |
| Vera, reporter on the payroll | Vigilante | The meter drifts 5 your way at the start of each turn |

Rules to keep it simple:

- One ally per side at a time.
- Allies cost energy but push little or nothing when played, so playing one is
  an investment.
- They leave after their turns, or early if the opponent removes them with a
  card.

Allies are the characters artists would draw first and the natural thing to
collect in the future shop (see [COLLECTION_AND_SHOP.md](COLLECTION_AND_SHOP.md)).

## Also considered

- **Versus screen before each match.** Both portraits slam in with a line of
  banter, like fighting games. Small and cheap; can go with step 1.
- **Named AI opponents with play styles.** Single player becomes a series of
  cases against rivals who play differently (aggressive, tricky, patient),
  each with a portrait, a name and lines. Builds on step 1.
- **Signature Power Play cut-ins per character.** Mocked up (Deniz's case
  file, Giovanni's red spotlight). The owner is happy with the shared band for
  now; keep this for when there are more characters.
