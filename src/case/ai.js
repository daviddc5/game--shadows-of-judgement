import { SIDES } from "./cards.js";
import { otherSide, publicView, pushFor } from "./rules.js";

const POWER_THREAT_ENERGY = 6; // cheapest POWER card cost
const TYPICAL_POWER = 60; // average push of a POWER card
const TYPICAL_COUNTER = 20;
const TYPICAL_TRAP_BONUS = 28; // bigPush - push for BAIT/AMBUSH

/**
 * Guesses what the opponent will do this turn from public information only:
 * their energy, our energy, and what each side played recently.
 */
export function predictOpponent(state, side) {
  const foe = publicView(state, otherSide(side));
  const me = publicView(state, side);
  const lastMine = me.history[me.history.length - 1];

  const p = { POWER: 0, COUNTER: 0, BAIT: 0, AMBUSH: 0, WAIT: 0.1 };
  if (foe.energy >= POWER_THREAT_ENERGY) p.POWER = foe.energy >= 8 ? 0.4 : 0.3;
  if (foe.energy >= 2) {
    // They counter when we look ready to POWER.
    p.COUNTER = me.energy >= POWER_THREAT_ENERGY ? 0.3 : 0.08;
    // They ambush when we have been waiting.
    p.AMBUSH = lastMine === null ? 0.25 : 0.07;
  }
  // They bait when they look threatening and we can afford a COUNTER.
  if (foe.energy >= 3 && me.energy >= 2) p.BAIT = foe.energy >= 5 ? 0.12 : 0.06;
  // Saving up for a POWER card, or too poor to do much.
  if (foe.energy === 4 || foe.energy === 5) p.WAIT += 0.15;
  if (foe.energy < 2) p.WAIT += 0.3;

  const total = Object.values(p).reduce((a, b) => a + b, 0);
  const scale = total > 0.85 ? 0.85 / total : 1; // keep room for ordinary cards
  Object.keys(p).forEach((k) => (p[k] *= scale));
  p.OTHER = 1 - Object.values(p).reduce((a, b) => a + b, 0);
  return p;
}

/** Expected meter gain of one option against a predicted opponent mix. */
function expectedGain(state, me, card, p) {
  const unit = (amount) => pushFor(state, card, amount);
  const theirs = (amount) => pushFor(state, null, amount);
  const energyValue = 0.15 * theirs(4); // what one spare energy is roughly worth

  if (!card) {
    // WAIT: nothing pushes and risks an AMBUSH. It is worth it mainly when
    // the bonus energy makes a POWER card in hand playable next turn.
    const { energyPerTurn, waitBonus } = state.rules;
    const unlocks = me.hand.find(
      (c) =>
        c.type === "POWER" &&
        c.cost > me.energy + energyPerTurn &&
        c.cost <= me.energy + energyPerTurn + waitBonus,
    );
    const saving = unlocks ? 0.4 * pushFor(state, unlocks) : 0;
    return saving + waitBonus * energyValue - p.AMBUSH * theirs(TYPICAL_TRAP_BONUS);
  }

  let gain = 0;
  switch (card.type) {
    case "POWER":
      gain = (1 - p.COUNTER) * unit(card.push) - p.COUNTER * theirs(TYPICAL_COUNTER);
      break;
    case "COUNTER":
      gain = p.POWER * (unit(card.push) + theirs(TYPICAL_POWER)) - p.BAIT * theirs(TYPICAL_TRAP_BONUS);
      break;
    case "BAIT":
      gain = p.COUNTER * unit(card.bigPush) + (1 - p.COUNTER) * unit(card.push);
      break;
    case "AMBUSH":
      gain = p.WAIT * unit(card.bigPush) + (1 - p.WAIT) * unit(card.push);
      break;
    default:
      gain = unit(card.push);
  }
  return gain - card.cost * energyValue;
}

/**
 * Picks a hand index (or null to WAIT) using only information a human
 * would also have. `skill` 0..1: lower plays more randomly.
 */
export function chooseAiPlay(state, side, { rng = Math.random, skill = 1 } = {}) {
  const me = state.sides[side];
  const direction = SIDES[side].direction;
  const affordable = me.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.cost <= me.energy);

  if (affordable.length === 0) return null;

  // Go for the finish when a reliable card can end the case outright.
  const distance =
    direction > 0
      ? state.rules.caseMax - state.caseValue
      : state.caseValue - state.rules.caseMin;
  const finishers = affordable.filter(
    ({ card }) =>
      ["QUICK", "NORMAL"].includes(card.type) &&
      pushFor(state, card) >= distance + pushFor(state, null, 9),
  );
  if (finishers.length > 0 && rng() < 0.6 + 0.4 * skill) {
    return finishers[0].index;
  }

  const p = predictOpponent(state, side);
  const options = [{ index: null, card: null }, ...affordable].map((o) => ({
    ...o,
    value: expectedGain(state, me, o.card, p),
  }));

  // Softmax over expected gain keeps the AI hard to read.
  const temperature = 4 + (1 - skill) * 20;
  const best = Math.max(...options.map((o) => o.value));
  const weights = options.map((o) => Math.exp((o.value - best) / temperature));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return options[i].index;
  }
  return options[0].index;
}
