// The campaign: a run of cases played against the AI, one after another.
// Each case is data; the Campaign screen lists them and the battle reads
// `tips` (one coaching line per turn, shown in the hint area). See
// docs/CAMPAIGN.md for the plan.
export const CASES = [
  {
    id: "tutorial",
    label: "Training",
    title: "The Tutorial",
    blurb: "Your first case. Learn to read the meter, your energy and your opponent.",
    side: "detective",
    unlocked: true,
    lessons: [
      "Pick a card and play it: both players choose at the same time.",
      "Push the needle to your end of the Case meter to win.",
      "Spend energy on cards, or Wait to save up for something big.",
      "Every special card beats one thing: read what they'll do.",
    ],
    // One line per turn, in the hint area above your hand.
    tips: [
      "Tap a card to raise it, then press Play card.\nYour opponent is choosing at the same time.",
      "You're the Detective: push the needle up to 200.\nYour push number is on each card.",
      "Low on energy? Wait saves it (+1 extra)\nfor a big Power card later.",
      "Power cards push hard, but a Counter cancels them.\nHave they been saving energy?",
      "Bait beats a Counter. Ambush beats a Wait.\nGuess what they'll do next.",
    ],
  },
  { id: "harbour", label: "Case I", title: "The Harbour Fire", blurb: "Coming soon.", unlocked: false },
  { id: "ledger", label: "Case II", title: "The Missing Ledger", blurb: "Coming soon.", unlocked: false },
  { id: "gala", label: "Case III", title: "The Masked Gala", blurb: "Coming soon.", unlocked: false },
];

export const getCase = (id) => CASES.find((c) => c.id === id) ?? null;
