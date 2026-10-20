import { describe, it, expect } from "vitest";
import { RULES, createMatch, resolveTurn, startTurn, pushFor } from "./rules.js";
import { chooseAiPlay } from "./ai.js";
import { SIDES } from "./cards.js";

function card(side, type) {
  const c = SIDES[side].cards.find((x) => x.type === type);
  return { ...c, uid: `${c.id}#test` };
}

// Builds a match where each side holds exactly the given card and plenty of energy.
function setup(detectiveType, vigilanteType, caseValue = 50) {
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
    expect(state.caseValue).toBe(50 + push);

    const state2 = setup(null, "QUICK");
    resolveTurn(state2, play(false, true));
    expect(state2.caseValue).toBe(50 - push);
  });

  it("COUNTER cancels a POWER card and pushes for its owner", () => {
    const state = setup("COUNTER", "POWER");
    const counterPush = pushFor(state, state.sides.detective.hand[0]);
    const { events } = resolveTurn(state, play(true, true));
    expect(events.map((e) => e.type)).toEqual(["counter", "cancelled"]);
    expect(state.caseValue).toBe(50 + counterPush);
  });

  it("COUNTER fizzles against anything that is not POWER", () => {
    const state = setup("COUNTER", "NORMAL");
    const normalPush = pushFor(state, state.sides.vigilante.hand[0]);
    const { events } = resolveTurn(state, play(true, true));
    expect(events.map((e) => e.type)).toEqual(["fizzle", "push"]);
    expect(state.caseValue).toBe(50 - normalPush);
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
    expect(state.caseValue).toBe(50 - pushFor(state, bait, bait.bigPush));
  });

  it("BAIT only pushes a little against anything else", () => {
    const state = setup("QUICK", "BAIT");
    const quick = state.sides.detective.hand[0];
    const bait = state.sides.vigilante.hand[0];
    resolveTurn(state, play(true, true));
    expect(state.caseValue).toBe(50 + pushFor(state, quick) - pushFor(state, bait));
  });

  it("AMBUSH pushes big when the opponent WAITs", () => {
    const state = setup("AMBUSH", "QUICK");
    const ambush = state.sides.detective.hand[0];
    const { events } = resolveTurn(state, play(true, false));
    expect(events.map((e) => e.type)).toEqual(["wait", "sprung"]);
    expect(state.caseValue).toBe(50 + pushFor(state, ambush, ambush.bigPush));
  });

  it("AMBUSH only pushes a little when the opponent plays a card", () => {
    const state = setup("AMBUSH", "QUICK");
    const ambush = state.sides.detective.hand[0];
    const quick = state.sides.vigilante.hand[0];
    resolveTurn(state, play(true, true));
    expect(state.caseValue).toBe(50 + pushFor(state, ambush) - pushFor(state, quick));
  });

  it("waiting banks bonus energy", () => {
    const state = setup("QUICK", "QUICK");
    state.sides.vigilante.energy = 3;
    resolveTurn(state, play(true, false));
    expect(state.sides.vigilante.energy).toBe(3 + RULES.waitBonus);
  });

  it("both cards land together and net out before the meter is clamped", () => {
    const state = setup("QUICK", "POWER", 95);
    const net = pushFor(state, state.sides.detective.hand[0]) - pushFor(state, state.sides.vigilante.hand[0]);
    const { events } = resolveTurn(state, play(true, true));
    expect(events.filter((e) => e.type === "push")).toHaveLength(2);
    expect(state.winner).toBeNull();
    expect(state.caseValue).toBe(95 + net);
  });

  it("ends the case when the net push reaches an end", () => {
    const state = setup("POWER", "QUICK", 90);
    resolveTurn(state, play(true, true));
    expect(state.winner).toBe("detective");
    expect(state.endReason).toBe("capture");
  });

  it("gives the verdict to whichever side the meter leans at the turn limit", () => {
    const state = setup(null, null, 60);
    state.turn = RULES.maxTurns;
    resolveTurn(state, play(false, false));
    expect(state.winner).toBe("detective");
    expect(state.endReason).toBe("verdict");
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
