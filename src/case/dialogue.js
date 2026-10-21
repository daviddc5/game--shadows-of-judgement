// What characters say during a battle, by character id and moment. Lines are
// written per card type, not per card, so new cards need no new lines. They
// talk about the case and the chase (the meter is "how close is the capture"),
// in each character's own voice, and name the other side by role
// ("Detective"), so they still fit when a side has several characters.
//
// Moments:
//   start, reply  the match begins: the opponent speaks first, then you answer
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
    start: ["Evening! I'm here about a few... incidents.", "Found you! That was the fun part.", "You're a hard guy to find. I like that."],
    reply: ["Big talk for a guy with a case file this thick!", "Then let's see who blinks first.", "Nice speech. You're still under investigation."],
    QUICK: ["Just asking around!", "Little lead, big trail.", "Every bit counts!"],
    NORMAL: ["The evidence is piling up!", "Another piece of the puzzle!", "That's going in the file."],
    POWER: ["Warrant's signed. Open up!", "Everything I've got, on the table!", "Here comes the whole department!"],
    COUNTER: ["Knew you'd try that. Called it in first!", "Nope! Saw that one coming.", "Too flashy. I was ready."],
    BAIT: ["Ha! That raid was a fake!", "Gotcha! Wrong door!"],
    AMBUSH: ["Taking a break? I've been parked outside all night!", "Resting already? Hi there!"],
    WAIT: ["Thinking time!", "Let's see what you do."],
    fizzle: ["Nothing to block there! Jumpy?", "You braced for a raid that never came!"],
    winning: ["I can hear your footsteps! Keep running!", "The net's closing!"],
    losing: ["Okay, you're slippery. I like a challenge!", "The trail's cold, not gone!"],
    win: ["Case closed! That was a blast.", "Gotcha for real this time. Good chase!"],
    lose: ["Ha, you got away! Next time, for sure.", "Lost him... What a chase though!"],
  },
  // Giovanni Santoro: cool, composed, mysterious. Few words, total control.
  vigilante: {
    start: ["So. You found me.", "Detective. You're persistent.", "Let's not waste each other's time."],
    reply: ["Enthusiasm. How quaint.", "Talk is cheap, Detective."],
    QUICK: ["A whisper here and there.", "Small moves. They add up."],
    NORMAL: ["The city sees what I want it to see.", "Another night's work."],
    POWER: ["Every screen in the city. Watch.", "Let the city decide.", "Witness true power."],
    COUNTER: ["Did you think I wouldn't see that coming?", "Predictable."],
    BAIT: ["Wrong rooftop, Detective.", "You guarded the wrong door."],
    AMBUSH: ["Resting? I don't.", "While you slept, I moved."],
    WAIT: ["Patience.", "I can wait."],
    fizzle: ["You flinch at shadows.", "Fear makes you careless."],
    winning: ["One more street, and I'm a rumour again.", "You're losing the trail, Detective."],
    losing: ["The exits are closing. Interesting.", "Don't mistake patience for weakness."],
    win: ["Gone. As if I was never here.", "The city has made its choice."],
    lose: ["This changes nothing.", "Enjoy it, Detective. It won't last."],
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
