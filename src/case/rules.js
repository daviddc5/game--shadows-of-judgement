import { SIDES, buildDeck } from "./cards.js";

// Tunable rules for the Case meter prototype.
export const RULES = {
  caseStart: 100,
  caseMin: 0, // Vigilante escapes
  caseMax: 200, // Detective captures
  startEnergy: 1,
  energyPerTurn: 2,
  waitBonus: 1, // extra energy for skipping a turn
  maxEnergy: 10,
  handSize: 4,
  maxTurns: 20, // after this the verdict goes to whichever side the meter leans
  pushScale: 1, // multiplies every card's push (cards hold their real numbers, so 1)
  escalation: 0, // extra push per turn: push * (1 + escalation * (turn - 1))
  escalationFlat: 5, // flat push added per turn: push + escalationFlat * (turn - 1)
  shakenExtraCost: 2, // a Shaken side's Power cards cost this much more
  heatDrift: 10, // how far Heat moves the meter at the start of each turn
};

// Status effects some cards put on the opponent (card.effect). Each lasts
// `turns` turns starting with the opponent's next one, and both players can
// see it.
export const EFFECTS = {
  shaken: { name: "Shaken", turns: 1, text: "their Power cards cost +2 next turn" },
  cornered: { name: "Cornered", turns: 1, text: "they can't Wait next turn" },
  heat: { name: "Heat", turns: 2, text: "the meter drifts your way for 2 turns" },
};

const noStatus = () => ({ shaken: 0, cornered: 0, heat: 0 });

/** How far a card moves the meter this turn (`amount` defaults to its normal push). */
export function pushFor(state, card, amount = card.push) {
  const { pushScale, escalation, escalationFlat } = state.rules;
  const turns = state.turn - 1;
  return Math.round(amount * pushScale * (1 + escalation * turns) + escalationFlat * turns);
}

/** True when a BAIT or AMBUSH card's condition is met by the opponent's play. */
export function trapSprung(card, opponentCard) {
  if (card?.type === "BAIT") return opponentCard?.type === "COUNTER";
  if (card?.type === "AMBUSH") return opponentCard == null;
  return false;
}

export const SIDE_IDS = ["detective", "vigilante"];

export function otherSide(side) {
  return side === "detective" ? "vigilante" : "detective";
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function draw(player, count, rng) {
  for (let i = 0; i < count; i++) {
    if (player.deck.length === 0) {
      if (player.discard.length === 0) return;
      player.deck = shuffle(player.discard, rng);
      player.discard = [];
    }
    player.hand.push(player.deck.pop());
  }
}

export function createMatch({ rng = Math.random, rules = RULES } = {}) {
  const sides = {};
  SIDE_IDS.forEach((id) => {
    sides[id] = {
      energy: rules.startEnergy,
      deck: shuffle(buildDeck(id), rng),
      hand: [],
      discard: [],
      history: [], // what this side played each turn (null = waited)
      status: noStatus(), // turns left of each effect on this side
    };
  });
  const state = {
    rules,
    turn: 0,
    caseValue: rules.caseStart,
    sides,
    winner: null,
    endReason: null,
  };
  startTurn(state, rng);
  return state;
}

/** Advances to the next turn: gain energy, refill hands. Mutates state. */
export function startTurn(state, rng = Math.random) {
  const { rules } = state;
  state.turn += 1;
  SIDE_IDS.forEach((id) => {
    const p = state.sides[id];
    p.energy = Math.min(rules.maxEnergy, p.energy + rules.energyPerTurn);
    draw(p, rules.handSize - p.hand.length, rng);
  });
  return state;
}

/** What a card costs this side right now (Shaken makes Power cost more). */
export function costFor(state, side, card) {
  const shaken = state.sides[side].status?.shaken > 0 && card.type === "POWER";
  return card.cost + (shaken ? state.rules.shakenExtraCost : 0);
}

export function canAfford(state, side, card) {
  return !!card && costFor(state, side, card) <= state.sides[side].energy;
}

/** A Cornered side can't Wait while it can afford any card in hand. */
export function mustPlay(state, side) {
  const p = state.sides[side];
  return p.status?.cornered > 0 && p.hand.some((card) => canAfford(state, side, card));
}

function clampCase(state, value) {
  return Math.max(state.rules.caseMin, Math.min(state.rules.caseMax, value));
}

function checkEnd(state) {
  if (state.caseValue >= state.rules.caseMax) {
    state.winner = "detective";
    state.endReason = "capture";
  } else if (state.caseValue <= state.rules.caseMin) {
    state.winner = "vigilante";
    state.endReason = "escape";
  }
  return !!state.winner;
}

/**
 * Resolves one simultaneous turn.
 * @param plays {detective: handIndex|null, vigilante: handIndex|null} — null means WAIT.
 * @returns {state, events} where events describe what happened, in order, for the UI.
 * Mutates and returns the same state object.
 */
export function resolveTurn(state, plays) {
  const { rules } = state;
  const events = [];
  const played = {};

  // Pay costs and move cards out of hands.
  SIDE_IDS.forEach((side) => {
    const p = state.sides[side];
    const index = plays[side];
    const card = index == null ? null : p.hand[index];
    if (card && !canAfford(state, side, card)) {
      throw new Error(`${side} cannot afford ${card.name}`);
    }
    if (!card && mustPlay(state, side)) {
      throw new Error(`${side} is Cornered and can't wait`);
    }
    if (card) {
      p.hand.splice(index, 1);
      p.energy -= costFor(state, side, card);
      p.discard.push(card);
      played[side] = card;
    } else {
      p.energy = Math.min(rules.maxEnergy, p.energy + rules.waitBonus);
      played[side] = null;
      events.push({ type: "wait", side, energy: p.energy });
    }
    p.history.push(card ? card.type : null);
  });

  // Counters cancel POWER cards and punish them; otherwise they fizzle.
  const cancelled = {};
  SIDE_IDS.forEach((side) => {
    const card = played[side];
    const target = played[otherSide(side)];
    if (card?.type !== "COUNTER") return;
    if (target?.type === "POWER") {
      cancelled[otherSide(side)] = true;
    }
  });

  // Both cards land together: counters show first, then the pushes net out
  // and the meter is only clamped once at the end.
  const order = SIDE_IDS.filter((side) => played[side]).sort(
    (a, b) => (played[b].type === "COUNTER") - (played[a].type === "COUNTER"),
  );

  let running = state.caseValue;
  // Heat on a side drags the meter toward the other side's goal first.
  SIDE_IDS.forEach((side) => {
    if (!(state.sides[side].status?.heat > 0)) return;
    const from = clampCase(state, running);
    running -= SIDES[side].direction * rules.heatDrift;
    events.push({ type: "heat", side, from, to: clampCase(state, running) });
  });
  for (const side of order) {
    const card = played[side];
    const direction = SIDES[side].direction;
    if (cancelled[side]) {
      events.push({ type: "cancelled", side, card });
      continue;
    }
    if (card.type === "COUNTER" && played[otherSide(side)]?.type !== "POWER") {
      events.push({ type: "fizzle", side, card });
      continue;
    }
    const sprung = trapSprung(card, played[otherSide(side)]);
    const from = clampCase(state, running);
    running += direction * pushFor(state, card, sprung ? card.bigPush : card.push);
    events.push({
      type: card.type === "COUNTER" ? "counter" : sprung ? "sprung" : "push",
      side,
      card,
      from,
      to: clampCase(state, running),
    });
  }
  state.caseValue = clampCase(state, running);
  checkEnd(state);

  // This turn's effects wear off, then new ones land on the opponent.
  SIDE_IDS.forEach((side) => {
    const status = state.sides[side].status;
    if (!status) return;
    Object.keys(status).forEach((k) => (status[k] = Math.max(0, status[k] - 1)));
  });
  for (const side of order) {
    const effect = played[side].effect;
    if (!effect || cancelled[side] || state.winner) continue;
    const target = otherSide(side);
    state.sides[target].status[effect] = EFFECTS[effect].turns;
    events.push({ type: "effect", side, target, effect, card: played[side] });
  }

  if (!state.winner && state.turn >= rules.maxTurns) {
    if (state.caseValue > rules.caseStart) state.winner = "detective";
    else if (state.caseValue < rules.caseStart) state.winner = "vigilante";
    else state.winner = "draw";
    state.endReason = "verdict";
  }

  if (state.winner) {
    events.push({ type: "end", winner: state.winner, reason: state.endReason });
  }

  return { state, events, played, cancelled };
}

/** Hidden-information view an opponent is allowed to see. */
export function publicView(state, side) {
  const p = state.sides[side];
  return {
    energy: p.energy,
    handCount: p.hand.length,
    history: [...p.history],
    status: { ...p.status },
  };
}
