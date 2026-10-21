// What characters think during a battle, by character id and moment. These
// are inner thoughts, Death Note style: the Detective doesn't know who the
// Vigilante is, so they never talk to each other, they think about each
// other. Lines are written per card type, not per card, so new cards need no
// new lines. They name the other side by role ("the detective"), not by name
// or pronoun, so they still fit when a side has several characters.
//
// Moments:
//   start         the match begins (the opponent thinks first, then you)
//   QUICK, NORMAL, POWER
//                 their card landed (QUICK and NORMAL only sometimes)
//   COUNTER       their Counter stopped a Power card
//   BAIT, AMBUSH  their trap sprang
//   WAIT          they waited (rarely)
//   fizzle        the other side's Counter had nothing to stop
//   winning       the chase moved their way and they are close to their goal
//   losing        the chase moved against them and they are close to losing
//   win, lose     the match is over

export const LINES = {
  // Deniz Kaya: confident, playful, loves the chase and never sounds worried.
  detective: {
    start: ["A vigilante, huh? Let's go find them!", "New case! Somebody out there is having way too much fun.", "Tonight's the night. I can feel it."],
    QUICK: ["Little leads add up!", "Someone always saw something.", "Ask around, follow the trail."],
    NORMAL: ["The file's getting thicker!", "Another piece of the puzzle.", "Evidence doesn't lie."],
    POWER: ["Got a warrant. Let's see who's home!", "Time to bring the whole department!", "All in. This is the big one!"],
    COUNTER: ["Knew they'd go big. Called it!", "Ha! Saw that one coming."],
    BAIT: ["Took the bait! Wrong rooftop, buddy.", "A fake raid, and they fell for it!"],
    AMBUSH: ["Resting? Not me. Been parked outside all night!", "Caught napping. Worth the cold coffee!"],
    WAIT: ["Patience. Let them make the next move.", "Save up, then hit hard."],
    fizzle: ["Braced for a raid that never came!", "Jumpy! Somebody's feeling the heat."],
    winning: ["I can almost hear the footsteps!", "Same streets, same hours. I know the pattern now."],
    losing: ["Slippery one. I love a challenge!", "The trail's cold, not gone."],
    win: ["Got 'em! Case closed.", "What a chase. Worth every sleepless night!"],
    lose: ["Slipped away... Next time!", "Lost the trail. Okay, round two."],
  },
  // Giovanni Santoro: cool, composed, mysterious. Few words, total control.
  vigilante: {
    start: ["Another detective. They never learn.", "The city needs me tonight.", "Let them search. They'll find only shadows."],
    QUICK: ["A whisper here, a rumour there.", "Small moves. They add up."],
    NORMAL: ["The city sees what I want it to see.", "Another night's work."],
    POWER: ["Let the whole city watch.", "Now they'll remember who protects them.", "Let the detective answer that."],
    COUNTER: ["Predictable. Chasing the noise.", "I saw that coming."],
    BAIT: ["Guarding the wrong door.", "Exactly where I wanted them."],
    AMBUSH: ["They rested. I don't.", "While they slept, I moved."],
    WAIT: ["Patience.", "Let them come to me."],
    fizzle: ["Flinching at shadows.", "Fear makes them careless."],
    winning: ["One more street, and I'm a rumour again.", "They're losing the trail."],
    losing: ["Closer than they should be.", "The exits are closing. Interesting."],
    win: ["Gone. As if I was never here.", "The city keeps my secret."],
    lose: ["Caught... for now.", "They earned it. This changes nothing."],
  },
};

/**
 * A random line for this character and moment, or null if they have none.
 * Lines in `used` are skipped while any others are left, so a match doesn't
 * repeat itself.
 */
export function pickLine(characterId, moment, rng = Math.random, used = new Set()) {
  const lines = LINES[characterId]?.[moment];
  if (!lines?.length) return null;
  const fresh = lines.filter((line) => !used.has(line));
  const pool = fresh.length ? fresh : lines;
  return pool[Math.floor(rng() * pool.length)];
}
