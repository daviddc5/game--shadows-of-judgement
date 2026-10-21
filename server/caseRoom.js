// Multiplayer rooms for the Case meter rules. Pure logic with no socket.io,
// so it can be unit-tested; socketHandlers.js does the networking.
import {
  canAfford,
  createMatch,
  mustPlay,
  otherSide,
  resolveTurn,
  startTurn,
} from "../src/case/rules.js";

export const SIDE_BY_CHARACTER = {
  "Independent Detective": "detective",
  Vigilante: "vigilante",
};

/**
 * Takes two players off the queue, preferring a Detective + Vigilante pair.
 * If everyone waiting picked the same side, the later player gets the other
 * side (the client is told which side it plays). Returns {detective, vigilante}.
 */
export function pickPair(queue) {
  if (queue.length < 2) return null;
  const first = queue[0];
  const oppositeIndex = queue.findIndex((p, i) => i > 0 && p.side !== first.side);
  const secondIndex = oppositeIndex === -1 ? 1 : oppositeIndex;
  const second = queue[secondIndex];
  queue.splice(secondIndex, 1);
  queue.splice(0, 1);
  return { [first.side]: first, [otherSide(first.side)]: second };
}

export function createRoom(roomId, players, { rng = Math.random } = {}) {
  return {
    roomId,
    players, // { detective: {socketId, username}, vigilante: {...} }
    state: createMatch({ rng }),
    choices: {}, // side -> hand index or null (WAIT) for the current turn
    createdAt: Date.now(),
  };
}

export function sideOf(room, socketId) {
  if (room.players.detective.socketId === socketId) return "detective";
  if (room.players.vigilante.socketId === socketId) return "vigilante";
  return null;
}

/** What one player is allowed to see: their own hand, never the opponent's. */
export function playerView(room, side) {
  const { state } = room;
  const me = state.sides[side];
  const foe = state.sides[otherSide(side)];
  return {
    side,
    turn: state.turn,
    caseValue: state.caseValue,
    rules: state.rules,
    winner: state.winner,
    endReason: state.endReason,
    you: { energy: me.energy, hand: me.hand, history: me.history, status: me.status },
    opponent: { energy: foe.energy, handCount: foe.hand.length, history: foe.history, status: foe.status },
  };
}

/** Records a player's choice for this turn. handIndex null means WAIT. */
export function submitPlay(room, side, handIndex) {
  const { state } = room;
  if (state.winner) return { ok: false, error: "The case is closed" };
  if (side in room.choices) return { ok: false, error: "Already locked in this turn" };
  if (handIndex != null) {
    const card = Number.isInteger(handIndex) ? state.sides[side].hand[handIndex] : null;
    if (!card) return { ok: false, error: "Card not in your hand" };
    if (!canAfford(state, side, card)) return { ok: false, error: "Not enough energy" };
  } else if (mustPlay(state, side)) {
    return { ok: false, error: "You're Cornered: you have to play a card" };
  }
  room.choices[side] = handIndex ?? null;
  return { ok: true, bothReady: "detective" in room.choices && "vigilante" in room.choices };
}

/**
 * Resolves the turn once both players locked in.
 * `views` show the board right after the cards land; `nextViews` show the
 * start of the next turn (null when the case is over).
 */
export function resolveRoom(room) {
  const { events, played } = resolveTurn(room.state, room.choices);
  room.choices = {};
  const views = {
    detective: playerView(room, "detective"),
    vigilante: playerView(room, "vigilante"),
  };
  let nextViews = null;
  if (!room.state.winner) {
    startTurn(room.state);
    nextViews = {
      detective: playerView(room, "detective"),
      vigilante: playerView(room, "vigilante"),
    };
  }
  return { events, played, views, nextViews };
}
