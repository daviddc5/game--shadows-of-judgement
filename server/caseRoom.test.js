import { describe, it, expect } from "vitest";
import { createRoom, pickPair, playerView, resolveRoom, submitPlay } from "./caseRoom.js";
import { chooseAiPlay } from "../src/case/ai.js";

const player = (socketId, side) => ({ socketId, username: socketId, side });

function newRoom() {
  return createRoom("room1", {
    detective: player("a", "detective"),
    vigilante: player("b", "vigilante"),
  });
}

describe("pickPair", () => {
  it("waits for a second player", () => {
    expect(pickPair([player("a", "detective")])).toBeNull();
  });

  it("prefers a Detective + Vigilante pair over queue order", () => {
    const queue = [player("a", "detective"), player("b", "detective"), player("c", "vigilante")];
    const pair = pickPair(queue);
    expect(pair.detective.socketId).toBe("a");
    expect(pair.vigilante.socketId).toBe("c");
    expect(queue.map((p) => p.socketId)).toEqual(["b"]);
  });

  it("gives the later player the other side when both picked the same", () => {
    const pair = pickPair([player("a", "vigilante"), player("b", "vigilante")]);
    expect(pair.vigilante.socketId).toBe("a");
    expect(pair.detective.socketId).toBe("b");
  });
});

describe("playerView", () => {
  it("shows your hand but only the size of the opponent's", () => {
    const view = playerView(newRoom(), "detective");
    expect(view.you.hand.length).toBeGreaterThan(0);
    expect(view.opponent.hand).toBeUndefined();
    expect(view.opponent.handCount).toBe(view.you.hand.length);
  });
});

describe("submitPlay", () => {
  it("rejects cards that are not in hand or not affordable", () => {
    const room = newRoom();
    expect(submitPlay(room, "detective", 99).ok).toBe(false);
    room.state.sides.detective.energy = 0;
    const costly = room.state.sides.detective.hand.findIndex((c) => c.cost > 0);
    expect(submitPlay(room, "detective", costly).ok).toBe(false);
  });

  it("only allows one choice per turn and reports when both are in", () => {
    const room = newRoom();
    expect(submitPlay(room, "detective", null)).toEqual({ ok: true, bothReady: false });
    expect(submitPlay(room, "detective", null).ok).toBe(false);
    expect(submitPlay(room, "vigilante", null)).toEqual({ ok: true, bothReady: true });
  });

  it("won't let a Cornered player wait while they can afford a card", () => {
    const room = newRoom();
    room.state.sides.vigilante.status.cornered = 1;
    room.state.sides.vigilante.energy = 10;
    expect(submitPlay(room, "vigilante", null).ok).toBe(false);
    expect(playerView(room, "detective").opponent.status.cornered).toBe(1);
  });
});

describe("resolveRoom", () => {
  it("resolves the turn and starts the next one", () => {
    const room = newRoom();
    submitPlay(room, "detective", null);
    submitPlay(room, "vigilante", null);
    const { events, views, nextViews } = resolveRoom(room);
    expect(events.map((e) => e.type)).toEqual(["wait", "wait"]);
    expect(views.detective.turn).toBe(1);
    expect(nextViews.detective.turn).toBe(2);
    expect(room.choices).toEqual({});
  });

  it("plays full matches to a finish", () => {
    for (let g = 0; g < 50; g++) {
      const room = newRoom();
      let result;
      do {
        for (const side of ["detective", "vigilante"]) {
          expect(submitPlay(room, side, chooseAiPlay(room.state, side)).ok).toBe(true);
        }
        result = resolveRoom(room);
      } while (result.nextViews);
      expect(result.views.detective.winner).toBeTruthy();
      expect(submitPlay(room, "detective", null).ok).toBe(false);
    }
  });
});
