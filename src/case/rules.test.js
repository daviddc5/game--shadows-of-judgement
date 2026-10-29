import { describe, it, expect } from "vitest";
import { RULES, costFor, createMatch, mustPlay, resolveTurn, startTurn, pushFor } from "./rules.js";
import { chooseAiPlay } from "./ai.js";
import { SIDES } from "./cards.js";

function card(side, type) {
  const c = SIDES[side].cards.find((x) => x.type === type);
  return { ...c, uid: `${c.id}#test` };
}

// Builds a match where each side holds exactly the given card and plenty of energy.
function setup(detectiveType, vigilanteType, caseValue = RULES.caseStart) {
  const state = createMatch({ rng: () => 0.5 });
  state.caseValue = caseValue;
  state.sides.detective.hand = detectiveType ? [card("detective", detectiveType)] : [];
  state.sides.vigilante.hand = vigilanteType ? [card("vigilante", vigilanteType)] : [];
  state.sides.detective.energy = 10;
  state.sides.vigilante.energy = 10;
  return state;
}

const play = (d, v) => ({ detective: d ? 0 : null, vigilante: v ? 0 : null });

describe("Case meter rules", () => {
  it("starts in the middle with full hands and turn-one energy", () => {
    const state = createMatch();
    expect(state.caseValue).toBe(RULES.caseStart);
    expect(state.turn).toBe(1);
    expect(state.sides.detective.hand).toHaveLength(RULES.handSize);
    expect(state.sides.vigilante.energy).toBe(RULES.startEnergy + RULES.energyPerTurn);
  });

  it("detective pushes up and vigilante pushes down", () => {
    const state = setup("QUICK", null);
    const push = pushFor(state, state.sides.detective.hand[0]);
    resolveTurn(state, play(true, false));
    expect(state.caseValue).toBe(RULES.caseStart + push);

    const state2 = setup(null, "QUICK");
    resolveTurn(state2, play(false, true));
    expect(state2.caseValue).toBe(RULES.caseStart - push);
  });

  it("COUNTER cancels a POWER card and pushes for its owner", () => {
    const state = setup("COUNTER", "POWER");
    const counterPush = pushFor(state, state.sides.detective.hand[0]);
    const { events } = resolveTurn(state, play(true, true));
    expect(events.map((e) => e.type)).toEqual(["counter", "cancelled"]);
    expect(state.caseValue).toBe(RULES.caseStart + counterPush);
  });

  it("COUNTER fizzles against anything that is not POWER", () => {
    const state = setup("COUNTER", "NORMAL");
    const normalPush = pushFor(state, state.sides.vigilante.hand[0]);
    const { events } = resolveTurn(state, play(true, true));
    expect(events.map((e) => e.type)).toEqual(["fizzle", "push"]);
    expect(state.caseValue).toBe(RULES.caseStart - normalPush);
  });

  it("spends energy on a cancelled POWER card", () => {
    const state = setup("COUNTER", "POWER");
    const cost = state.sides.vigilante.hand[0].cost;
    resolveTurn(state, play(true, true));
    expect(state.sides.vigilante.energy).toBe(10 - cost);
  });

  it("BAIT pushes big when the opponent COUNTERs, and the COUNTER fizzles", () => {
    const state = setup("COUNTER", "BAIT");
    const bait = state.sides.vigilante.hand[0];
    const { events } = resolveTurn(state, play(true, true));
    expect(events.map((e) => e.type)).toEqual(["fizzle", "sprung"]);
    expect(state.caseValue).toBe(RULES.caseStart - pushFor(state, bait, bait.bigPush));
  });

  it("BAIT only pushes a little against anything else", () => {
    const state = setup("QUICK", "BAIT");
    const quick = state.sides.detective.hand[0];
    const bait = state.sides.vigilante.hand[0];
    resolveTurn(state, play(true, true));
    expect(state.caseValue).toBe(RULES.caseStart + pushFor(state, quick) - pushFor(state, bait));
  });

  it("AMBUSH pushes big when the opponent WAITs", () => {
    const state = setup("AMBUSH", "QUICK");
    const ambush = state.sides.detective.hand[0];
    const { events } = resolveTurn(state, play(true, false));
    expect(events.map((e) => e.type)).toEqual(["wait", "sprung"]);
    expect(state.caseValue).toBe(RULES.caseStart + pushFor(state, ambush, ambush.bigPush));
  });

  it("AMBUSH only pushes a little when the opponent plays a card", () => {
    const state = setup("AMBUSH", "QUICK");
    const ambush = state.sides.detective.hand[0];
    const quick = state.sides.vigilante.hand[0];
    resolveTurn(state, play(true, true));
    expect(state.caseValue).toBe(RULES.caseStart + pushFor(state, ambush) - pushFor(state, quick));
  });

  it("waiting banks bonus energy", () => {
    const state = setup("QUICK", "QUICK");
    state.sides.vigilante.energy = 3;
    resolveTurn(state, play(true, false));
    expect(state.sides.vigilante.energy).toBe(3 + RULES.waitBonus);
  });

  it("both cards land together and net out before the meter is clamped", () => {
    const state = setup("QUICK", "POWER", RULES.caseMax - 5);
    const net = pushFor(state, state.sides.detective.hand[0]) - pushFor(state, state.sides.vigilante.hand[0]);
    const { events } = resolveTurn(state, play(true, true));
    expect(events.filter((e) => e.type === "push")).toHaveLength(2);
    expect(state.winner).toBeNull();
    expect(state.caseValue).toBe(RULES.caseMax - 5 + net);
  });

  it("ends the case when the net push reaches an end", () => {
    const state = setup("POWER", "QUICK", RULES.caseMax - 10);
    resolveTurn(state, play(true, true));
    expect(state.winner).toBe("detective");
    expect(state.endReason).toBe("capture");
  });

  it("gives the verdict to whichever side the meter leans at the turn limit", () => {
    const state = setup(null, null, RULES.caseStart + 10);
    state.turn = RULES.maxTurns;
    resolveTurn(state, play(false, false));
    expect(state.winner).toBe("detective");
    expect(state.endReason).toBe("verdict");
  });

  it("Hunch makes Counters and Baits cost 1 less, and nothing else", () => {
    const state = createMatch({ passives: { detective: "hunch" } });
    const cost = (side, type) => costFor(state, side, card(side, type));
    expect(cost("detective", "COUNTER")).toBe(card("detective", "COUNTER").cost - 1);
    expect(cost("detective", "BAIT")).toBe(card("detective", "BAIT").cost - 1);
    expect(cost("detective", "POWER")).toBe(card("detective", "POWER").cost);
    expect(cost("vigilante", "COUNTER")).toBe(card("vigilante", "COUNTER").cost);
  });

  it("Patience saves +1 more energy on a Wait", () => {
    const state = createMatch({ passives: { vigilante: "patience" } });
    state.sides.detective.energy = 2;
    state.sides.vigilante.energy = 2;
    resolveTurn(state, play(false, false));
    expect(state.sides.detective.energy).toBe(2 + RULES.waitBonus);
    expect(state.sides.vigilante.energy).toBe(2 + RULES.waitBonus + 1);
  });

  it("rejects cards the player cannot afford", () => {
    const state = setup("POWER", null);
    state.sides.detective.energy = 0;
    expect(() => resolveTurn(state, play(true, false))).toThrow();
  });

  it("AI only ever picks affordable cards and every match ends", () => {
    for (let g = 0; g < 200; g++) {
      const state = createMatch();
      while (!state.winner) {
        const plays = {};
        for (const side of ["detective", "vigilante"]) {
          const i = chooseAiPlay(state, side);
          if (i != null) {
            expect(state.sides[side].hand[i].cost).toBeLessThanOrEqual(state.sides[side].energy);
          }
          plays[side] = i;
        }
        resolveTurn(state, plays);
        if (!state.winner) startTurn(state);
      }
      expect(state.turn).toBeLessThanOrEqual(RULES.maxTurns);
    }
  });
});

describe("status effects", () => {
  const withEffect = (side, effect) => {
    const c = SIDES[side].cards.find((x) => x.effect === effect);
    return { ...c, uid: `${c.id}#test` };
  };
  const turnWith = (state, detectiveCard, vigilanteCard) => {
    state.sides.detective.hand = detectiveCard ? [detectiveCard] : [];
    state.sides.vigilante.hand = vigilanteCard ? [vigilanteCard] : [];
    state.sides.detective.energy = 10;
    state.sides.vigilante.energy = 10;
    return resolveTurn(state, play(detectiveCard, vigilanteCard));
  };

  it("Shaken makes Power cost more on the next turn only", () => {
    const state = createMatch({ rng: () => 0.5 });
    const { events } = turnWith(state, withEffect("detective", "shaken"), null);
    expect(events.find((e) => e.type === "effect")).toMatchObject({ target: "vigilante", effect: "shaken" });
    const power = card("vigilante", "POWER");
    expect(costFor(state, "vigilante", power)).toBe(power.cost + RULES.shakenExtraCost);
    turnWith(state, null, card("vigilante", "QUICK"));
    expect(costFor(state, "vigilante", power)).toBe(power.cost);
  });

  it("Cornered stops a side from waiting while it can afford a card", () => {
    const state = createMatch({ rng: () => 0.5 });
    turnWith(state, withEffect("detective", "cornered"), null);
    state.sides.vigilante.hand = [card("vigilante", "QUICK")];
    state.sides.vigilante.energy = 10;
    expect(mustPlay(state, "vigilante")).toBe(true);
    expect(() => resolveTurn(state, play(false, false))).toThrow(/Cornered/);
    state.sides.vigilante.energy = 0;
    expect(mustPlay(state, "vigilante")).toBe(false);
  });

  it("Heat drifts the meter toward the side that applied it for two turns", () => {
    const state = createMatch({ rng: () => 0.5 });
    turnWith(state, null, withEffect("vigilante", "heat"));
    for (let i = 0; i < 3; i++) {
      const before = state.caseValue;
      const { events } = turnWith(state, null, null);
      const drift = events.find((e) => e.type === "heat");
      if (i < 2) {
        expect(drift).toMatchObject({ side: "detective" });
        expect(state.caseValue).toBe(before - RULES.heatDrift);
      } else {
        expect(drift).toBeUndefined();
      }
    }
  });
});
