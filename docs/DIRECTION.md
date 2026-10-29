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
| Rising stakes (+5 push per turn), turn-20 verdict | Tug-of-war stalls otherwise. |
| Longer games: meter doubled to 0–200 (start 100), verdict after turn 20 | Games were too short (median 7 turns, 1 in 10 over by turn 3): one uncountered Power covered the whole distance to a win. Doubling the distance keeps every card number and rule, gives twice as many reads per game (median 13, p10 8) and makes one Power a big swing rather than the game. Slowing the stakes or dropping them was tried in the simulator and barely helped or caused stalls (a quarter of games to the verdict). |
| Clean card numbers: multiples of 5, one push per type and cost | Playtesters found numbers like 19 and 7 hard to add up; same-cost cards differing by 1–2 added nothing to read. |
| Added BAIT (beats COUNTER) and AMBUSH (beats WAIT) | Closes the mind-game loop so every turn is a read, not just "push hardest". |
| AI reads public info only (energy, recent plays) | It should be beatable by reading it, and never cheat. |
| New look for the battle screen (noir: rain, skyline, cyan vs crimson) | Built by Claude as part of the experiment. The owner "doesn't hate it, doesn't love it": the visual style is still open. |

## Visual direction (chosen)

After several rounds of look boards, the owner chose:

- **UnifrakturMaguntia** blackletter for decoration only: the logo, screen
  titles and big moments. **Anything that has to be read** (card names and
  numbers, buttons, character names, rules) uses upright EB Garamond (no
  italics), and muted text is kept dark enough to read. Roman numerals
  are never set in blackletter, which draws I like J ("Turn JX"), so the
  round banner is in EB Garamond. The owner found blackletter and grey text hard to
  read in play.
- **Mostly black and white**, colour only in the character portraits, and **a
  touch of red** (the needle, the Vigilante's numbers, your selected card, big
  moments like "Countered!"). Plain and simple: no rain, glows or textures.
- **Text big enough for a phone.** The game is drawn 750 px wide and shrunk to
  about 55% on a phone, so a non-gamer playtester found the small text too
  small to read. Keep body text at 24 px or more in game units (about 13 px on
  a phone) and card names at 24 px.
- **Accessibility settings on the Appearance screen**, saved on the device:
  - **Text size** (Standard, Large ×1.15, Larger ×1.3). It scales every piece
    of reading text (EB Garamond) as it is created (`installTextScale` in
    `src/theme.js`); blackletter decoration keeps its size. Text placed next to
    other things is laid out from its real width (or shrunk with `fit()` in
    `src/ui/widgets.js`), so check new screens at Larger.
  - **Contrast** (Standard, High). High turns every near-black into black and
    every near-white into white, muted text included, and drops faded text on
    cards.
- **Cards look like cards: the "case file" design.** Chosen from four mock-ups
  after looking at how popular digital card games lay out cards (rounded
  corners and a frame, art doing most of the work, numbers in fixed badge
  places, little text). The first versions copied the layout of an existing
  game too closely, so the final design is built from our own world
  (`src/ui/cardFace.js`): real card proportions (176 x 246, about 5 : 7; the
  widest four fit across a phone), a rounded double border, a type stamp and
  the cost with our own hexagon along the top, the art as an evidence photo
  with photo corners, a typed name label, one line of rule text, a red rubber
  stamp for a status effect, and the push as a big number with a "Pushes"
  label. (A mini Case meter showing the push was tried and dropped: it always
  started from the middle, so it showed the wrong position once the meter had
  moved.)
- **Small turns play fast.** A full clash (wind-up, hit stop, grind, break)
  only happens on a showdown: a Power, Counter or trap, a close clash (pushes
  within 20% of each other), or the turn that closes the case. Other turns get
  a quick dash-and-shove and quicker pushes, roughly half the time. The point
  is to get back to the next read sooner.
- **Tap to skip.** While a turn plays out, the buttons give way to "Tap to
  skip"; a tap (or Space/Enter) plays the rest of that turn at 5× speed, with
  its sounds quiet. Animation is local to each player, so this works online
  too: the server never waits for it. A watchdog stops any turn animation that
  hasn't finished in 30 s of game time and moves on, so a stuck step can't
  freeze a match.
- **Hand interaction.** The hand is held as a fan (like Yu-Gi-Oh!), the left
  card on top so every card's right edge, with its cost and push, stays
  readable. Chosen from four mock-ups: the picked card rises out of the fan
  rather than appearing big over the board, so the board stays visible while
  you read your opponent. Tap a card to raise and grow it, or slide along
  the hand and the card under your finger rises (a tick and a buzz on each;
  cards you can't afford rise too, dimmed, so the slide stays smooth, but
  can't be played); press and hold
  still for half a second to inspect a big copy without selecting (then slide
  to inspect the others; sliding first never zooms); drag a card up onto the board to
  stage it in your slot (tap it again to take it back). Nothing is played
  until Play card is pressed. A phone buzz on select, and desktop keys: 1
  to 4 pick a card, Enter plays it, W waits, Esc puts it back.
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

### Music

The battle screen plays the owner's duel theme ("The Winning Hand") in a loop
(`public/assets/audio/`, see its README), with a ♪ mute button that is saved on
the device. Browsers only allow sound after a tap, so it starts on the first
tap. Code-made music was tried (synthesised and sample-based, in
`scratchpad` experiments) and dropped: it sounded goofy next to a real
composition. Sound effects (select tick, card dealt onto felt, flip and
reveal drum hit, wait charge, whoosh, impact, grind, break, cut-in sting,
countered, needle ratchet, a heartbeat for Shaken, a door slam for Cornered,
a distant siren for Heat on the Vigilante (press cameras when it's a
smear campaign on the Detective), and a gavel for the result) are made from code by `scripts/make-sfx.mjs`: noise-based sounds
like these come out convincing, unlike code-made music. They can be swapped
for recordings with the same names (see `public/assets/audio/README.md`).
The card-play sound was chosen from a sound board of eight options (stamps,
typewriter, revolver, switchblade, briefcase, felt); the owner picked felt for
both sides.

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

### Art style (chosen, Oct 2026)

A **gothic manga thriller with noir touches**: drawn like Death Note
(Takeshi Obata) and Yu-Gi-Oh (Kazuki Takahashi), set in a noir night city
(rain, trench coats, hard shadows). Black and white ink with screentone and the
one touch of red, which matches the look already chosen. The game's premise
is close to Death Note's (a detective against a vigilante who believes he is
delivering justice, each reading the other), and the blackletter was already
picked for its Death Note feel.

- **No AI art in the shipped game.** AI is fine for ideas in words and for
  brainstorming, not for images that are copied or traced. The current
  portraits and music are AI-made and should be replaced before a paid
  release.
- **The owner is learning to draw** in this style (paper and ink first,
  digital later), alongside working on the game, with the game as the main
  focus. Art comes in as it's ready.
- **What to draw first:** Deniz and Giovanni as manga characters with 3–4
  expressions each (calm, smug, sweating, shocked), since the portraits
  already change with mood and are the most visible art; then the Power
  cards.
- **Where it shows up:** the big-moment cut-ins (Power, Countered!, a sprung
  trap) can become manga panels (close-up eyes, a shocked face), and the
  inner thoughts already work like Light's and L's monologues.

## Ideas considered and parked

- **Pokémon-style teams of characters.** Wanted long term, not now: lots of art
  and balancing before the core is proven.
- **Top-down overworld, Pokémon style** (walk around a city; events start a
  duel). Parked: the battle comes first, it only helps single player, and it
  needs a lot of art (tiles, walking sprites, buildings). The cheaper step is
  a **city map of locations** for the campaign (tap the harbour, a scene
  plays, some locations start a duel, card rewards between cases), like Slay
  the Spire's map. It uses the same story-triggers-a-duel structure, so a
  walkable overworld could replace the tapping later.
- **WebGPU effects.** Phaser 3 has no WebGPU, so it would be a separate
  canvas layered over the game, loaded only when the browser supports it, an
  Effects setting (Standard / Rich), driven by the turn events the scene
  already plays back. Only compute-heavy effects justify it: ink spreading in
  water behind the meter (the best fit: it shows momentum), cards that
  crumple, tear or burn on a showdown, and the losing side dissolving into
  ash on the verdict. Avoid rain, fog and glow, which the owner moved away
  from. First experiment if picked up: the ink behind the meter.
- **Hidden-target districts (asymmetric deduction).** Vigilante hides a target,
  Detective gathers clues. Thematic, but two roles to learn. Possible later.

## Where things stand (handoff, 23 Oct 2026)

Everything below is in `main`. The owner deploys by hand (`git pull`,
`npm install`, `npm run deploy`) and works on a branch, merging only when they
say so.

**Done recently:** status effect cards (Shaken, Cornered, Heat); the
case-file card design; a fanned hand with tap, slide-to-select, long-press
zoom and drag-to-stage; sound effects and the duel theme; accessibility
settings (text size, contrast); tap to skip a turn's animation plus a 30 s
watchdog; small turns play faster; How to Play and lobbies in the case-file
style; a Status Effects help page (also opened by tapping a status tag); the
Campaign screen with a guided tutorial; feature flags (Harness FME, by the
owner).

**Decisions waiting on the owner:**

- **Longer games.** Built on branch `claude/longer-games-direction-e9aoos`,
  not merged: Case meter 0 to 200 starting at 100, verdict after turn 20.
  Simulator: median 13 turns (was 7), shortest 10% go 8 (was 3), 9% decided
  by the verdict, wins still 50/50, card numbers unchanged. The meter, its
  labels, portrait moods and How to Play now read `RULES`. Needs a human
  playtest before merging. If 13 turns feels long, the middle option is
  `caseMax=160 caseStart=80 maxTurns=18` (median 11). Late turns push hard
  (a Quick pushes 90 by turn 18), so watch whether the stakes drown out the
  differences between cards.
- **Status effect sounds.** Options are on a tap-to-hear page (press cameras,
  printing press or telephone for Heat on Deniz; siren, police radio or
  two-tone siren for Heat on Giovanni; heartbeat, fast clock or dread for
  Shaken; door slam, handcuffs or cell bars for Cornered). The current ones
  stay until the owner picks.
- **Small turns.** They now play faster (full clash only on showdowns). The
  owner later said the animations aren't too long and help players take in
  the turn; ask whether to keep the faster small turns or go back to the full
  clash every turn.
- The menu keeps "Single player" (renaming to "Quick play" was considered
  and dropped).

**Suggested next steps, in order:**

1. Longer games (above), once approved.
2. Script the tutorial's first turns (fixed hands and opponent plays, so a
   Counter really cancels your Power and a Bait really lands). See
   [CAMPAIGN.md](CAMPAIGN.md).
3. The next campaign case, "The Harbour Fire" (start behind on the meter).
4. One passive ability per character (Deniz, Giovanni), the first step toward
   more characters, signature cards and later the shop.

**Not yet tested:** a multiplayer match on the live server after the latest
changes (the online flow was last tested headlessly before the fanned hand).

## Roadmap

1. **Now: give the game characters.** In order: characters think (inner
   thoughts, done), cards with status effects (done), then one passive ability
   per character and ally (character) cards. See
   [CHARACTERS_PLAN.md](CHARACTERS_PLAN.md).
2. **Campaign.** Started: a Campaign screen with a guided tutorial as Case 0,
   three placeholder cases. See [CAMPAIGN.md](CAMPAIGN.md).
3. **Next: three districts (Marvel Snap style).** Each district is its own small
   Case meter; win 2 of 3; choose a card *and* where to play it. The owner wanted
   something like this originally but earlier feedback called it confusing; the
   difference now is one rule repeated three times instead of eight different
   stats. Build it as a separate mode to compare against the single meter. The
   owner also doesn't want the game to look like Marvel Snap, so this needs care.
4. **Later: collection and shop.** More detectives and vigilantes (keeping the
   Detective vs Vigilante split), personalisable decks, and packs: 1 free pack
   a day, points can be bought for cosmetics or faster collecting, never
   power. Needs accounts and a database. See
   [COLLECTION_AND_SHOP.md](COLLECTION_AND_SHOP.md).
5. **Art.** See "Art style" above: gothic manga, drawn by the owner as they
   learn, or commissioned. Card art is placeholder until then. Avoid AI art in
   anything sold: the portraits and the music are AI-made, which matters for a
   paid release or crowdfunding.
6. **Commercial path** (owner's question): too early to crowdfund. First build
   an audience (itch.io page, short clips, a Discord), real art and more
   content, then a Steam page with wishlists, then crowdfunding or a publisher.
7. ~~Visual pass~~ Done: title, menu, lobbies and How to Play use the battle
   screen's case-file style; sound is in.
8. ~~Port multiplayer~~ Done: the server runs the same rules engine, and the
   old eight-stat code has been removed.

## Known issues and housekeeping

- ~~`Death Note.ttf` is copyrighted~~ Replaced with UnifrakturMaguntia (OFL,
  bundled via `@fontsource`), the blackletter the owner picked for its Death
  Note feel. Fonts and themes live in `src/theme.js`.
- Card type names (QUICK / NORMAL) no longer describe anything since speed was
  removed. Consider MINOR / MAJOR.
