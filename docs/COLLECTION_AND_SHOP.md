# Characters, collection and shop (long-term idea)

Not planned for now. This captures the owner's idea for how the game grows
and gets marketed, plus notes on how to build it without breaking what makes
the game fun (see [DIRECTION.md](DIRECTION.md)).

## The idea

- **Keep the Detective vs Vigilante split.** Every match is still one of each,
  fighting over the Case meter.
- **Add more characters on each side.** Several detectives (e.g. a forensic
  analyst, a hard-boiled street cop, a profiler) and several vigilantes (e.g. a
  hacker, a masked showman, a cult leader). Each has its own portrait and its
  own personality in how it plays.
- **Personalisable decks.** Players build their own deck instead of using a
  fixed one. This is the main hook for marketing: people care about *their*
  deck and *their* character.
- **A shop where you open cards.** New cards come from the shop. Three kinds:
  - **Shared cards:** usable by any character on that side (any detective, or
    any vigilante).
  - **Signature cards:** only usable by one specific character.
  - Possibly **neutral** cards usable by either side.

## How it fits the current game

The current rules already support this with little change:

- Cards are data (`src/case/cards.js`). A collection is just "which cards does
  this player own", and a deck is "which 12–14 of them they brought".
- The mind-game loop (POWER / COUNTER / BAIT / AMBUSH) stays the same for
  everyone. New cards should be **twists on that loop**, not new systems, so a
  player can read any opponent. Examples:
  - a COUNTER that also refunds energy when it fizzles
  - a BAIT that looks like a POWER card while face down (cost hidden)
  - an AMBUSH that also triggers on a COUNTER
  - a POWER card that cannot be countered but costs more
- **Characters as one passive ability each** is the cheapest first step, before
  any collection exists. E.g. "The Profiler sees the opponent's last two plays
  highlighted", "The Showman's POWER cards cost 1 less but are revealed to the
  opponent's AI as likely". This is roadmap step 3 in DIRECTION.md.

## Deck-building rules to start with

- Fixed deck size (12–14 cards), max 2 copies of a card, max 1 of a POWER card
  of cost 8+.
- Every deck needs at least one COUNTER, so the read on POWER always matters.
- Signature cards only for their character; shared cards for any character on
  that side.
- The balance simulator (`npm run simulate`) can be extended to run decks
  against each other, to catch broken cards before they ship.

## The shop: things to decide carefully

- **Random paid packs are legally risky.** Paid loot boxes are restricted or
  banned in some countries (e.g. Belgium, the Netherlands), app stores require
  published odds, and they can raise the age rating. Safer options:
  - packs bought only with **currency earned by playing**
  - **direct purchase** of a known card or character
  - a **crafting / dust** system so duplicates are never wasted
  - cosmetic-only paid items (card backs, portraits, meter skins)
- **Fairness in multiplayer.** If paid cards are stronger, players who don't pay
  leave. Popular approaches: new cards are *sidegrades* (different, not
  stronger), or ranked modes use fixed starter decks.
- **Needs accounts and a database** to store collections, which is already on
  the platform roadmap (auth + database).

## Order to build it in (when the time comes)

1. Selectable characters with one passive each (no collection yet).
2. A few signature cards per character, still with fixed decks.
3. Collection + deck builder, cards unlocked by playing (no shop).
4. Shop with earned currency; then decide on any paid options.

## Marketing angles this enables

- "Pick your detective" / "pick your vigilante" as the hook in trailers and
  store pages; each character is a recognisable face.
- New characters and card sets as regular content drops to bring players back.
- Shareable deck codes and match replays (a BAIT landing is a great clip).
