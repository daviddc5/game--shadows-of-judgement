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
| Rising stakes (+4 push per turn), turn-12 verdict | Tug-of-war stalls otherwise; median game is ~7 turns. |
| Added BAIT (beats COUNTER) and AMBUSH (beats WAIT) | Closes the mind-game loop so every turn is a read, not just "push hardest". |
| AI reads public info only (energy, recent plays) | It should be beatable by reading it, and never cheat. |
| New look for the battle screen (noir: rain, skyline, cyan vs crimson) | Built by Claude as part of the experiment. The owner "doesn't hate it, doesn't love it": the visual style is still open. |

## Ideas considered and parked

- **Pokémon-style teams of characters.** Wanted long term, not now: lots of art
  and balancing before the core is proven.
- **Hidden-target districts (asymmetric deduction).** Vigilante hides a target,
  Detective gathers clues. Thematic, but two roles to learn. Possible later.

## Roadmap

1. **Now: playtest the BAIT/AMBUSH loop.** Does each turn feel like a read?
   Adjust numbers with `npm run simulate` rather than guessing.
2. **Next: three districts (Marvel Snap style).** Each district is its own small
   Case meter; win 2 of 3; choose a card *and* where to play it. The owner wanted
   something like this originally but earlier feedback called it confusing; the
   difference now is one rule repeated three times instead of eight different
   stats. Build it as a separate mode to compare against the single meter.
3. **Later: variety.** Either selectable characters with one passive ability each
   (cheap step toward the long-term teams idea), or a single-player campaign of
   escalating cases with card rewards between fights.
4. **Visual pass.** Unify title, menu and lobby screens with the battle screen
   (they still use the old plain style), add sound, settle the art direction.
5. ~~Port multiplayer~~ Done: the server runs the same rules engine, and the
   old eight-stat code has been removed.

## Known issues and housekeeping

- `Death Note.ttf` and the `lCards` / `kiraCards` names are an IP risk; replace
  before promoting the game.
- Card type names (QUICK / NORMAL) no longer describe anything since speed was
  removed. Consider MINOR / MAJOR.
