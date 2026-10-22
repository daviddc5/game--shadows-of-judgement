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
  // Deniz Kaya: young, clever, cheeky. Always has a trick up his sleeve and a
  // joke ready; treats the case like the best game ever (think Jaden Yuki).
  detective: {
    start: ["Ooh, a vigilante! This beats paperwork any day.", "Alright, mystery person. Let's have some fun!", "Coffee: check. Gut feeling: check. Let's go!"],
    QUICK: ["A little poke to see what happens!", "Small trick, big trouble. Heh.", "Just warming up!"],
    NORMAL: ["Another clue for the pile. I love this part!", "Heh, the file's getting chunky.", "Sneaky, but I'm sneakier."],
    POWER: ["Time for my ace! Warrant's signed!", "Surprise! Didn't see that one coming, huh?", "Okay, no more playing around. Well, a little more."],
    COUNTER: ["Called it! Big moves are so easy to read.", "Ha! I had a trick up my sleeve for that."],
    BAIT: ["Fake raid, real results! Heh.", "Took the bait! I'm hilarious."],
    AMBUSH: ["Nap time? Nope! I brought snacks for the stakeout.", "Caught resting! Good thing I never sleep on a case."],
    WAIT: ["Let's see what they've got. Popcorn ready.", "Saving my best trick for later."],
    fizzle: ["Blocked nothing! That was kind of funny.", "Ooh, jumpy! Somebody's nervous."],
    winning: ["This is way too much fun!", "Almost got 'em! Don't stop now!"],
    losing: ["Okay, they're good. Now it's interesting!", "No sweat. I always have one more trick."],
    win: ["Gotcha! Case closed, and I'm starving.", "That was awesome! Best case ever."],
    // Losing bruises his ego: still joking, but clearly annoyed.
    lose: ["Gone. Right under my nose... Great. Just great.", "Ha... ha. Very funny. Nobody tell the chief.", "Fine. FINE. Enjoy it. I'll be hearing about this one for weeks."],
  },
  // Giovanni Santoro: a smart, classy boss with only a hint of Italian. Calm,
  // calculating, always three moves ahead (think Giovanni from Pokémon, with
  // Kira's composure).
  vigilante: {
    start: ["Another detective comes to play.", "Every piece is where I placed it. Let us begin.", "A pleasant evening. For me."],
    QUICK: ["Slowly, slowly, the city turns.", "A small move. Nothing is small to me."],
    NORMAL: ["The city sees exactly what I allow.", "Business as usual."],
    POWER: ["Now the whole city watches. Bene.", "This is what a boss does.", "Let the detective explain that to the press."],
    COUNTER: ["Predictable. I counted on it.", "Every move, foreseen."],
    BAIT: ["Exactly as I planned.", "They guarded the wrong door. Perfect."],
    AMBUSH: ["Resting? A luxury I never allow myself.", "While they slept, I worked."],
    WAIT: ["Patience is a weapon.", "Let them make the first mistake."],
    fizzle: ["Afraid of shadows. What a pity.", "Nerves. They always betray the amateur."],
    winning: ["Check. Soon, checkmate.", "One more street, and I am a rumour again."],
    losing: ["Closer than expected. Interesting.", "A setback. I have prepared for setbacks."],
    win: ["Arrivederci. As if I was never here.", "The city keeps my secret. As always."],
    // Caught means it's over: still composed, but bitter.
    lose: ["Handcuffs. How vulgar.", "Years of planning, undone by a detective with a coffee stain.", "Caught. The city will forget me by morning."],
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
