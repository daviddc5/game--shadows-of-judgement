// Card data for the "Case meter" ruleset.
// Every card pushes the shared Case meter toward its owner's end.
// Detective pushes it up (toward 100), the Vigilante pushes it down (toward 0).

export const CARD_TYPES = {
  COUNTER: { color: 0xe5484d, label: "COUNTER" },
  QUICK: { color: 0x3e9bff, label: "QUICK" },
  NORMAL: { color: 0x46c47e, label: "NORMAL" },
  POWER: { color: 0xf2b33d, label: "POWER" },
  BAIT: { color: 0xb36bff, label: "BAIT" },
  AMBUSH: { color: 0xff8a3d, label: "AMBUSH" },
};

// The mind-game loop, each type has one thing it beats:
//   POWER   big push, but a COUNTER cancels it
//   COUNTER cancels POWER (and pushes); fizzles against anything else
//   BAIT    small push, or `bigPush` if the opponent played COUNTER
//   AMBUSH  small push, or `bigPush` if the opponent WAITED
const detectiveCards = [
  { id: "d_canvass", name: "Canvass Witnesses", type: "QUICK", cost: 1, push: 6, copies: 2, flavor: "Someone always saw something." },
  { id: "d_tail", name: "Tail the Suspect", type: "QUICK", cost: 2, push: 9, copies: 1, flavor: "Two cars back. Never closer." },
  { id: "d_forensics", name: "Forensics", type: "NORMAL", cost: 3, push: 13, copies: 2, flavor: "The fibres don't lie." },
  { id: "d_cross_exam", name: "Cross-Examine", type: "NORMAL", cost: 3, push: 12, copies: 1, flavor: "Tell it again. Slower." },
  { id: "d_interrogation", name: "Interrogation", type: "NORMAL", cost: 4, push: 16, copies: 1, flavor: "One light. One chair." },
  { id: "d_warrant", name: "Search Warrant", type: "POWER", cost: 6, push: 36, copies: 2, flavor: "Signed at 3 a.m." },
  { id: "d_reveal", name: "The Reveal", type: "POWER", cost: 8, push: 50, copies: 1, flavor: "Everyone in the room. Now." },
  { id: "d_anticipate", name: "Anticipate", type: "COUNTER", cost: 2, push: 12, copies: 2, flavor: "I knew you'd try that." },
  { id: "d_staged_raid", name: "Staged Raid", type: "BAIT", cost: 3, push: 4, bigPush: 22, copies: 1, flavor: "All sirens, no warrant." },
  { id: "d_stakeout", name: "Stakeout", type: "AMBUSH", cost: 2, push: 4, bigPush: 20, copies: 1, flavor: "Sooner or later, you'll rest." },
];

const vigilanteCards = [
  { id: "v_crowd", name: "Melt into the Crowd", type: "QUICK", cost: 1, push: 6, copies: 2, flavor: "Just another face in the rain." },
  { id: "v_rumor", name: "Plant a Rumor", type: "QUICK", cost: 2, push: 9, copies: 1, flavor: "Whispers travel faster than proof." },
  { id: "v_rescue", name: "Public Rescue", type: "NORMAL", cost: 3, push: 13, copies: 2, flavor: "The city cheers its shadow." },
  { id: "v_burn", name: "Burn the Files", type: "NORMAL", cost: 3, push: 12, copies: 1, flavor: "Ash makes poor evidence." },
  { id: "v_frame", name: "Frame a Rival", type: "NORMAL", cost: 4, push: 16, copies: 1, flavor: "A better villain, gift-wrapped." },
  { id: "v_broadcast", name: "Midnight Broadcast", type: "POWER", cost: 6, push: 36, copies: 2, flavor: "Every screen in the city." },
  { id: "v_spectacle", name: "Grand Spectacle", type: "POWER", cost: 8, push: 50, copies: 1, flavor: "Justice, performed." },
  { id: "v_saw_it", name: "Saw It Coming", type: "COUNTER", cost: 2, push: 12, copies: 2, flavor: "Predictable, detective." },
  { id: "v_decoy", name: "Decoy", type: "BAIT", cost: 3, push: 4, bigPush: 22, copies: 1, flavor: "Wrong mask, wrong rooftop." },
  { id: "v_night_raid", name: "Night Raid", type: "AMBUSH", cost: 2, push: 4, bigPush: 20, copies: 1, flavor: "While the task force sleeps." },
];

export const SIDES = {
  detective: {
    id: "detective",
    name: "Detective",
    direction: 1,
    portrait: "detective",
    goal: "CAPTURE",
    cards: detectiveCards,
  },
  vigilante: {
    id: "vigilante",
    name: "Vigilante",
    direction: -1,
    portrait: "killer",
    goal: "ESCAPE",
    cards: vigilanteCards,
  },
};

/** Expands `copies` into a flat list of card instances. */
export function buildDeck(sideId) {
  const deck = [];
  SIDES[sideId].cards.forEach((card) => {
    for (let i = 0; i < card.copies; i++) {
      deck.push({ ...card, uid: `${card.id}#${i}` });
    }
  });
  return deck;
}
