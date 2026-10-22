# Audio

- `duel-theme.mp3`: "The Winning Hand", the owner's theme for the battle
  screen, generated with Google's Gemini (music generation). Credit: "Music
  generated with Gemini." Google's terms (see the Gemini Apps terms and the
  Generative AI additional terms) apply; check them if the use changes, for
  example for a paid release. The source is a 2:51 track; this copy has the
  silent tail trimmed, a 1.2 s fade-out so it loops back into its intro, and is
  normalised to about -17 LUFS (128 kbps MP3). It loops while a match is on
  (see `src/audio.js`); the ♪ button next to the help button mutes it, and the
  choice is saved on the device. It replaced an earlier theme, "Briefcase And
  Bullet".

## Sound effects (`sfx/`)

Made from code by `scripts/make-sfx.mjs` (filtered noise and tones, no
samples), so they are ours with no licence to track. Run
`node scripts/make-sfx.mjs [name]` after changing a recipe (needs ffmpeg). Any
file can be swapped for a recorded sound with the same name; how loud each one
plays is the `SFX` table in `src/audio.js`.

| File | Plays when |
| --- | --- |
| `select.mp3` | You tap a card in your hand |
| `slam.mp3` | A card is slammed down face down (lower for the opponent's) |
| `flip.mp3` | The cards turn over |
| `reveal.mp3` | ...with a swipe into a deep drum hit |
| `charge.mp3` | Someone Waits and banks energy |
| `whoosh.mp3` | The cards rush at each other |
| `impact.mp3` | They meet |
| `grind.mp3` | They grind (stopped when the grind ends) |
| `break.mp3` | One breaks through |
| `sting.mp3` | The cut-in band for a big play |
| `cancel.mp3` | A Power card is Countered |
