# Design direction

Where the game is heading, what has been decided, and why. Read this before
changing rules or the battle screen. Rule details live in
[CASE_METER_EXPERIMENT.md](CASE_METER_EXPERIMENT.md).

## The goal

A 1v1 Detective vs Vigilante card duel that is **simple to learn but full of
reads**: both players pick at the same time, and the fun is guessing what the
other will do. More depth should come from more reasons to read the opponent,
not from more stats or rules.

## Feedback that shaped this

- Players found the original game hard to understand: eight stat bars, two
  different win rules, and colours that pointed the wrong way
  (see [UX_IMPROVEMENTS.md](UX_IMPROVEMENTS.md)).
- Card games are not inherently unpopular. Ones with no feedback feel like
  spreadsheets. Motion, impact and sound matter more than illustration.

## What the owner found fun (first playtest)

After BAIT and AMBUSH were added, the game felt "so much more fun". The best
part was **thinking about how much energy the opponent has and what they will
decide**. That read is the heart of the game: protect it, and judge new ideas
by whether they give players more to read, not more to calculate.

## Decisions so far

| Decision | Why |
| --- | --- |
| Multiplayer runs the same rules engine on the server; old 8-stat code removed | One game, not two. Matchmaking pairs a Detective with a Vigilante (the later player is switched if both pick the same side). |
| Keep the codebase and Phaser, rewrite the rules | The problem was design, not tech. Phaser covers the effects needed (particles, shake, shaders); infra, multiplayer server and tests are worth keeping. |
| One shared Case meter (0–100) instead of eight stats | One rule everyone gets instantly; every card affects both players. |
| Scarce, visible energy (+2/turn, max 10) | Banking energy becomes a readable signal ("they have 7, POWER is coming"). |
| WAIT banks +1 extra energy | Makes saving up a real, visible choice. The owner especially likes this. |
| COUNTER only cancels POWER | Turns COUNTER into a gamble instead of an always-good card. |
| Removed card speed | It only mattered on the final turn. Both cards now land together. |
| Rising stakes (+5 push per turn), turn-12 verdict | Tug-of-war stalls otherwise; median game is ~6 turns. |
| Clean card numbers: multiples of 5, one push per type and cost | Playtesters found numbers like 19 and 7 hard to add up; same-cost cards differing by 1–2 added nothing to read. |
| Added BAIT (beats COUNTER) and AMBUSH (beats WAIT) | Closes the mind-game loop so every turn is a read, not just "push hardest". |
| AI reads public info only (energy, recent plays) | It should be beatable by reading it, and never cheat. |
| New look for the battle screen (noir: rain, skyline, cyan vs crimson) | Built by Claude as part of the experiment. The owner "doesn't hate it, doesn't love it": the visual style is still open. |

## Visual direction (chosen)

After several rounds of look boards, the owner chose:

- **UnifrakturMaguntia** blackletter for decoration only: the logo, screen
  titles and big moments. **Anything that has to be read** (card names and
  numbers, buttons, character names, rules) uses upright EB Garamond (no
  italics), and muted text is kept dark enough to read. The owner found blackletter and grey text hard to
  read in play.
- **Mostly black and white**, colour only in the character portraits, and **a
  touch of red** (the needle, the Vigilante's numbers, your selected card, big
  moments like "Countered!"). Plain and simple: no rain, glows or textures.
- **Text big enough for a phone.** The game is drawn 750 px wide and shrunk to
  about 55% on a phone, so a non-gamer playtester found the small text too
  small to read. Keep body text at 24 px or more in game units (about 13 px on
  a phone) and card names at 26 px. Card rules are explained in large text
  when a card is selected instead of in a tiny line on the card.
- **No newspaper framing.** That look was liked for its font and restraint,
  not for being a newspaper.
- **Board themes are a personalisation option**, like card games such as
  Yu-Gi-Oh: Light page, Dark page and Split, chosen on the Appearance screen.
  Adding a theme is one entry in `THEMES` in `src/theme.js`. Themes are also a
  natural cosmetic for the future collection and shop.

### Telling cards apart, and card art

Cards looked too alike, so each type has its own **symbol** (crown, shield,
mask, dagger, bolt, ink drop: `src/ui/cardIcons.js`). Per-type frames (a
dashed Counter border, clipped corners) were tried and dropped: the owner
prefers every card to share one plain border.

Every card has an **art box**. Owning art is a big part of why people love
card games, so art is a long-term goal; the owner may learn to draw or hire an
artist. Until then the box shows a drawn placeholder scene, a different one per type (storm, rooftops, tower, streetlamp, harbour, alley) (`src/ui/cardArtPlaceholder.js`). Adding art
for a card is one image plus `art: "<name>"` on the card: see
`public/assets/images/cards/README.md` (16:9, at least 640×360).

### Characters

Each side can have several characters (`src/case/characters.js`); the player
picks side and character on the character-select screen, the AI picks a random
character for its side, and online opponents see the character you chose.
Characters are cosmetic for now (portrait and name); the long-term plan is a
passive ability and signature cards each (see COLLECTION_AND_SHOP.md). Current
roster: Deniz Kaya (Detective) and Giovanni Santoro (Vigilante). Draft
AI-made portraits for two more characters (Mara Vale, Wren) are kept in
`art/drafts/` but not used: the owner is holding off on adding more AI art.

Card art: the owner tried AI-generated card art and didn't like it (it looked
"AI-ish"). Cards keep their placeholders until the owner learns to draw or works
with an artist.

## Ideas considered and parked

- **Pokémon-style teams of characters.** Wanted long term, not now: lots of art
  and balancing before the core is proven.
- **Hidden-target districts (asymmetric deduction).** Vigilante hides a target,
  Detective gathers clues. Thematic, but two roles to learn. Possible later.

## Roadmap

1. **Now: give the game characters.** In order: characters think (inner thoughts), cards with
   status effects, then ally (character) cards. See
   [CHARACTERS_PLAN.md](CHARACTERS_PLAN.md).
2. **Next: three districts (Marvel Snap style).** Each district is its own small
   Case meter; win 2 of 3; choose a card *and* where to play it. The owner wanted
   something like this originally but earlier feedback called it confusing; the
   difference now is one rule repeated three times instead of eight different
   stats. Build it as a separate mode to compare against the single meter.
3. **Later: variety.** Either selectable characters with one passive ability each
   (cheap step toward the long-term teams idea), or a single-player campaign of
   escalating cases with card rewards between fights.
   Long term, the owner wants more detectives and vigilantes (keeping the
   Detective vs Vigilante split), personalisable decks, and a shop for opening
   cards, with shared and character-specific cards. This is also the main
   marketing hook. See [COLLECTION_AND_SHOP.md](COLLECTION_AND_SHOP.md).
4. **Visual pass.** Unify title, menu and lobby screens with the battle screen
   (they still use the old plain style), add sound, settle the art direction.
5. ~~Port multiplayer~~ Done: the server runs the same rules engine, and the
   old eight-stat code has been removed.

## Known issues and housekeeping

- ~~`Death Note.ttf` is copyrighted~~ Replaced with UnifrakturMaguntia (OFL,
  bundled via `@fontsource`), the blackletter the owner picked for its Death
  Note feel. Fonts and themes live in `src/theme.js`.
- Card type names (QUICK / NORMAL) no longer describe anything since speed was
  removed. Consider MINOR / MAJOR.
