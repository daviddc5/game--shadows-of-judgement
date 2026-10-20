import { SIDES } from "./cards.js";
import { otherSide, publicView, pushFor } from "./rules.js";

const POWER_THREAT_ENERGY = 6; // cheapest POWER card cost

/**
 * Picks a hand index (or null to WAIT) using only information a human
 * would also have: own hand/energy, opponent energy and play history.
 */
export function chooseAiPlay(state, side, { rng = Math.random, skill = 1 } = {}) {
  const me = state.sides[side];
  const foe = publicView(state, otherSide(side));
  const direction = SIDES[side].direction;
  const affordable = me.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.cost <= me.energy);

  if (affordable.length === 0) return null;

  // Finish the case if any card gets there (prefer the fastest one).
  const distance =
    direction > 0
      ? state.rules.caseMax - state.caseValue
      : state.caseValue - state.rules.caseMin;
  const finishers = affordable.filter(
    ({ card }) => card.type !== "COUNTER" && pushFor(state, card) >= distance,
  );
  if (finishers.length > 0 && rng() < 0.6 + 0.4 * skill) {
    finishers.sort((a, b) => b.card.push - a.card.push);
    const nonPower = finishers.find(({ card }) => card.type !== "POWER");
    return (nonPower ?? finishers[0]).index;
  }

  // Read the opponent: banked energy means a POWER card may be coming.
  const counter = affordable.find(({ card }) => card.type === "COUNTER");
  if (counter && foe.energy >= POWER_THREAT_ENERGY) {
    const powersSeen = foe.history.filter((t) => t === "POWER").length;
    let chance = foe.energy >= 8 ? 0.45 : 0.3;
    chance += Math.min(0.15, powersSeen * 0.05);
    if (rng() < chance * skill) return counter.index;
  }

  const powers = affordable.filter(({ card }) => card.type === "POWER");
  if (powers.length > 0) {
    // Opponent holding counter energy makes POWER riskier.
    const counterRisk = foe.energy >= 2 ? 0.25 : 0;
    if (rng() > counterRisk) {
      powers.sort((a, b) => b.card.push - a.card.push);
      return powers[0].index;
    }
  }

  // Save up when a POWER card in hand is almost affordable.
  const savingFor = me.hand.find(
    (card) =>
      card.type === "POWER" &&
      card.cost > me.energy &&
      card.cost <= me.energy + state.rules.energyPerTurn + state.rules.waitBonus,
  );
  if (savingFor && rng() < 0.4) return null;

  const pushers = affordable.filter(({ card }) => card.type !== "COUNTER");
  if (pushers.length === 0) return rng() < 0.5 ? counter.index : null;

  // Mostly the best push per turn, sometimes a cheaper card to keep energy.
  pushers.sort((a, b) => b.card.push - a.card.push);
  if (pushers.length > 1 && rng() < 0.25) return pushers[1].index;
  return pushers[0].index;
}
