// What characters say during a battle, by character id and moment. A
// character with no lines for a moment stays quiet. Lines name the other side
// by role ("Detective"), not by name, so they still fit when a side has
// several characters.
//
// Moments:
//   start      the match begins (the opponent speaks first)
//   reply      answering the opponent's opening line
//   power      their Power card lands
//   countered  they cancelled the other side's Power with a Counter
//   fizzle     the other side's Counter fizzled
//   trap       their Bait or Ambush sprang
//   winning    the meter is close to their goal
//   losing     the meter is close to the other side's goal
//   win, lose  the match is over

export const LINES = {
  // Deniz Kaya: confident, playful, loves a good fight and never sounds worried.
  detective: {
    start: ["Alright, let's make this fun!", "Ready when you are. I'm always ready.", "Finally, a case worth getting up for!"],
    reply: ["Big words! Let's see them.", "Ha! I like you already.", "Bring it on!"],
    power: ["Now that's what I'm talking about!", "Here comes the big one!", "Boom! Didn't see that coming, huh?"],
    countered: ["Called it!", "Nice try! Not today.", "I had a feeling you'd do that."],
    fizzle: ["Ha! Wrong guess!", "Whoa, nervous much?"],
    trap: ["Gotcha!", "Hook, line and sinker!"],
    winning: ["This is too much fun!", "I'm just getting warmed up!"],
    losing: ["Okay, now it's interesting.", "Don't count me out yet!"],
    win: ["That was awesome! Rematch?", "Case closed! Good game."],
    lose: ["Wow, you're good. Next time!", "Okay, you got me. This time."],
  },
  // Giovanni Santoro: cool, composed, mysterious. Few words, total control.
  vigilante: {
    start: ["So. You found me.", "You're persistent, Detective. That won't be enough.", "Let's not waste each other's time."],
    reply: ["Enthusiasm. How quaint.", "Talk is cheap, Detective."],
    power: ["Kneel.", "This city belongs to me.", "Witness true power."],
    countered: ["Did you think I wouldn't see that?", "Amateur."],
    fizzle: ["Fear makes you careless.", "You flinch at shadows."],
    trap: ["Exactly as planned.", "You walked right into it."],
    winning: ["It's over. You just don't know it yet.", "Struggle if you like."],
    losing: ["Interesting.", "Don't mistake patience for weakness."],
    win: ["We won't meet again.", "The city has made its choice."],
    lose: ["This changes nothing.", "Enjoy it, Detective. It won't last."],
  },
};

/** A random line for this character and moment, or null if they have none. */
export function pickLine(characterId, moment, rng = Math.random) {
  const lines = LINES[characterId]?.[moment];
  if (!lines?.length) return null;
  return lines[Math.floor(rng() * lines.length)];
}
