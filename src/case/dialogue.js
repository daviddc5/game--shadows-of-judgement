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
  // Deniz Kaya: calm, dry, methodical.
  detective: {
    start: ["You left a trail. You always do.", "I've read your file. Twice.", "Let's keep this simple."],
    reply: ["We'll see.", "Then you know how this ends.", "Talk all you want."],
    power: ["Everything on the table.", "That's the whole file.", "Read it and weep."],
    countered: ["Saw that coming a mile off.", "Too loud.", "Predictable."],
    fizzle: ["Jumping at shadows?", "Nothing there to stop."],
    trap: ["And there it is.", "Thank you for your cooperation."],
    winning: ["The walls are closing in.", "Getting tired?"],
    losing: ["Not over yet.", "I've come back from worse."],
    win: ["Case closed.", "You have the right to remain silent."],
    lose: ["This isn't the end.", "Next time."],
  },
  // Giovanni Santoro: theatrical, charming.
  vigilante: {
    start: ["Ah, Detective. Shall we dance?", "The city is watching. Smile.", "Buonasera, Detective."],
    reply: ["Charming. Let's begin.", "Bravo. Now watch."],
    power: ["Lights, camera, justice!", "Applause, please.", "The grand finale."],
    countered: ["Oh, Detective. So obvious.", "Not tonight."],
    fizzle: ["Nervous, Detective?", "Guarding against nothing?"],
    trap: ["Every magician needs a volunteer.", "You fell for the show."],
    winning: ["Can you hear the crowd?", "The night is mine."],
    losing: ["A small setback.", "Don't get comfortable."],
    win: ["Arrivederci, Detective.", "The city remembers me."],
    lose: ["You'll never hold me for long.", "Enjoy it while it lasts."],
  },
};

/** A random line for this character and moment, or null if they have none. */
export function pickLine(characterId, moment, rng = Math.random) {
  const lines = LINES[characterId]?.[moment];
  if (!lines?.length) return null;
  return lines[Math.floor(rng() * lines.length)];
}
